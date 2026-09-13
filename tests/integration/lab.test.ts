import test from 'node:test';
import assert from 'node:assert/strict';
import {initPhysics} from '../../src/engine/adapter';
await initPhysics();

// The action lab stops on an exact simulation tick, not a delayed DOM click.
test('laboratory can freeze each real windup without advancing beyond the selected tick', async () => {
  const {MotionLab}=await import('../../src/viewer/lab');
  for(const kind of ['cut_right','cut_left','overhead','thrust','low_cut'] as const){
    const lab=new MotionLab(kind,'open','windup');
    try{while(lab.step()){};assert.equal(lab.engine.tick,lab.stopTick);assert.equal(lab.engine.simulation.fighters[0].motion?.kind,kind);assert.equal(lab.engine.simulation.fighters[0].state,'windup');}
    finally{lab.dispose();}
  }
});
