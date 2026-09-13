import {Quaternion, Vector3} from 'three';
import {DuelSimulation, initPhysics, STEP, type DuelHit} from '../../.engine/stick-steel/lib/duel/physics';
import {fighterSnapshot,weaponSnapshot,applyFighterSnapshot,applyWeaponSnapshot,type WireState} from '../../.engine/stick-steel/lib/duel/net-state';
import {validateAction} from '../arena/schema';
import {clone,deepFreeze,type Action,type Feedback,type Observation,type Slot,type Vector} from '../arena/types';
export {STEP,initPhysics};
export type Frame = {tick:number;time:number;fighters:WireState[];weapons:WireState};
export type ContactEvent = {tick:number;time:number;kind:string;attacker:number;target:number;part:string;damage:number;strength:number;point:Vector;velocity:Vector;counter:boolean};
const xyz=(v:{x:number;y:number;z:number}):Vector=>[v.x,v.y,v.z];
export class ArenaEngine {
  readonly simulation:DuelSimulation;
  tick=0;
  feedback:[Feedback|null,Feedback|null]=[null,null];
  events:ContactEvent[]=[];
  onHit?: (hit:DuelHit)=>void;
  private cursors=[0,0];
  constructor(){this.simulation=new DuelSimulation({arena:'yard',playerWeapon:'sword',rivalWeapon:'sword',spares:false,ledgeDrill:false},true);
    this.simulation.onHit=hit=>{
      this.events.push({tick:this.tick+1,time:this.simulation.time,kind:hit.kind,attacker:hit.attacker,target:hit.target,part:hit.part,damage:hit.damage,strength:hit.strength,point:xyz(hit.point),velocity:xyz(hit.velocity),counter:!!hit.counter});
      this.onHit?.(hit);
    };
  }
  start(){this.simulation.start();}
  observation(slot:Slot):Observation {
    const sim=this.simulation,f=sim.fighters[slot],other=sim.fighters[1-slot];
    const body=f.rig.parts.get('pelvis')!.body,op=other.rig.parts.get('pelvis')!.body;
    const rotation=new Quaternion().copy(other.sword.rotation());
    const offset=new Vector3(0,other.weapon.spec.tip,0).applyQuaternion(rotation);
    const tip=offset.clone().add(other.sword.translation());
    const velocity=new Vector3().copy(other.sword.angvel()).cross(offset).add(other.sword.linvel());
    const available=!f.down&&f.mode==='upright'&&!!f.grip;
    const recent=this.events.slice(this.cursors[slot]);this.cursors[slot]=this.events.length;
    return deepFreeze({tick:this.tick,time:this.tick*STEP,
      self:{health:f.hp,stamina:f.stamina,mode:f.mode,has_weapon:!!f.grip,
        can_attack:available&&f.slashTime<=0&&f.recovery<=0&&f.recoilTime<=0&&f.stamina>=13,
        can_lunge:available&&f.lungeTime<=0&&f.recoilTime<=0&&f.recovery<=.2&&f.stamina>=18,
        counter_ready:f.counterTime>0,position:xyz(body.translation()),velocity:xyz(body.linvel()),heading:f.heading,feedback:clone(this.feedback[slot])},
      opponent:{mode:other.mode,has_weapon:!!other.grip,position:xyz(op.translation()),velocity:xyz(op.linvel()),weapon_tip:xyz(tip),weapon_velocity:xyz(velocity)},
      events:recent.filter(e=>e.kind!=='floor').map(e=>({kind:e.kind,actor:e.attacker===slot?'self' as const:'opponent' as const,target:e.target===slot?'self' as const:'opponent' as const,time:e.time}))});
  }
  observations():[Observation,Observation]{return [this.observation(0),this.observation(1)];}
  submit(actions:[Action,Action]):[Feedback,Feedback] {
    // Validate both before mutating either seat.
    actions.forEach(a=>validateAction(a));
    const sim=this.simulation;
    for(const id of [0,1] as const){const a=actions[id],input=sim.inputs[id];
      input.move.set(...a.move).clampLength(0,1);input.aim.set(...a.aim);
      input.attack=a.attack;input.guard=a.guard;input.interact=a.interact;
    }
    return [0,1].map(id=>{
      const slot=id as Slot,a=actions[slot],f=sim.fighters[slot];
      let accepted=true,reason='input_updated';
      if(a.command!=='none'){
        if(sim.phase!=='fighting'||f.down){accepted=false;reason='not_fighting';}
        else{
          const before={slash:f.slashTime,lunge:f.lungeTime,shove:f.shoveTime,pickup:f.pickup,grip:f.grip,hang:f.hang};
          sim[a.command](id);
          switch(a.command){
            case 'slash':case 'chop':accepted=f.slashTime>before.slash;break;
            case 'lunge':accepted=f.lungeTime>before.lunge;break;
            case 'shove':accepted=f.shoveTime>before.shove;break;
            case 'pickup':accepted=f.pickup!==null;break;
            case 'drop':accepted=before.grip!==f.grip||before.hang!==f.hang;break;
          }
          reason=accepted?'accepted':f.mode!=='upright'?'not_upright':!f.grip&&a.command!=='pickup'?'unarmed':f.recovery>0||f.recoilTime>0||f.slashTime>0?'busy':'unavailable';
        }
      }
      const out={tick:this.tick,command:a.command,accepted,reason};this.feedback[slot]=out;return out;
    }) as [Feedback,Feedback];
  }
  step(){this.simulation.step();this.tick++;
    if(this.tick%6===0){for(const f of this.simulation.fighters){const p=xyz(f.rig.parts.get('pelvis')!.body.translation());if(!p.every(Number.isFinite)||!Number.isFinite(f.hp)||!Number.isFinite(f.stamina))throw new Error('Non-finite physical state');}}
  }
  frame():Frame{return {tick:this.tick,time:this.tick*STEP,fighters:this.simulation.fighters.map(fighterSnapshot),weapons:weaponSnapshot(this.simulation)};}
  dispose(){this.simulation.dispose();}
}
/** Only for a separate replay world. Never call this on an active match engine. */
export function showFrame(sim:DuelSimulation,frame:Frame){
  applyWeaponSnapshot(sim,frame.weapons,frame.weapons);
  frame.fighters.forEach((state,id)=>applyFighterSnapshot(sim,id,state,state));
}
