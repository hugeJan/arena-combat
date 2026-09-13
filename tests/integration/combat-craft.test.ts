import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {ArenaEngine,initPhysics} from '../../src/engine/adapter';
import {neutralAction} from '../../src/arena/types';
import {Match} from '../../src/arena/match';
import {TECHNIQUES} from '../../src/arena/choreography';
import {physicalTrial} from '../helpers/physical-trial';
await initPhysics();
const quiet=()=>neutralAction();
function withEngine(fn:(e:ArenaEngine)=>void){const e=new ArenaEngine();try{e.start();fn(e);}finally{e.dispose();}}
test('accepted technique cannot be replaced by a spammed command or a guard flag',()=>withEngine(e=>{
  const a={...quiet(),command:'overhead' as const};assert.ok(e.submit([a,quiet()])[0].accepted);
  const energy=e.simulation.fighters[0].stamina;
  assert.equal(e.submit([{...a,command:'thrust'},quiet()])[0].accepted,false);
  assert.equal(e.simulation.fighters[0].stamina,energy);
  e.submit([{...quiet(),guard:true},quiet()]);e.step();assert.equal(e.simulation.fighters[0].motion?.kind,'overhead');assert.equal(e.simulation.fighters[0].guard,false);
}));
test('legacy held attack does not repeatedly restart a stroke',()=>withEngine(e=>{
  e.submit([{...quiet(),attack:true},quiet()]);let starts=0,last=false;
  for(let i=0;i<420;i++){e.step();const active=!!e.simulation.fighters[0].motion;if(active&&!last)starts++;last=active;}
  assert.equal(starts,1);assert.equal(e.simulation.fighters[0].motion,undefined);
}));
test('feint cancels only early preparation and cannot bypass paid recovery',()=>withEngine(e=>{
  e.submit([{...quiet(),command:'overhead'},quiet()]);for(let i=0;i<12;i++)e.step();const before=e.simulation.fighters[0].stamina;
  assert.ok(e.submit([{...quiet(),command:'feint'},quiet()])[0].accepted);
  assert.ok(e.simulation.fighters[0].motion?.cancelled);assert.equal(e.simulation.fighters[0].stamina,before-4);
  assert.equal(e.submit([{...quiet(),command:'thrust'},quiet()])[0].accepted,false);
  for(let i=0;i<60;i++)e.step();assert.ok(e.submit([{...quiet(),command:'thrust'},quiet()])[0].accepted);
  for(let i=0;i<38;i++)e.step();assert.equal(e.submit([{...quiet(),command:'feint'},quiet()])[0].accepted,false);
}));
test('low stamina refuses authored attack without manufacturing an accepted action',()=>withEngine(e=>{
  e.simulation.fighters[0].stamina=5;assert.equal(e.submit([{...quiet(),command:'overhead'},quiet()])[0].accepted,false);assert.equal(e.simulation.fighters[0].motion,undefined);
}));
test('backstep moves away, costs stamina and cannot repeat during cooldown',()=>withEngine(e=>{
  const f=e.simulation.fighters[0],start=new Vector3().copy(f.rig.parts.get('pelvis')!.body.translation());
  assert.ok(e.submit([{...quiet(),command:'backstep'},quiet()])[0].accepted);assert.equal(f.stamina,86);
  assert.equal(e.submit([{...quiet(),command:'backstep'},quiet()])[0].accepted,false);
  for(let i=0;i<60;i++)e.step();assert.ok(f.rig.parts.get('pelvis')!.body.translation().x<start.x-.15);
}));
test('crouch changes actual body height and can return to standing',()=>withEngine(e=>{
  const f=e.simulation.fighters[0],head=()=>f.rig.parts.get('head')!.body.translation().y;const y=head();
  e.submit([{...quiet(),crouch:1},quiet()]);for(let i=0;i<120;i++)e.step();assert.ok(head()<y-.13);
  e.submit([quiet(),quiet()]);for(let i=0;i<150;i++)e.step();assert.ok(head()>y-.07);assert.equal(f.mode,'upright');
}));
test('high guard physically intercepts an overhead that hits an open defender',()=>{
  const open=physicalTrial('overhead','open'),guard=physicalTrial('overhead','high');
  assert.ok(open.events.some(e=>e.kind==='hit'));assert.ok(guard.events.some(e=>e.kind==='block'));
  assert.ok(guard.health[1]>open.health[1]+8);
});
test('inside guard physically intercepts a thrust; incorrect outside line does not',()=>{
  const inside=physicalTrial('thrust','inside'),outside=physicalTrial('thrust','outside');
  assert.ok(inside.events.some(e=>e.kind==='block'));assert.ok(inside.health[1]>outside.health[1]+5);
});
test('ducking is not invulnerability: lower exposure to a horizontal cut, vulnerable to low cut',()=>{
  const open=physicalTrial('cut_right','open'),duck=physicalTrial('cut_right','duck'),low=physicalTrial('low_cut','duck');
  assert.ok(duck.initialHead<open.initialHead-.13);assert.ok(duck.health[1]>open.health[1]+8);assert.ok(low.health[1]<duck.health[1]);
});
test('lower guard posture changes actual exposure to low cut, without claiming an automatic parry',()=>{
  const high=physicalTrial('low_cut','high'),low=physicalTrial('low_cut','low');
  assert.ok(low.health[1]>high.health[1]+30);assert.ok(high.events.some(e=>e.damage>0));
});
test('retreat can avoid a committed strike by changing actual distance',()=>{
  const open=physicalTrial('overhead','open'),retreat=physicalTrial('overhead','retreat');
  assert.ok(retreat.health[1]>open.health[1]+8);
});
test('the five actions produce different measured physical blade paths, not only different labels',()=>{
  const paths=TECHNIQUES.map(k=>{const t=physicalTrial(k,'open',3.0);assert.ok(t.accepted[0].accepted);assert.ok(t.samples.flatMap(s=>s.tip).every(Number.isFinite));return t.samples.map(s=>s.tip);});
  for(let a=0;a<paths.length;a++)for(let b=a+1;b<paths.length;b++){
    const rms=Math.sqrt(paths[a].reduce((sum,p,i)=>sum+p.reduce((s,v,j)=>s+(v-paths[b][i][j])**2,0),0)/paths[a].length);
    assert.ok(rms>.06,`${TECHNIQUES[a]} and ${TECHNIQUES[b]} paths must differ, got ${rms}`);
  }
});
test('post-result fall cannot change the competitive result, inputs, contacts or frames',()=>{
  const load=(s:string)=>JSON.parse(readFileSync(new URL(`../../examples/${s}.json`,import.meta.url),'utf8'));
  const m=new Match(load('pressure'),load('counter'),2);
  try{
    while(m.step());const before=structuredClone({outcome:m.archive.outcome,decisions:m.archive.decisions,frames:m.archive.frames,events:m.archive.events}),tick=m.engine.tick;
    while(m.postrollStep());assert.deepEqual({outcome:m.archive.outcome,decisions:m.archive.decisions,frames:m.archive.frames,events:m.archive.events},before);
    assert.equal(m.engine.tick,tick);assert.equal(m.archive.presentationFrames?.length,45);assert.equal(m.postrollStep(),false);
  }finally{m.dispose();}
});
