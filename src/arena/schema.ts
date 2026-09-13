import {FEATURES, type ActionPatch, type Condition, type Design, type Feature, clone, deepFreeze} from './types';
export const MAX_DESIGN_BYTES = 65536;
export class DesignError extends Error { override name = 'DesignError'; }
const fail = (path: string, message: string): never => {throw new DesignError(`${path}: ${message}`);};
function object(v: unknown, allowed: string[], required: string[], p: string): Record<string, any> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(p, '必须是对象');
  const obj = v as Record<string, unknown>;
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) fail(p, `不支持字段 ${k}`);
  for (const k of required) if (!Object.hasOwn(obj,k)) fail(p, `缺少 ${k}`);
  return obj;
}
function num(v: unknown, a: number, b: number, p: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < a || v > b) fail(p, `要求 [${a}, ${b}] 内有限数`);
  return v as number;
}
function text(v: unknown, p: string, limit=80) {
  if (typeof v !== 'string' || !v.trim() || v.length > limit || /[\u0000-\u001f]/.test(v)) fail(p, '文本为空、过长或含控制字符');
  if (['__proto__','constructor','prototype'].includes(v as string)) fail(p,'保留标识');
}
export function validateAction(v: unknown, p='action'): asserts v is ActionPatch {
  const a = object(v,['move','aim','attack','guard','interact','command'],[],p);
  for (const k of ['move','aim']) if (k in a) {
    if (!Array.isArray(a[k]) || a[k].length !== 2) fail(`${p}.${k}`,'要求两个数');
    a[k].forEach((x: unknown,i: number) => num(x,-1,1,`${p}.${k}[${i}]`));
  }
  for (const k of ['attack','guard','interact']) if (k in a && typeof a[k] !== 'boolean') fail(`${p}.${k}`,'要求布尔值');
  if (a.attack && a.guard) fail(p,'不能同时请求持续攻击和格挡');
  if (a.command !== undefined && !['none','slash','chop','lunge','shove','pickup','drop'].includes(a.command)) fail(`${p}.command`,'未知动作命令');
  if (a.guard && ['slash','chop'].includes(a.command)) fail(p,'挥斩与格挡互斥');
}
export function validateCondition(v: unknown, p='condition', depth=0): asserts v is Condition {
  if (depth>6) fail(p,'条件嵌套超过六层');
  if (typeof v === 'boolean') return;
  const c = object(v,['all','any','not','feature','op','value'],[],p);
  if (Object.keys(c).length===1) {
    if ('not' in c) return validateCondition(c.not,p+'.not',depth+1);
    const key = 'all' in c ? 'all' : 'any' in c ? 'any' : '';
    if (key) {
      if (!Array.isArray(c[key]) || c[key].length<1 || c[key].length>12) fail(p,'条件组必须有1到12项');
      c[key].forEach((x:unknown,i:number)=>validateCondition(x,`${p}.${key}[${i}]`,depth+1)); return;
    }
  }
  if (Object.keys(c).length!==3 || !('feature' in c && 'op' in c && 'value' in c)) fail(p,'要求条件组或 feature/op/value');
  if (!Object.hasOwn(FEATURES,c.feature)) fail(p,'未知或私有观察特征');
  const kind = FEATURES[c.feature as Feature];
  if (!['lt','le','gt','ge','eq','ne'].includes(c.op)) fail(p,'未知比较操作');
  if (kind !== 'number' && !['eq','ne'].includes(c.op)) fail(p,'布尔/状态只支持 eq/ne');
  if (kind === 'number') num(c.value,-1e6,1e6,p+'.value');
  if (kind === 'boolean' && typeof c.value !== 'boolean') fail(p,'要求布尔值');
  if (kind === 'mode' && !['upright','fallen','rising','falling','hanging'].includes(c.value)) fail(p,'未知姿态');
}
export function validateDesign(v: unknown): Readonly<Design> {
  let raw: string;
  try {raw=JSON.stringify(v);} catch {return fail('design','无法序列化');}
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length>MAX_DESIGN_BYTES) fail('design','文件超过64 KiB');
  const d = object(v,['version','name','description','stance','moves','rules'],['version','name','stance','moves','rules'],'design');
  if (d.version !== 'steel-design-1') fail('version','要求 steel-design-1');
  text(d.name,'name');
  if ('description' in d && (typeof d.description !== 'string' || d.description.length>2000)) fail('description','要求2000字符以内文本');
  validateAction(d.stance,'stance');
  if (d.stance.command && d.stance.command!=='none') fail('stance.command','一次性命令只能放在招式步骤');
  const moves=object(d.moves,Object.keys(d.moves ?? {}),[],'moves');
  if (Object.keys(moves).length<1 || Object.keys(moves).length>24) fail('moves','要求1到24招');
  for (const [name,value] of Object.entries(moves)) {
    text(name,'move.name'); const m=object(value,['steps','abort_when'],['steps'],`moves.${name}`);
    if ('abort_when' in m) validateCondition(m.abort_when);
    if (!Array.isArray(m.steps) || !m.steps.length || m.steps.length>16) fail(name,'要求1到16步骤');
    m.steps.forEach((sv:unknown,i:number)=>{
      const p=`moves.${name}.steps[${i}]`,s=object(sv,['duration','action','aim_to','wait_for_idle','timeout'],['duration'],p);
      num(s.duration,1/120,5,p+'.duration');
      if ('timeout' in s) num(s.timeout,s.duration,10,p+'.timeout');
      if ('wait_for_idle' in s && typeof s.wait_for_idle!=='boolean') fail(p,'wait_for_idle 要求布尔值');
      validateAction(s.action ?? {},p+'.action');
      // Validate the effective action, not just the patch.
      validateAction({...d.stance,...s.action},p+'.merged_action');
      if (s.aim_to!==undefined) validateAction({aim:s.aim_to},p+'.aim_to');
    });
  }
  if (!Array.isArray(d.rules) || !d.rules.length || d.rules.length>48) fail('rules','要求1到48条规则');
  const ids=new Set<string>();
  d.rules.forEach((rv:unknown,i:number)=>{
    const p=`rules[${i}]`,r=object(rv,['id','when','move','cooldown','interrupt'],['id','when','move'],p);
    text(r.id,p+'.id'); if(ids.has(r.id)) fail(p,'重复规则id'); ids.add(r.id);
    if(typeof r.move!=='string' || !Object.hasOwn(moves,r.move)) fail(p,'引用未知招式');
    validateCondition(r.when,p+'.when');
    if ('cooldown' in r) num(r.cooldown,0,60,p+'.cooldown');
    if ('interrupt' in r && typeof r.interrupt!=='boolean') fail(p,'interrupt 要求布尔值');
  });
  return deepFreeze(clone(v as Design));
}
// Scan object keys before JSON.parse so duplicate keys cannot have ambiguous meaning.
export function parseDesign(source: string): Readonly<Design> {
  if (new TextEncoder().encode(source).length>MAX_DESIGN_BYTES) fail('design','文件超过64 KiB');
  let i=0;
  const white=()=>{while(/\s/.test(source[i] ?? '') && i<source.length)i++;};
  const str=():string=>{
    white();const start=i;if(source[i++]!=='"')return fail('JSON','要求字符串');
    while(i<source.length){const c=source[i++];if(c==='\\'){i++;continue;}if(c==='"'){
      try{return JSON.parse(source.slice(start,i));}catch{return fail('JSON','字符串无效');}
    }}return fail('JSON','字符串未结束');
  };
  const value=(depth=0):void=>{
    if(depth>32)fail('JSON','嵌套过深');white();const c=source[i];
    if(c==='{'){
      i++;white();const keys=new Set<string>();if(source[i]==='}'){i++;return;}
      while(true){const k=str();if(keys.has(k))fail('JSON',`重复键 ${k}`);keys.add(k);white();if(source[i++]!==':')fail('JSON','缺少冒号');value(depth+1);white();const sep=source[i++];if(sep==='}')return;if(sep!==',')fail('JSON','对象格式错误');}
    }else if(c==='['){i++;white();if(source[i]===']'){i++;return;}while(true){value(depth+1);white();const sep=source[i++];if(sep===']')return;if(sep!==',')fail('JSON','数组格式错误');}}
    else if(c==='"'){str();}
    else {const m=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(source.slice(i));if(!m)fail('JSON','值无效');i+=m![0].length;}
  };
  try{value();white();if(i!==source.length)fail('JSON','多余内容');return validateDesign(JSON.parse(source));}
  catch(e){if(e instanceof DesignError)throw e;return fail('JSON',e instanceof Error?e.message:'无法解析');}
}
