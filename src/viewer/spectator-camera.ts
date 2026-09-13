import {Vector3} from 'three';
/** Symmetric spectator camera. Swapping player identities cannot flip the view. */
export function spectatorPose(a:Vector3,b:Vector3,aspect:number,wide=false){
  const target=a.clone().add(b).multiplyScalar(.5);target.y=Math.max(.78,Math.min(1.2,target.y+.08));
  const span=Math.hypot(a.x-b.x,a.z-b.z);
  const distance=Math.max(wide?6.5:4.1,(span+2.35)/(2*Math.tan(24*Math.PI/180)*Math.max(.85,aspect))+.9);
  return {target,position:target.clone().add(new Vector3(.18,distance*.35,distance))};
}
export class SpectatorCamera {
  position=new Vector3();target=new Vector3();wide=false;private initialized=false;
  update(a:Vector3,b:Vector3,aspect:number,dt:number,snap=false){
    const p=spectatorPose(a,b,aspect,this.wide),k=snap||!this.initialized?1:1-Math.exp(-Math.max(0,Math.min(.1,dt))*4);
    this.position.lerp(p.position,k);this.target.lerp(p.target,k);this.initialized=true;
  }
}
