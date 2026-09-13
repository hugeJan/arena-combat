/** Reproducible development evidence. Fixtures are not independent AI entries. */
import {initPhysics} from '../src/engine/adapter';
import {physicalTrial,type Defense} from '../tests/helpers/physical-trial';
import {TECHNIQUES} from '../src/arena/choreography';
import {ENGINE_HASH} from '../src/generated/build';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {Match} from '../src/arena/match';
import {createHash} from 'node:crypto';
await initPhysics();
const out=process.argv[2]??'outputs/craft-validation';mkdirSync(out,{recursive:true});
const probes=[];
for(const kind of TECHNIQUES)for(const defense of ['open','high','inside','outside','low','duck','retreat'] as Defense[]){
  const result=physicalTrial(kind,defense);probes.push(result);
}
const trials=JSON.stringify({engineHash:ENGINE_HASH,fixture:'same initial placement and command; one defense input varies',probes});
writeFileSync(`${out}/physical-trials.json`,trials);
const designs=['pressure','counter'].map(n=>JSON.parse(readFileSync(`examples/${n}.json`,'utf8')));
const matches=[];
for(let pair=0;pair<2;pair++){
  const start=performance.now(),m=new Match(designs[pair],designs[1-pair],30);
  try{
    const archive=m.run();const counts=[0,1].map(slot=>{
      const commands:Record<string,number>={},rules=new Set<string>(),guards=new Set<string>();let crouch=0;
      for(const d of archive.decisions){const a=d.actions[slot],f=d.feedback[slot];if(f.accepted&&a.command!=='none')commands[a.command]=(commands[a.command]??0)+1;if(a.guard&&a.guard_pose)guards.add(a.guard_pose);if(a.crouch)crouch++;if(d.traces[slot].rule)rules.add(d.traces[slot].rule!);}
      return {commands,rules:[...rules],guards:[...guards],crouchDecisionTicks:crouch};
    });
    const raw=JSON.stringify(archive),file=`${out}/match-${pair+1}.json`;writeFileSync(file,raw);
    matches.push({outcome:archive.outcome,wallMs:performance.now()-start,computeMs:archive.computeMs,counts,
      contacts:archive.events.reduce((x,e)=>(x[e.kind]=(x[e.kind]??0)+1,x),{} as Record<string,number>),
      presentationFrames:archive.presentationFrames?.length??0,sha256:createHash('sha256').update(raw).digest('hex')});
  }finally{m.dispose();}
}
const summary={engineHash:ENGINE_HASH,runtime:{node:process.version,platform:process.platform,arch:process.arch},
  note:'Developer fixtures only. Health difference can include severing/bleeding. A miss is not proof of a weapon parry. Fixed placement trials do not establish a universal matchup advantage.',
  trials:probes.map(p=>({technique:p.kind,defense:p.defense,health:p.health[1],headHeight:p.initialHead,
    hits:p.events.filter(e=>e.damage>0).length,parries:p.events.filter(e=>e.kind==='block'&&e.counter).length,weaponContacts:p.events.filter(e=>e.kind==='block').length})),
  matches,rawTrialsSha256:createHash('sha256').update(trials).digest('hex')};
writeFileSync(`${out}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
if(matches.some(x=>x.outcome?.status!=='completed'))process.exitCode=1;
