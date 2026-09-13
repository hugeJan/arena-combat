import {ArenaEngine,STEP,type Frame,type ContactEvent} from '../engine/adapter';
import {Designer} from './runtime';
import {RULES} from './rules';
import {clone,type Action,type Feedback,type Trace,type Observation} from './types';
import {ENGINE_HASH} from '../generated/build';
export type DecisionRecord={tick:number;observations:[Observation,Observation];actions:[Action,Action];feedback:[Feedback,Feedback];traces:Trace[]};
export type Outcome={status:'completed'|'void';winner:0|1|null;reason:string;tick:number;time:number};
export type Archive={version:'arena-record-1';engineHash:string;rules:typeof RULES;designs:unknown[];duration:number;decisions:DecisionRecord[];frames:Frame[];events:ContactEvent[];outcome:Outcome|null;computeMs:number;presentationFrames?:Frame[]};
/** Trusted match driver. Policy observations are captured before either policy acts. */
export class Match {
  readonly engine:ArenaEngine;
  readonly designers:[Designer,Designer];
  readonly archive:Archive;
  private limit:number;
  private presentationTick=0;
  constructor(a:unknown,b:unknown,duration=30){
    if(!Number.isFinite(duration)||duration<1||duration>RULES.maxDuration)throw new Error('duration must be within 1..60 seconds');
    this.designers=[new Designer(a),new Designer(b)];
    this.engine=new ArenaEngine();this.limit=Math.ceil(duration/STEP);
    this.archive={version:'arena-record-1',engineHash:ENGINE_HASH,rules:RULES,designs:this.designers.map(x=>clone(x.design)),duration,decisions:[],frames:[this.engine.frame()],events:[],outcome:null,computeMs:0};
    this.engine.start();
  }
  step():boolean{
    if(this.archive.outcome)return false;
    const start=performance.now();
    try{
      if(this.engine.tick%RULES.decisionSteps===0){
        const observations=this.engine.observations();
        const actions:[Action,Action]=[this.designers[0].decide(observations[0]),this.designers[1].decide(observations[1])];
        const feedback=this.engine.submit(actions);
        this.archive.decisions.push({tick:this.engine.tick,observations,actions:clone(actions),feedback:clone(feedback),traces:this.designers.map(d=>clone(d.trace))});
      }
      this.engine.step();
      const sim=this.engine.simulation;
      if(sim.phase==='finished')this.finish('completed',sim.winner as 0|1|null,sim.winner===null?'draw':sim.fighters[1-sim.winner].defeat);
      else if(this.engine.tick>=this.limit)this.finish('completed',null,'time_limit');
      if(this.engine.tick%RULES.replaySteps===0||this.archive.outcome)this.archive.frames.push(this.engine.frame());
    }catch(error){this.finish('void',null,error instanceof Error?error.message:String(error));}
    this.archive.computeMs+=performance.now()-start;
    return !this.archive.outcome;
  }
  private finish(status:Outcome['status'],winner:Outcome['winner'],reason:string){this.archive.outcome={status,winner,reason,tick:this.engine.tick,time:this.engine.tick*STEP};this.archive.events=clone(this.engine.events);}
  /** Bounded post-result physics for the fall. Never reopens decisions or scoring. */
  postrollStep():boolean {
    if(!this.archive.outcome||this.archive.outcome.status==='void'||this.presentationTick>=180)return false;
    const sim=this.engine.simulation;
    sim.phase='finished';sim.clearInput(0);sim.clearInput(1);
    sim.step();this.presentationTick++;
    if(this.presentationTick%RULES.replaySteps===0){
      const frame=this.engine.frame();frame.tick=this.archive.outcome.tick+this.presentationTick;frame.time=frame.tick*STEP;
      (this.archive.presentationFrames??=[]).push(frame);
    }
    return this.presentationTick<180;
  }
  run(){while(this.step());while(this.postrollStep());return this.archive;}
  dispose(){this.engine.dispose();}
}
