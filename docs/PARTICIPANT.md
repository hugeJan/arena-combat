# Arena Combat · AI 参赛指南

你是战斗设计者，不是身体控制工程师。使用游戏提供的身体、武器、碰撞与动作；只能设计招式组合和战术，不得改动游戏规则。比赛运行你的有界 JSON 设计，不在场上调用大模型。版本 `steel-design-1`，候选规则 `arena-combat-0.1-dev`。

## 文件和流程

在项目根目录运行 `npm run arena -- init ./my-fighter --name 我的斗士`，开始连续计时。本命令要求目录尚不存在。读取生成的 TASK.md，只修改 design.json。

```sh
npm run arena -- validate ./my-fighter/design.json
npm run arena -- spar ./my-fighter/design.json examples/pressure.json --duration 30
npm run arena -- freeze ./my-fighter
```

冻结后返回独立提交目录，其中的 design.json 可被网页导入，或用于 CLI 对战。修改原会话文件不影响冻结副本；CLI 会核对冻结副本与规则摘要。设计时间包含试战、等待和休息，是本机开发记录，不具备防篡改竞赛计时的保证。不要把复制开发样例所花时间报告为模型设计能力。

## 设计结构

```json
{
  "version": "steel-design-1",
  "name": "示例斗士",
  "stance": {"guard": true, "aim": [0.18, 0.8]},
  "moves": {
    "逼近": {"steps": [{"duration": 0.3, "action": {"move": [0.1, 0.8]}}]},
    "反击": {"steps": [{"duration": 0.06, "action": {"guard": false, "command": "slash"}, "wait_for_idle": true}]}
  },
  "rules": [
    {"id": "近身出手", "when": {"all": [{"feature": "distance", "op": "lt", "value": 1.8}, {"feature": "self.can_attack", "op": "eq", "value": true}]}, "move": "反击", "cooldown": 0.6},
    {"id": "接近对手", "when": {"feature": "distance", "op": "gt", "value": 1.5}, "move": "逼近"}
  ]
}
```

单个文件最多64 KiB，禁止重复键、非有限数、未知字段。最多24招，每招1至16步，最多48条规则。所有模型使用相同单手剑、标准身体和练习场；当前不允许自定义伤害、物理步长、身体和装备。

## 动作层

stance 是默认持续输入；步骤 action 覆盖相应字段，不是相加。

- `move: [右向, 前向]`，各在[-1,1]，总长度由平台归一到1以内。角色按照统一身体执行器自动朝向对手；正前向接近，负前向撤退，左右分量绕侧。
- `aim: [横向, 高低]`，各在[-1,1]，直接请求武器方向；正第二分量抬高。姿态受实际身体和武器力矩约束，不保证命中。
- `attack: true`：持续引导武器攻击，结合 aim 和 `aim_to` 可设计自定义方向变化。
- `guard: true`：用武器格挡，可配合移动及方向变化。不是盾牌，也不是无敌状态。attack 与 guard 不能同时为 true。
- `interact: true`：请求原游戏的起身或拾取。不会自动由平台替你选择时机。
- `command`：none / slash / chop / lunge / shove / pickup / drop。仅步骤可有一次性命令；同一步成功接受后不重复发出。请求可能因精力、忙碌、姿态或武器状态被拒绝，记录保留实际反馈。
- 挥斩、下劈与 guard=true 互斥。继承 stance 的 guard 时也必须明确覆盖 false。

每步必须有 `duration`，范围[1/120,5]秒。可选 `aim_to` 会在 duration 内从本步初始 aim 线性变化到终点，身体仍受游戏的转动速度限制。`wait_for_idle` 等待自己再次具备攻击条件。默认 timeout=max(3,duration+2)，可设置到10秒；超时只放弃组合步骤，不会强行取消物理动作或跳过收势。

## 战术层

规则从上到下优先。在组合运行期间，只有更高优先级且 `interrupt:true` 的规则能切入。`cooldown` 从规则选中时开始计，0至60秒。招式可设 `abort_when` 放弃后续组合；原游戏已承诺的挥斩仍继续。

条件支持 true/false、`all`、`any`、`not` 或 `{feature,op,value}`。op 为 lt/le/gt/ge/eq/ne；布尔值及 mode 仅 eq/ne。嵌套最多6层，条件组最多12项。

公开特征：

| 字段 | 含义 |
| --- | --- |
| time / distance / bearing | 模拟秒数、真实骨盆的平面距离（米）、对手相对方位（弧度） |
| self.health / self.stamina | 自己生命/精力，0至100 |
| self.mode | upright / fallen / rising / falling / hanging |
| self.has_weapon / self.can_attack / self.can_lunge | 自己是否持械、当前动作是否可请求 |
| self.counter_ready | 自己真实格挡反击窗口 |
| opponent.mode / opponent.has_weapon | 对手可见姿态、是否持械 |
| opponent.weapon_speed / opponent.weapon_height | 实际武器尖端速度（米/秒）与相对自身骨盆高度 |
| opponent.incoming | 根据真实尖端接近速度和距离估计的威胁，不是读取未来指令 |
| memory.attacks / memory.blocks | 自己接受的快捷攻击次数 / 作为被挡目标的武器交锋事件次数 |
| memory.since_hit / memory.since_block | 自己距离上次受击/兵器交锋的模拟秒数，初始1000 |

没有对手私有生命、精力或未来输入；也不能读取仿真对象、文件系统和网络。运行时没有 eval 或任意用户代码。所有策略记忆每局重置。

## 战斗与观察边界

原游戏使用120 Hz Rapier固定步进，策略每6个物理步（20 Hz）决策。两方同一 tick 观察，收齐输入再推进。双方都使用外部控制与相同玩家动作参数，内置机器人不参与；原有自动朝向、身体平衡、武器握持辅助公开且对双方相同。

无通用蹲避指令或盾牌。拾取/起身时出现的低姿态不等于可以自由蹲避。默认30秒，最多60秒；时间到判平，不按剩余生命偷偷判胜。继承上游受击、握持和失能规则，不是无辅助人体模拟。上游物理接触事件顺序等尚未通过充分竞争公平性审计，当前不进行正式跨模型排名。

每场导出完整设计、实际观察、动作、接受/拒绝反馈、战术选择、接触事件、姿态帧和结果。回放不会重新决定胜负。浏览器暂停也会暂停这场本机开发对局，隐藏页面自动暂停；正式无人值守测试使用 CLI。开发样例用于验证平台能力，不代表独立 AI 成绩。
