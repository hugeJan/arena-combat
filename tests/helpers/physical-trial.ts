import {Vector3} from 'three';
import {ArenaEngine,STEP} from '../../src/engine/adapter';
import {neutralAction,type Command} from '../../src/arena/types';
import type {GuardPose} from '../../src/arena/choreography';

/** Initial test fixture only. No transforms are moved after the trial starts. */
export function placePair(engine:ArenaEngine,gap:number){
  for(const f of engine.simulation.fighters){
    const delta=new Vector3((f.id===0?-1:1)*(gap/2-1.05),0,0);
    for(const p of f.rig.parts.values())p.body.setTranslation(new Vector3().copy(p.body.translation()).add(delta),true);
    f.sword.setTranslation(new Vector3().copy(f.sword.translation()).add(delta),true);
    f.position.add(delta);f.rig.origin.add(delta);f.feet.forEach(p=>p.add(delta));
  }
}
export type Defense='open'|GuardPose|'duck'|'retreat';
export function physicalTrial(kind:Command,defense:Defense,gap=kind==='thrust'?1.65:1.4){
  const e=new ArenaEngine();
  try{
    placePair(e,gap);e.start();
    const a=neutralAction(),b=neutralAction();
    if(['high','inside','outside','low'].includes(defense)){b.guard=true;b.guard_pose=defense as GuardPose;}
    if(defense==='duck')b.crouch=1;
    e.submit([a,b]);for(let i=0;i<90;i++)e.step();
    const initialHead=e.simulation.fighters[1].rig.parts.get('head')!.body.translation().y;
    a.command=kind;if(defense==='retreat')b.move=[0,-.85];
    const accepted=e.submit([a,b]),samples=[];
    for(let i=0;i<180;i++){
      e.step();
      if(i%6===0){
        const f=e.simulation.fighters[0];
        const tip=new Vector3(0,f.weapon.spec.tip,0).applyQuaternion(f.sword.rotation()).add(f.sword.translation());
        samples.push({time:i*STEP,phase:f.state,tip:tip.toArray(),hand:{...f.rig.parts.get('right hand')!.body.translation()}});
      }
    }
    return {kind,defense,gap,accepted,initialHead,health:e.simulation.fighters.map(f=>f.hp),
      events:e.events.map(x=>({...x})),samples,diagnostics:e.simulation.fighters.map(f=>f.rig.diagnostics())};
  }finally{e.dispose();}
}
