import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDesign,validateDesign} from '../../src/arena/schema';
import {Designer} from '../../src/arena/runtime';
import {neutralAction,type Observation} from '../../src/arena/types';
const source=readFileSync(new URL('../../examples/pressure.json',import.meta.url),'utf8');
const minimal=()=>({version:'steel-design-1',name:'test',stance:{},moves:{a:{steps:[{duration:.1,action:{command:'slash'}}]}},rules:[{id:'a',when:true,move:'a'}]});
const observation=(tick:number):Observation=>({tick,time:tick/120,self:{health:100,stamina:100,mode:'upright',has_weapon:true,can_attack:true,can_lunge:true,counter_ready:false,position:[0,1,0],velocity:[0,0,0],heading:0,feedback:null},opponent:{mode:'upright',has_weapon:true,position:[0,1,2],velocity:[0,0,0],weapon_tip:[0,1,1],weapon_velocity:[0,0,0]},events:[]});
test('examples validate and are immutable snapshots',()=>{const d=parseDesign(source);assert.ok(Object.isFrozen(d));assert.ok(Object.isFrozen(d.moves));});
test('duplicate JSON keys are rejected, including escaped aliases',()=>{assert.throws(()=>parseDesign('{"name":1,"n\\u0061me":2}'),/重复键/);});
test('malformed, huge, and deeply nested JSON rejected',()=>{for(const s of ['{', 'x','['.repeat(40)+'0'+']'.repeat(40),' '.repeat(65537)])assert.throws(()=>parseDesign(s));});
test('nonfinite values and unknown fields rejected',()=>{const x:any=minimal();x.stance.move=[Infinity,0];assert.throws(()=>validateDesign(x));x.stance={health:999};assert.throws(()=>validateDesign(x));});
test('private enemy features and reserved move names rejected',()=>{const x:any=minimal();x.rules[0].when={feature:'opponent.health',op:'lt',value:100};assert.throws(()=>validateDesign(x));x.rules[0].when=true;x.moves.constructor={steps:[{duration:.1}]};assert.throws(()=>validateDesign(x));});
test('effective inherited action is validated',()=>{const x:any=minimal();x.stance.guard=true;assert.throws(()=>validateDesign(x),/互斥/);});
test('unresolved references rejected',()=>{const x:any=minimal();x.rules[0].move='missing';assert.throws(()=>validateDesign(x));});
test('one-shot command waits for actual feedback, then is not repeated',()=>{
 const d=new Designer(minimal());assert.equal(d.decide(observation(0)).command,'slash');
 const o=observation(6);o.self.feedback={tick:0,command:'slash',accepted:true,reason:'accepted'};
 assert.equal(d.decide(o).command,'none');
});
test('rejected command can retry instead of pretending success',()=>{
 const d=new Designer(minimal());d.decide(observation(0));const o=observation(6);o.self.feedback={tick:0,command:'slash',accepted:false,reason:'busy'};
 assert.equal(d.decide(o).command,'slash');
});
test('deterministic interpolation across an authored swing',()=>{
 const x:any=minimal();x.moves.a.steps=[{duration:1,action:{aim:[-1,1],attack:true},aim_to:[1,-1]}];const d=new Designer(x);
 assert.deepEqual(d.decide(observation(0)).aim,[-1,1]);assert.deepEqual(d.decide(observation(60)).aim,[0,0]);
});
test('runtime cannot consume same or earlier observation twice',()=>{const d=new Designer(minimal());d.decide(observation(1));assert.throws(()=>d.decide(observation(1)),/monotonically/);});
test('movement vector normalized at the trusted boundary',()=>{const x:any=minimal();x.stance.move=[1,1];const a=new Designer(x).decide(observation(0));assert.ok(Math.hypot(...a.move)<=1+1e-12);});
test('interrupt priority can switch tactics without mutating physics',()=>{
 const x:any=minimal();x.moves.rest={steps:[{duration:.2,action:{move:[0,-1]}}]};x.rules.unshift({id:'rest',when:{feature:'self.stamina',op:'lt',value:30},move:'rest',interrupt:true});
 const d=new Designer(x);d.decide(observation(0));const o=observation(6);o.self.stamina=20;assert.equal(d.decide(o).move[1],-1);assert.equal(d.trace.rule,'rest');
});
