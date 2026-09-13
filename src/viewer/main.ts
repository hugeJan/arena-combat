import './style.css';
import {parseDesign} from '../arena/schema';
import {Match} from '../arena/match';
import {ArenaEngine,initPhysics,showFrame,STEP} from '../engine/adapter';
import {ENGINE_HASH} from '../generated/build';
import {Stage} from './stage';
import {MotionLab} from './lab';
import {CATALOG,type Technique} from '../arena/choreography';
import pressure from '../../examples/pressure.json';
import counter from '../../examples/counter.json';
import guide from '../../docs/PARTICIPANT.md?raw';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const presets={pressure,counter};let stage:Stage|null=null,preview:ArenaEngine|null=null,match:Match|null=null,replayWorld:ArenaEngine|null=null;
let lab:MotionLab|null=null,labRunning=false,wide=false,trajectories=false;
let ready=false,paused=false,replaying=false,replayTime=0,accumulator=0,last=performance.now(),raf=0,sound=false;
let fpsClock=0,fpsFrames=0,lastFps=0,uiTime=0,runClock=0;
const states:Record<string,string>={ready:'调整姿态',guard:'持械格挡',windup:'准备出手',swing:'挥斩',recover:'收势',stagger:'受击失衡',down:'失能',unarmed:'失去武器',reaching:'拾取武器',fallen:'倒地',rising:'起身',hanging:'悬挂',climbing:'攀爬',falling:'下落'};
function valid(slot:'a'|'b'){
  const message=$('validation-'+slot);try{const d=parseDesign($<HTMLTextAreaElement>('design-'+slot).value);message.textContent=`✓ ${d.rules.length} 条规则 · ${Object.keys(d.moves).length} 组招式`;message.className='validation';return d;}
  catch(e){message.textContent=e instanceof Error?e.message:String(e);message.className='validation invalid';return null;}
}
function validate(){const a=valid('a'),b=valid('b');$<HTMLButtonElement>('start').disabled=!ready||!a||!b||!!(match&&!match.archive.outcome);return a&&b?[a,b] as const:null;}
for(const slot of ['a','b'] as const){
  const select=$<HTMLSelectElement>('preset-'+slot),area=$<HTMLTextAreaElement>('design-'+slot);
  const set=()=>{area.value=JSON.stringify(presets[select.value as keyof typeof presets],null,2);validate();};set();select.addEventListener('change',set);area.addEventListener('input',validate);
  $<HTMLInputElement>('file-'+slot).addEventListener('change',async e=>{const input=e.target as HTMLInputElement,file=input.files?.[0];if(!file)return;if(file.size>65536){$('validation-'+slot).textContent='文件不能超过64 KiB';input.value='';return;}area.value=await file.text();input.value='';validate();});
}
function exportText(name:string,text:string,mime='application/json'){const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('guide').onclick=()=>exportText('AI-参赛指南.md',guide,'text/markdown');
$('swap').onclick=()=>{const a=$<HTMLTextAreaElement>('design-a'),b=$<HTMLTextAreaElement>('design-b');[a.value,b.value]=[b.value,a.value];validate();};
$('sound').onclick=()=>{sound=!sound;stage?.audio.unlock();stage?.audio.mute(!sound);$('sound').textContent='声音：'+(sound?'开':'关');$('sound').setAttribute('aria-pressed',String(sound));};
function updateUI(){
 const sim=lab?lab.engine.simulation:replaying?replayWorld?.simulation:match?.engine.simulation??preview?.simulation;if(!sim)return;
 const time=lab?lab.engine.tick*STEP:replaying?replayTime:match?.engine.tick?match.engine.tick*STEP:0;
 $('clock').textContent=time.toFixed(2).padStart(5,'0');$('mode').textContent=lab?'LAB':replaying?'REPLAY':match?.archive.outcome?'FINISHED':match?'LIVE':'READY';
 const motionFrame=replaying?[...(match?.archive.frames??[]),...(match?.archive.presentationFrames??[])].findLast(f=>f.time<=time):null;
 sim.fighters.forEach((f,i)=>{const s=i===0?'a':'b';const kind=replaying?motionFrame?.motions?.[i]?.technique:f.motion?.kind;
 $('action-'+s).textContent=kind&&kind in CATALOG?CATALOG[kind as Technique].label:f.guard?'封住攻击线':f.mode!=='upright'?'恢复身体':'寻找出手机会';
 $('phase-'+s).dataset.phase=f.state;$('health-'+s).style.width=Math.max(0,f.hp)+'%';$('stamina-'+s).textContent='精力 '+Math.round(f.stamina);$('state-'+s).textContent=states[f.state]??f.state;});
 const record=match?.archive.decisions.findLast(d=>d.tick*STEP<=time);
 ['a','b'].forEach((s,i)=>{$('trace-'+s).textContent=(i===0?'红方：':'蓝方：')+(record?.traces[i].rule??'默认姿态')+(record?.traces[i].move?' → '+record.traces[i].move:'');});
 const events=(lab?.engine.events??match?.engine.events??[]).filter(e=>e.kind!=='floor'&&e.time<=time).slice(-5).reverse();
 $('events').replaceChildren(...events.map(e=>{const div=document.createElement('button');div.className='event-link';div.disabled=!!lab||!match?.archive.outcome;div.onclick=()=>{seek(Math.max(0,e.time-.65));paused=true;$('pause').textContent='继续';};div.textContent=`${e.time.toFixed(2)}s  ${e.attacker===0?'红方':'蓝方'} ${e.kind==='block'?(e.counter?'持械格挡':'兵器相撞'):e.kind==='sever'?'造成伤势':'命中'}${e.damage>0?' · '+e.damage.toFixed(1)+' 伤害':''}`;return div;}));
 if(!events.length)$('events').textContent='尚无交锋记录';
 const out=lab?null:match?.archive.outcome;
 $('result').hidden=!out||replaying||!!lab;
 if(out&&!replaying)$('result').textContent=out.status==='void'?'对局作废：'+out.reason:out.winner===null?'时间到 · 平局':`${out.winner===0?'红方':'蓝方'}获胜`;
 $<HTMLButtonElement>('start').disabled=!ready||!!(match&&!match.archive.outcome)||document.querySelectorAll('.validation.invalid').length>0;
 $('status').textContent=lab?(labRunning?'动作对照进行中':'动作对照结束，不计成绩'):replaying?'回放 · 不重新判胜负':paused?'已暂停':out?'本局已结束':match?'对战进行中':'准备就绪';
 $<HTMLButtonElement>('replay').disabled=!out;$<HTMLButtonElement>('export').disabled=!out;$<HTMLButtonElement>('pause').disabled=lab?!labRunning:!match||!!out&&!replaying;
 $<HTMLInputElement>('seek').disabled=!out;$<HTMLInputElement>('seek').max=String(match?.archive.presentationFrames?.at(-1)?.time??out?.time??30);$<HTMLInputElement>('seek').value=String(time);
 $('performance').textContent=`${lastFps} FPS · ${replaying?'已记录姿态':accumulator>.1?'计算落后 '+accumulator.toFixed(2)+'s':'120 Hz 固定步进'}${match?' · 实算 '+(match.archive.computeMs/1000).toFixed(2)+'s':''}`;
 $('timeline-label').textContent=replaying?'拖动时间轴回看':'比赛结束后可拖动回看';
 // Small diagnostics surface for browser tests; no strategy receives these values.
 document.body.dataset.phase=lab?'lab':out?.status??(match?'running':'ready');document.body.dataset.tick=String(lab?.engine.tick??match?.engine.tick??0);
 $<HTMLButtonElement>('lab-toggle').disabled=!!match&&!match.archive.outcome;
 if(lab){$('trace-a').textContent='动作实验室：'+CATALOG[lab.kind].label;$('trace-b').textContent='对照输入由测试场发送；结果仍由实际碰撞产生';}
}
$('start').onclick=()=>{
 const designs=validate();if(!designs||!stage)return;
 try{const next=new Match(designs[0],designs[1],Number($<HTMLSelectElement>('duration').value));
   lab?.dispose();lab=null;labRunning=false;document.body.classList.remove('lab-active');$('stage-note').textContent='固定招式 · 实际兵器接触 · 无预设胜负';$('lab-panel').hidden=true;document.body.classList.add('watching');$('workbench').setAttribute('aria-pressed','false');
   match?.dispose();preview?.dispose();replayWorld?.dispose();preview=replayWorld=null;match=next;stage.bind(next.engine.simulation);next.engine.onHit=h=>stage?.hit(h);
   $('name-a').textContent=designs[0].name;$('name-b').textContent=designs[1].name;
   accumulator=0;runClock=0;paused=false;replaying=false;last=performance.now();$('pause').textContent='暂停';updateUI();
 }catch(e){$('status').textContent='无法启动：'+(e instanceof Error?e.message:String(e));}
};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'继续':'暂停';last=performance.now();updateUI();};
function seek(time:number){
 if(!match?.archive.outcome||!stage)return;
 lab?.dispose();lab=null;labRunning=false;document.body.classList.remove('lab-active');$('lab-panel').hidden=true;
 if(!replayWorld){replayWorld=new ArenaEngine();stage.bind(replayWorld.simulation);}
 replaying=true;replayTime=time;$('result').hidden=true;
 const frame=[...match.archive.frames,...(match.archive.presentationFrames??[])].findLast(f=>f.time<=time)??match.archive.frames[0];showFrame(replayWorld.simulation,frame);updateUI();
}
$('replay').onclick=()=>{seek(0);paused=false;last=performance.now();$('pause').textContent='暂停';};
$<HTMLInputElement>('seek').oninput=e=>{seek(Number((e.target as HTMLInputElement).value));paused=true;$('pause').textContent='继续';};
$('export').onclick=()=>{if(match?.archive.outcome)exportText(`arena-${Date.now()}.json`,JSON.stringify(match.archive));};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&match&&!match.archive.outcome){paused=true;$('pause').textContent='继续';}last=performance.now();updateUI();});
function frame(now:number){
 const dt=(now-last)/1000;last=now;fpsClock+=dt;fpsFrames++;if(fpsClock>=1){lastFps=Math.round(fpsFrames/fpsClock);fpsClock=0;fpsFrames=0;}
 if(!document.hidden&&!paused){
   if(lab&&labRunning){accumulator+=dt;const start=performance.now();while(accumulator>=STEP&&performance.now()-start<12&&labRunning){labRunning=lab.step();accumulator-=STEP;}if(!labRunning)accumulator=0;}
   else if(replaying&&match?.archive.outcome){replayTime=Math.min(match.archive.presentationFrames?.at(-1)?.time??match.archive.outcome.time,replayTime+dt);seek(replayTime);if(replayTime>=(match.archive.presentationFrames?.at(-1)?.time??match.archive.outcome.time)){paused=true;$('pause').textContent='继续';}}
   else if(match&&!match.archive.outcome){accumulator+=dt;runClock+=dt;const start=performance.now();
     while(accumulator>=STEP&&performance.now()-start<12&&!match.archive.outcome){match.step();accumulator-=STEP;}
     if(match.archive.outcome)accumulator=0;
   } else if(match?.archive.outcome&&!replaying){accumulator+=dt;let active=true;const start=performance.now();while(accumulator>=STEP&&performance.now()-start<12&&active){active=match.postrollStep();accumulator-=STEP;}if(!active)accumulator=0;}
 }
 stage?.draw(paused?0:dt);uiTime+=dt;if(uiTime>.1){updateUI();uiTime=0;}raf=requestAnimationFrame(frame);
}
$('workbench').onclick=()=>{document.body.classList.remove('clean');document.body.classList.toggle('watching');$('workbench').setAttribute('aria-pressed',String(!document.body.classList.contains('watching')));};
$('cinema').onclick=()=>{document.body.classList.add('watching');document.body.classList.toggle('clean');$('cinema').setAttribute('aria-pressed',String(document.body.classList.contains('clean')));};
$('fullscreen').onclick=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>{$('status').textContent='浏览器未允许全屏';});};
$('camera').onclick=()=>{wide=!wide;stage?.setWide(wide);$('camera').textContent=wide?'镜头：全场':'镜头：双人近景';};
$('trails').onclick=()=>{trajectories=!trajectories;stage?.setTrajectories(trajectories);$('trails').textContent='轨迹：'+(trajectories?'开':'关');$('trails').setAttribute('aria-pressed',String(trajectories));};
function runLab(){
 if(!ready||!stage||match&&!match.archive.outcome)return;
 lab?.dispose();preview?.dispose();preview=null;replayWorld?.dispose();replayWorld=null;
 lab=new MotionLab($<HTMLSelectElement>('lab-technique').value as Technique,$<HTMLSelectElement>('lab-defense').value);
 labRunning=true;paused=false;replaying=false;accumulator=0;stage.bind(lab.engine.simulation);lab.engine.onHit=h=>stage?.hit(h);
 document.body.classList.add('watching','lab-active');$('stage-note').textContent='动作实验室 · 不生成正式比赛成绩';$('name-a').textContent='招式执行';$('name-b').textContent='对照防守';last=performance.now();updateUI();
}
$('lab-toggle').onclick=()=>{$('lab-panel').hidden=!$('lab-panel').hidden;if(!$('lab-panel').hidden)runLab();};
$('lab-run').onclick=runLab;
document.addEventListener('keydown',e=>{if(e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
 if(e.code==='Space'){e.preventDefault();if(!$<HTMLButtonElement>('pause').disabled)$('pause').click();}
 if(e.key==='Escape'){document.body.classList.remove('clean');$('cinema').setAttribute('aria-pressed','false');}
});
async function boot(){try{await initPhysics();stage=new Stage($('stage'));preview=new ArenaEngine();stage.bind(preview.simulation);ready=true;$('loading').hidden=true;$('identity').textContent='规则 '+ENGINE_HASH.slice(0,16)+' · 上游 4c8e1d0';validate();updateUI();last=performance.now();raf=requestAnimationFrame(frame);}catch(e){$('loading').textContent='加载失败：'+(e instanceof Error?e.message:String(e));$('status').textContent='启动失败';}}
window.addEventListener('pagehide',()=>{lab?.dispose();cancelAnimationFrame(raf);stage?.dispose();match?.dispose();preview?.dispose();replayWorld?.dispose();});
void boot();
