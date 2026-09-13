/** Shared execution vocabulary. Targets drive the existing finite-force rig.
 * No opponent, collision, damage, or winning decision is consulted here. */
export const TECHNIQUES = ['cut_right','cut_left','overhead','thrust','low_cut'] as const;
export type Technique = typeof TECHNIQUES[number];
export type MotionPhase = 'windup'|'swing'|'recover';
export type Pose = {aim:[number,number];hand:[number,number,number];lean:number;twist:number;lower:number};
export type TechniqueSpec = {label:string;line:string;windup:number;strike:number;recover:number;cost:number;chamber:Pose;finish:Pose};
const pose=(aim:[number,number],hand:[number,number,number],lean=0,twist=0,lower=0):Pose=>({aim,hand,lean,twist,lower});
export const CATALOG:Record<Technique,TechniqueSpec> = {
  cut_right:{label:'右势横斩',line:'由持械侧横向切入',windup:.32,strike:.30,recover:.42,cost:15,
    chamber:pose([-.82,.66],[-.46,1.43,.23],-.045,-.20,.035),finish:pose([.72,.16],[.12,1.27,.56],.13,.20,.025)},
  cut_left:{label:'回身反斩',line:'反向横斩，改变攻击侧',windup:.34,strike:.30,recover:.44,cost:15,
    chamber:pose([.70,.62],[.04,1.43,.28],-.025,.18,.025),finish:pose([-.82,.13],[-.48,1.28,.51],.10,-.19,.03)},
  overhead:{label:'高位劈斩',line:'高举后向下劈落',windup:.42,strike:.30,recover:.48,cost:19,
    chamber:pose([-.13,.98],[-.19,1.65,.24],-.08,-.06,.025),finish:pose([.06,-.52],[-.14,1.08,.60],.17,.08,.07)},
  thrust:{label:'直线刺击',line:'收剑后伸臂，直取中线',windup:.27,strike:.27,recover:.43,cost:12,
    chamber:pose([-.07,.20],[-.27,1.24,.17],-.065,-.09,.02),finish:pose([-.04,.20],[-.12,1.29,.68],.17,.10,.025)},
  low_cut:{label:'低位切斩',line:'压低身体，横切下路',windup:.36,strike:.32,recover:.46,cost:17,
    chamber:pose([-.74,.18],[-.43,1.15,.26],.04,-.17,.085),finish:pose([.73,-.43],[.11,.97,.52],.15,.17,.12)},
};
export const GUARDS = {
  high:{label:'高位架剑',aim:[.04,.95]}, inside:{label:'内侧封线',aim:[.52,.65]},
  outside:{label:'外侧封线',aim:[-.58,.72]}, low:{label:'低位护线',aim:[.20,-.85]},
} as const;
export type GuardPose = keyof typeof GUARDS;
export type Motion = {kind:Technique;elapsed:number;windup:number;strike:number;recover:number;start:Pose;home:Pose;cancelled:boolean};
export function restPose(aim:readonly number[]=[.18,.8]):Pose {
  return pose([aim[0],aim[1]],aim[1]<-.55?[.30,.90,.20]:[-.12+aim[0]*.16,1.27+aim[1]*.19,.30],aim[1]<-.55?0:.035,0,0);
}
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export function blend(a:Pose,b:Pose,t:number):Pose {
  const s=smooth(t),mix=(x:number,y:number)=>x+(y-x)*s;
  return {aim:[mix(a.aim[0],b.aim[0]),mix(a.aim[1],b.aim[1])],
    hand:[mix(a.hand[0],b.hand[0]),mix(a.hand[1],b.hand[1]),mix(a.hand[2],b.hand[2])],
    lean:mix(a.lean,b.lean),twist:mix(a.twist,b.twist),lower:mix(a.lower,b.lower)};
}
export function createMotion(kind:Technique,start:Pose,home:Pose,counter=false):Motion {
  const s=CATALOG[kind];return {kind,elapsed:0,windup:s.windup*(counter?.72:1),strike:s.strike,recover:s.recover,start:structuredClone(start),home:structuredClone(home),cancelled:false};
}
export function duration(m:Motion){return m.windup+m.strike+m.recover;}
export function phase(m:Motion):MotionPhase {return m.elapsed<m.windup?'windup':m.elapsed<m.windup+m.strike?'swing':'recover';}
export function sampleMotion(m:Motion):Pose {
  if(m.cancelled)return blend(m.start,m.home,m.elapsed/m.recover);
  const s=CATALOG[m.kind];
  if(m.elapsed<m.windup)return blend(m.start,s.chamber,m.elapsed/m.windup);
  if(m.elapsed<m.windup+m.strike)return blend(s.chamber,s.finish,(m.elapsed-m.windup)/m.strike);
  // The first 15% retains follow-through, then returns to the requested guard.
  return blend(s.finish,m.home,((m.elapsed-m.windup-m.strike)/m.recover-.15)/.85);
}
export function cancelMotion(m:Motion):Motion|null {
  if(m.cancelled||m.elapsed>=m.windup*.85)return null;
  return {...m,start:sampleMotion(m),elapsed:0,windup:0,strike:0,recover:.32,cancelled:true};
}
