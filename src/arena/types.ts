export type Slot = 0 | 1;
export type Command = 'none' | 'slash' | 'chop' | 'lunge' | 'shove' | 'pickup' | 'drop';
export type Mode = 'upright' | 'fallen' | 'rising' | 'falling' | 'hanging';
export type Vector = [number, number, number];
export type Action = {
  move: [number, number]; // Local [rightward, forward], magnitude <= 1 after host clamp.
  aim: [number, number];
  attack: boolean;
  guard: boolean;
  interact: boolean;
  command: Command;
};
export type ActionPatch = Partial<Action>;
export type Feedback = {tick: number; command: Command; accepted: boolean; reason: string};
export const FEATURES = {
  'time': 'number', 'distance': 'number', 'bearing': 'number',
  'self.health': 'number', 'self.stamina': 'number', 'self.mode': 'mode',
  'self.has_weapon': 'boolean', 'self.can_attack': 'boolean', 'self.can_lunge': 'boolean',
  'self.counter_ready': 'boolean',
  'opponent.mode': 'mode', 'opponent.has_weapon': 'boolean',
  'opponent.weapon_speed': 'number', 'opponent.weapon_height': 'number', 'opponent.incoming': 'boolean',
  'memory.attacks': 'number', 'memory.blocks': 'number',
  'memory.since_hit': 'number', 'memory.since_block': 'number'
} as const;
export type Feature = keyof typeof FEATURES;
export type FeatureValues = Record<Feature, number | boolean | string>;
export type Condition = boolean | {all: Condition[]} | {any: Condition[]} | {not: Condition} |
  {feature: Feature; op: 'lt' | 'le' | 'gt' | 'ge' | 'eq' | 'ne'; value: number | boolean | Mode};
export type Step = {
  duration: number;
  action?: ActionPatch;
  aim_to?: [number, number];
  wait_for_idle?: boolean;
  timeout?: number;
};
export type Move = {steps: Step[]; abort_when?: Condition};
export type Rule = {id: string; when: Condition; move: string; cooldown?: number; interrupt?: boolean};
export type Design = {
  version: 'steel-design-1';
  name: string;
  description?: string;
  stance: ActionPatch;
  moves: Record<string, Move>;
  rules: Rule[];
};
export type Observation = {
  tick: number; time: number;
  self: {health: number; stamina: number; mode: Mode; has_weapon: boolean;
    can_attack: boolean; can_lunge: boolean; counter_ready: boolean;
    position: Vector; velocity: Vector; heading: number; feedback: Feedback | null};
  opponent: {mode: Mode; has_weapon: boolean; position: Vector; velocity: Vector;
    weapon_tip: Vector; weapon_velocity: Vector};
  events: {kind: string; actor: 'self' | 'opponent'; target: 'self' | 'opponent'; time: number}[];
};
export type Trace = {rule: string | null; move: string | null; step: number | null; event: string};
export const neutralAction = (): Action => ({move:[0,0], aim:[.18,.8], attack:false, guard:false, interact:false, command:'none'});
export const clone = <T>(value: T): T => structuredClone(value);
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
