import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG,TECHNIQUES,createMotion,sampleMotion,duration,phase,cancelMotion,restPose} from '../../src/arena/choreography';
import {parseDesign,validateAction} from '../../src/arena/schema';
import {readFileSync} from 'node:fs';
import {spectatorPose} from '../../src/viewer/spectator-camera';
import {Vector3} from 'three';
const flattened=(v:unknown):number[]=>typeof v==='number'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(flattened):[];
for(const k of TECHNIQUES){
  test(`${k}: continuous finite preparation, commitment, follow-through and recovery`,()=>{
    const home=restPose(),m=createMotion(k,home,home);assert.deepEqual(sampleMotion(m),home);
    const phases=new Set();for(let t=0;t<duration(m);t+=.004){m.elapsed=t;phases.add(phase(m));assert.ok(flattened(sampleMotion(m)).every(Number.isFinite));}
    assert.deepEqual([...phases],['windup','swing','recover']);
    for(const t of [m.windup,m.windup+m.strike]){m.elapsed=t-1e-7;const a=flattened(sampleMotion(m));m.elapsed=t+1e-7;const b=flattened(sampleMotion(m));assert.ok(a.every((x,i)=>Math.abs(x-b[i])<1e-4));}
    m.elapsed=duration(m);assert.ok(flattened(sampleMotion(m)).every((v,i)=>Math.abs(v-flattened(home)[i])<1e-12));assert.ok(CATALOG[k].cost>0);
  });
}
test('feint preserves the current pose and pays a full recovery, only during early windup',()=>{
  const m=createMotion('overhead',restPose(),restPose());m.elapsed=.14;const before=sampleMotion(m),cancelled=cancelMotion(m)!;
  assert.ok(cancelled);assert.deepEqual(sampleMotion(cancelled),before);assert.equal(duration(cancelled),.32);assert.equal(phase(cancelled),'recover');
  assert.equal(cancelMotion(cancelled),null);m.elapsed=m.windup*.85;assert.equal(cancelMotion(m),null);
});
test('new design accepts authored techniques, guards and crouch but refuses held attack',()=>{
  const src=JSON.parse(readFileSync(new URL('../../examples/pressure.json',import.meta.url),'utf8'));
  assert.equal(parseDesign(JSON.stringify(src)).version,'steel-design-2');
  src.stance.attack=true;src.stance.guard=false;assert.throws(()=>parseDesign(JSON.stringify(src)),/命名招式/);
  assert.throws(()=>validateAction({guard:true,command:'thrust'}));
  assert.throws(()=>validateAction({crouch:1.1}));assert.throws(()=>validateAction({guard_pose:'automatic'}));
});
test('spectator framing is symmetric and cannot flip when player labels swap',()=>{
  const a=new Vector3(-1,.9,.2),b=new Vector3(1.6,1.1,-.4);
  assert.deepEqual(spectatorPose(a,b,1.6),spectatorPose(b,a,1.6));
  assert.ok(spectatorPose(a,b,1.6,true).position.distanceTo(a)>spectatorPose(a,b,1.6).position.distanceTo(a));
});
