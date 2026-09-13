import {CATALOG,GUARDS} from './choreography';
export const RULES = Object.freeze({
  id:'arena-combat-0.2-craft', designVersion:'steel-design-2',
  upstream:'4c8e1d05a1ec47db93b687a81a82878727308b20',
  physicsHz:120, decisionSteps:6, replaySteps:4, maxDuration:60,
  arena:'yard', weapons:['sword','sword'], spares:false,
  ranked:false, techniques:CATALOG, guardPoses:GUARDS,
  motionRules:{cancelPreparationFraction:.85,cancelCost:4,cancelRecovery:.32,backstepCost:14,backstepDuration:.20,backstepCooldown:.75,crouchDrop:.22,crouchSpeed:.9},
  notice:'Assisted Stick & Steel bodies. Both seats use external input and player execution timings. Public auto-facing, grip/pose assistance retained; built-in tactical bot disabled. Weapon parry, not shield defense. Authored committed techniques with preparation/strike/recovery, limited torso targets, stance lowering and paid backsteps. Body damage only from physical contacts after commitment while the authored action is active, including residual follow-through. Legacy held attack triggers once until released. No shield or invulnerability.',
});
