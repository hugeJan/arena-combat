import {TECHNIQUES} from './choreography';
import {validateDesign} from './schema';
import {clone, deepFreeze, neutralAction, type Action, type Condition, type Design, type FeatureValues, type Observation, type Trace} from './types';

export function matches(c: Condition, f: FeatureValues): boolean {
  if (typeof c === 'boolean') return c;
  if ('all' in c) return c.all.every(x => matches(x, f));
  if ('any' in c) return c.any.some(x => matches(x, f));
  if ('not' in c) return !matches(c.not, f);
  const a = f[c.feature], b = c.value;
  switch (c.op) {
    case 'eq': return a === b; case 'ne': return a !== b;
    case 'lt': return (a as number) < (b as number);
    case 'le': return (a as number) <= (b as number);
    case 'gt': return (a as number) > (b as number);
    case 'ge': return (a as number) >= (b as number);
  }
}

/** Bounded declarative runtime. It never receives the simulation or arbitrary code. */
export class Designer {
  readonly design: Readonly<Design>;
  trace: Trace = {rule:null, move:null, step:null, event:'stance'};
  private active: number | null = null;
  private stepIndex = 0;
  private started = 0;
  private sent = false;
  private pending: number | null = null;
  private cooldowns = new Map<number,number>();
  private lastTick = -1;
  private lastTime = -1;
  private attacks = 0;
  private blocks = 0;
  private lastHit = -1000;
  private lastBlock = -1000;
  private lastThreat = -1000;
  private highFraction = .5;
  constructor(design: unknown) { this.design = validateDesign(design); }

  private features(o: Observation): FeatureValues {
    const dx = o.opponent.position[0] - o.self.position[0];
    const dz = o.opponent.position[2] - o.self.position[2];
    const bearing = Math.atan2(Math.sin(Math.atan2(dx,dz)-o.self.heading), Math.cos(Math.atan2(dx,dz)-o.self.heading));
    for (const e of o.events) {
      if (e.kind === 'block' && e.target === 'self') {this.blocks++; this.lastBlock = e.time;}
      if ((e.kind === 'hit' || e.kind === 'sever') && e.target === 'self') this.lastHit = e.time;
    }
    const v=o.opponent.weapon_velocity, p=o.opponent.weapon_tip;
    const toward=o.self.position.map((x,i)=>x-p[i]);
    const length=Math.hypot(...toward);
    const closing=toward.reduce((n,x,i)=>n+x*v[i],0)/Math.max(.01,length);
    const incoming=closing>.8 && length<1.8;
    if(incoming){this.lastThreat=o.time;this.highFraction+=.10*((p[1]>o.self.position[1]+.4?1:0)-this.highFraction);}
    const side=(p[0]-o.self.position[0])*Math.cos(o.self.heading)-(p[2]-o.self.position[2])*Math.sin(o.self.heading);
    return {
      time:o.time, distance:Math.hypot(dx,dz), bearing,
      'self.health':o.self.health, 'self.stamina':o.self.stamina, 'self.mode':o.self.mode,
      'self.has_weapon':o.self.has_weapon, 'self.can_attack':o.self.can_attack, 'self.can_lunge':o.self.can_lunge,
      'self.counter_ready':o.self.counter_ready,
      'self.can_feint':o.self.can_feint??false,'self.can_backstep':o.self.can_backstep??false,
      'self.is_windup':o.self.is_windup??false,'self.is_recovering':o.self.is_recovering??false,'self.attack_progress':o.self.attack_progress??0,
      'opponent.mode':o.opponent.mode, 'opponent.has_weapon':o.opponent.has_weapon,
      'opponent.weapon_speed':Math.hypot(...v), 'opponent.weapon_height':p[1]-o.self.position[1],
      'opponent.incoming':incoming,'opponent.weapon_side':side,
      'memory.since_threat':o.time-this.lastThreat,'memory.high_threat_fraction':this.highFraction,
      'memory.attacks':this.attacks, 'memory.blocks':this.blocks,
      'memory.since_hit':o.time-this.lastHit, 'memory.since_block':o.time-this.lastBlock,
    };
  }
  private pose(patch: Partial<Action> = {}): Action {
    const a = clone({...neutralAction(), ...this.design.stance, ...patch});
    const length = Math.max(1, Math.hypot(...a.move));
    a.move = [a.move[0]/length,a.move[1]/length];
    return a;
  }
  private begin(index: number, time: number) {
    this.active=index;this.stepIndex=0;this.started=time;this.sent=false;this.pending=null;
    const r=this.design.rules[index];this.cooldowns.set(index,time+(r.cooldown??0));
    this.trace={rule:r.id,move:r.move,step:0,event:'selected'};
  }
  decide(observation: Observation): Action {
    const o=deepFreeze(clone(observation));
    if (!Number.isFinite(o.time)||o.tick<=this.lastTick||o.time<this.lastTime) throw new Error('Observation must advance monotonically');
    this.lastTick=o.tick;this.lastTime=o.time;
    const feedback=o.self.feedback;
    if (this.pending!==null && feedback && feedback.tick>=this.pending) {
      this.sent=feedback.accepted;
      if (this.sent && (['slash','chop',...TECHNIQUES] as string[]).includes(feedback.command)) this.attacks++;
      this.trace.event=this.sent?'accepted':feedback.reason;
      this.pending=null;
    }
    const f=this.features(o), rules=this.design.rules;
    if(this.active!==null && matches(this.design.moves[rules[this.active].move].abort_when??false,f)) {
      this.active=null;this.trace.event='aborted';
    }
    for(let i=0;i<rules.length;i++) {
      if(this.active!==null && (i>=this.active||!rules[i].interrupt))continue;
      if(o.time+1e-9 >= (this.cooldowns.get(i)??-1) && matches(rules[i].when,f)){this.begin(i,o.time);break;}
    }
    if(this.active===null){this.trace={rule:null,move:null,step:null,event:'stance'};return this.pose();}
    const steps=this.design.moves[rules[this.active].move].steps;
    let step=steps[this.stepIndex], elapsed=o.time-this.started;
    const needs=step.action?.command && step.action.command!=='none';
    const finished=elapsed+1e-9>=step.duration && (!needs || this.sent) && (!step.wait_for_idle || o.self.can_attack);
    const timeout=elapsed+1e-9>=(step.timeout??Math.max(3,step.duration+2));
    if(finished||timeout){
      this.trace.event=timeout&&!finished?'step_timeout':'step_finished';
      this.stepIndex++;this.started=o.time;this.sent=false;this.pending=null;elapsed=0;
      if(this.stepIndex>=steps.length){this.active=null;return this.pose();}
      step=steps[this.stepIndex];
    }
    this.trace.step=this.stepIndex;
    const action=this.pose(step.action);
    if(step.aim_to){const start=step.action?.aim??this.design.stance.aim??neutralAction().aim;
      const t=Math.min(1,elapsed/step.duration);action.aim=[start[0]+(step.aim_to[0]-start[0])*t,start[1]+(step.aim_to[1]-start[1])*t];}
    if(action.command!=='none'){
      if(this.sent||this.pending!==null)action.command='none';
      else{this.pending=o.tick;this.trace.event='requested';}
    }
    return action;
  }
}
