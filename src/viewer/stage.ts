import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createAvatar} from '../../.engine/stick-steel/lib/duel/avatar';
import {createWeaponViews} from '../../.engine/stick-steel/lib/duel/weapon-view';
import {DuelCamera} from '../../.engine/stick-steel/lib/duel/camera';
import {createImpactEffects} from '../../.engine/stick-steel/lib/duel/effects';
import {createCombatAudio} from '../../.engine/stick-steel/lib/duel/audio';
import {createImpactLabels} from '../../.engine/stick-steel/lib/duel/impact-labels';
import type {DuelSimulation,DuelHit} from '../../.engine/stick-steel/lib/duel/physics';

/** Spectator shell around the original game's drawing, camera, weapons and effects. */
export class Stage {
  private renderer:T.WebGLRenderer;
  private scene=new T.Scene();
  private camera=new T.PerspectiveCamera(50,1,.12,60);
  private follow=new DuelCamera();
  private avatars:ReturnType<typeof createAvatar>[]=[];
  private weapons:ReturnType<typeof createWeaponViews>;
  private effects:ReturnType<typeof createImpactEffects>;
  private labels:ReturnType<typeof createImpactLabels>;
  private observer:ResizeObserver;
  private environment:T.WebGLRenderTarget;
  private meshes:T.Mesh[]=[];
  readonly audio:ReturnType<typeof createCombatAudio>;
  private sim:DuelSimulation|null=null;
  constructor(private host:HTMLElement){
    this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.renderer.domElement.setAttribute('aria-label','Stick & Steel AI 对战场景');host.prepend(this.renderer.domElement);
    this.scene.background=new T.Color('#efeeeb');this.scene.fog=new T.Fog('#efeeeb',15,38);
    const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
    const hemi=new T.HemisphereLight('#ffffff','#a9a6a0',2.4),sun=new T.DirectionalLight('#fff8e8',3.2);
    sun.position.set(-3,8,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:22});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;this.scene.add(hemi,sun);
    const floor=new T.Mesh(new T.PlaneGeometry(70,70),new T.MeshStandardMaterial({color:'#e9e7e0',roughness:.92}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);this.meshes.push(floor);
    for(const [x,z,w,d] of [[-3.7,0,.16,7.4],[3.7,0,.16,7.4],[0,-3.7,7.4,.16],[0,3.7,7.4,.16]]){
      const box=new T.Mesh(new T.BoxGeometry(w,.44,d),new T.MeshStandardMaterial({color:'#b7c3ce',roughness:.92}));box.position.set(x,.22,z);box.castShadow=box.receiveShadow=true;this.scene.add(box);this.meshes.push(box);
    }
    for(const r of [2.85,2.92]){const ring=new T.Mesh(new T.RingGeometry(r,r+.007,128),new T.MeshBasicMaterial({color:'#afbdcb',transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.y=.004;this.scene.add(ring);this.meshes.push(ring);}
    this.weapons=createWeaponViews(this.scene,this.environment.texture);this.effects=createImpactEffects(this.scene);this.labels=createImpactLabels(host,this.camera);this.audio=createCombatAudio(this.camera);this.audio.mute(true);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
  }
  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(w<=0||h<=0)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  bind(sim:DuelSimulation){this.avatars.forEach(a=>a.dispose());this.weapons.reset();this.effects.reset();this.labels.reset();this.sim=sim;
    this.avatars=sim.fighters.map((f,i)=>createAvatar(this.scene,f,i===0?'#d9252b':'#305ca8'));
    const a=new T.Vector3().copy(sim.fighters[0].rig.parts.get('pelvis')!.body.translation()),b=new T.Vector3().copy(sim.fighters[1].rig.parts.get('pelvis')!.body.translation());
    this.follow.reset(a,sim.fighters[0].heading,b);
  }
  hit(hit:DuelHit){this.effects.hit(hit);this.labels.hit(hit);if(hit.kind!=='floor'){this.audio.play(hit.kind==='block'?'clash':hit.kind==='hit'?'hit':'cut',hit.point,.4);this.audio.react(hit.kind==='block'?'parry':'hit');}}
  draw(dt:number){if(!this.sim)return;const sim=this.sim;
    this.avatars.forEach((a,i)=>a.update(sim.fighters[i]));this.weapons.update(sim.weapons);
    const a=new T.Vector3().copy(sim.fighters[0].rig.parts.get('pelvis')!.body.translation()),b=new T.Vector3().copy(sim.fighters[1].rig.parts.get('pelvis')!.body.translation());
    this.follow.update(a,sim.fighters[0].heading,Math.min(dt,.05),false,b);this.camera.position.copy(this.follow.position);this.camera.lookAt(this.follow.target);
    this.effects.update(Math.min(dt,.05),sim.fighters,sim.time,'yard');this.labels.update(Math.min(dt,.05),this.host.clientWidth,this.host.clientHeight,sim.fighters);
    this.audio.ambience(sim.phase==='fighting',document.hidden);this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.observer.disconnect();this.avatars.forEach(a=>a.dispose());this.weapons.dispose();this.effects.dispose();this.labels.dispose();this.audio.dispose();this.environment.dispose();this.meshes.forEach(m=>{m.geometry.dispose();(m.material as T.Material).dispose();});this.renderer.dispose();this.renderer.domElement.remove();}
}
