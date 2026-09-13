import {readFileSync,writeFileSync,mkdirSync,statSync,existsSync,renameSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import {parseDesign} from './arena/schema';
import {Match} from './arena/match';
import {initPhysics} from './engine/adapter';
import {ENGINE_HASH} from './generated/build';
import {RULES} from './arena/rules';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
function designAt(path:string){
  const file=resolve(path);if(statSync(file).size>65536)throw new Error('Design exceeds 64 KiB');
  const d=parseDesign(readFileSync(file,'utf8'));
  const manifest=join(dirname(file),'submission.json');
  if(existsSync(manifest)){
    const m=JSON.parse(readFileSync(manifest,'utf8'));
    if(m.engineHash!==ENGINE_HASH||m.designHash!==sha(JSON.stringify(d)))throw new Error('Frozen submission hash or engine mismatch');
  }
  return d;
}
function writeNew(path:string,obj:unknown){writeFileSync(path,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});}
async function main(){
  const {positionals,values}=parseArgs({allowPositionals:true,options:{name:{type:'string'},duration:{type:'string',default:'30'},out:{type:'string'},swap:{type:'boolean',default:false}}});
  const [command,...args]=positionals;
  if(command==='init'){
    if(args.length!==1)throw new Error('init requires one new session directory');
    const dir=resolve(args[0]);mkdirSync(dir,{recursive:false});
    const name=values.name??'新斗士';if(!name.trim()||name.length>80)throw new Error('Name must be 1..80 characters');
    const design={...parseDesign(readFileSync(join(root,'examples/counter.json'),'utf8')),name,description:'请由参赛 AI 修改本设计，并通过试战迭代。'};
    writeNew(join(dir,'design.json'),design);writeNew(join(dir,'session.json'),{version:'arena-session-1',id:randomUUID(),startedAt:Date.now(),engineHash:ENGINE_HASH,name});
    writeNew(join(dir,'PUBLIC_RULES.json'),{...RULES,engineHash:ENGINE_HASH});
    writeFileSync(join(dir,'TASK.md'),`# AI 设计任务：${name}\n\n读取 ${join(root,'docs/PARTICIPANT.md')}。仅修改此目录的 design.json；禁止修改引擎、伤害、规则或预设胜者。开发样例可参考，不得将复制样例称为独立设计。\n\n在项目根目录运行：\n\n\`\`\`sh\nnpm run arena -- validate ${JSON.stringify(join(dir,'design.json'))}\nnpm run arena -- spar ${JSON.stringify(join(dir,'design.json'))} examples/pressure.json --duration 30\nnpm run arena -- freeze ${JSON.stringify(dir)}\n\`\`\`\n\n设计时间从本任务创建到冻结连续计入；包含试战与休息。当前为本机开发记录，不是防篡改竞赛计时。\n`,{flag:'wx'});
    console.log(JSON.stringify({session:dir,engineHash:ENGINE_HASH}));return;
  }
  if(command==='validate'){
    if(args.length!==1)throw new Error('validate requires a design.json path');
    const d=designAt(args[0]);console.log(JSON.stringify({valid:true,name:d.name,rules:d.rules.length,moves:Object.keys(d.moves).length,designHash:sha(JSON.stringify(d)),engineHash:ENGINE_HASH}));return;
  }
  if(command==='freeze'){
    if(args.length!==1)throw new Error('freeze requires a session directory');
    const dir=resolve(args[0]),session=JSON.parse(readFileSync(join(dir,'session.json'),'utf8'));
    if(session.version!=='arena-session-1'||session.engineHash!==ENGINE_HASH||!Number.isFinite(session.startedAt)||session.startedAt>Date.now())throw new Error('Invalid session or changed rules; create a new session');
    if(existsSync(join(dir,'submission.json')))throw new Error('Session already submitted');
    const design=designAt(join(dir,'design.json')),id=randomUUID(),tmp=join(root,'.arena/submissions/.tmp-'+id),target=join(root,'.arena/submissions',id);
    mkdirSync(tmp,{recursive:true});const manifest={version:'arena-submission-1',id,sessionId:session.id,engineHash:ENGINE_HASH,designHash:sha(JSON.stringify(design)),designElapsedMs:Date.now()-session.startedAt,submittedAt:Date.now(),name:design.name};
    writeNew(join(tmp,'design.json'),design);writeNew(join(tmp,'submission.json'),manifest);renameSync(tmp,target);writeNew(join(dir,'submission.json'),{...manifest,directory:target});
    console.log(JSON.stringify({submission:target,...manifest}));return;
  }
  if(command==='match'||command==='spar'){
    if(args.length!==2)throw new Error(`${command} requires two design.json paths`);
    const a=designAt(args[0]),b=designAt(args[1]),duration=Number(values.duration);
    if(!Number.isFinite(duration)||duration<1||duration>60)throw new Error('duration must be 1..60');
    const output=resolve(values.out??join(root,'outputs',randomUUID()));mkdirSync(output,{recursive:true});
    await initPhysics();const results=[];
    for(let i=0;i<(values.swap?2:1);i++){
      const start=performance.now(),m=new Match(i?b:a,i?a:b,duration);
      try{const archive=m.run(),wallMs=performance.now()-start,file=join(output,`match-${i+1}.json`);
        writeNew(file,archive);const summary={file,engineHash:ENGINE_HASH,designs:archive.designs.map((d:any)=>d.name),outcome:archive.outcome,wallMs,computeMs:archive.computeMs,simulationToCompute:archive.outcome!.time/(archive.computeMs/1000),decisions:archive.decisions.length,events:archive.events.length,recordSha256:sha(readFileSync(file,'utf8'))};
        results.push(summary);if(archive.outcome?.status==='void')process.exitCode=2;
      }finally{m.dispose();}
    }
    writeNew(join(output,'summary.json'),{version:'arena-summary-1',runtime:{node:process.version,platform:process.platform,arch:process.arch},results});
    console.log(JSON.stringify({output,results},null,2));return;
  }
  console.log('Arena Combat\n  init NEW_DIRECTORY --name NAME\n  validate DESIGN.json\n  spar DESIGN.json OPPONENT.json --duration 30 --out NEW_DIRECTORY\n  freeze SESSION_DIRECTORY\n  match A/design.json B/design.json --swap --duration 30 --out NEW_DIRECTORY');
}
main().catch(e=>{console.error(JSON.stringify({error:e instanceof Error?e.message:String(e)}));process.exitCode=1;});
