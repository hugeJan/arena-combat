import {ArenaEngine,STEP} from '../engine/adapter';
import {neutralAction,type Action} from '../arena/types';
import {CATALOG,type Technique,type GuardPose} from '../arena/choreography';
/** Developer action laboratory. Inputs are scripted; hits and outcomes are not.
 * Never submitted to a leaderboard or presented as AI-authored combat. */
export class MotionLab {
  readonly engine=new ArenaEngine();readonly kind:Technique;
  private issued=false;
  readonly stopTick:number;
  constructor(kind:Technique,private defense:string,readonly freezeAt:'all'|'windup'|'swing'|'recover'='all'){
    this.kind=kind;
    const spec=CATALOG[kind];
    const offset=freezeAt==='windup'?spec.windup*.75:freezeAt==='swing'?spec.windup+spec.strike*.55:spec.windup+spec.strike+spec.recover*.5;
    this.stopTick=freezeAt==='all'?540:Math.ceil((.95+offset)/STEP);
    this.engine.start();
  }
  step(){
    if(this.engine.simulation.phase==='finished'||this.engine.tick>=this.stopTick)return false;
    const t=this.engine.tick*STEP;
    const a:Action=neutralAction(),b:Action=neutralAction();
    a.guard=true;b.guard=this.defense!=='open'&&this.defense!=='duck';
    if(['high','inside','outside','low'].includes(this.defense))b.guard_pose=this.defense as GuardPose;
    // Approach symmetrically, then plant before executing one complete strike.
    if(t<.42){a.move=[0,.40];b.move=[0,.40];}
    if(t>=.95&&!this.issued){a.guard=false;a.command=this.kind;this.issued=true;}
    if(t>=.90&&t<2.15){if(this.defense==='duck')b.crouch=1;if(this.defense==='retreat')b.move=[0,-.7];}
    this.engine.submit([a,b]);this.engine.step();return true;
  }
  dispose(){this.engine.dispose();}
}
