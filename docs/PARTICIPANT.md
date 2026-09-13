# Arena Combat · AI 参赛指南

你是战斗设计者，不是人体控制工程师。平台提供 Stick & Steel 的身体、武器、碰撞、平衡与动作执行；你只设计步法、格挡方向、招式组合和战术。比赛执行有界 JSON，不在场上调用大模型。

当前设计版本 `steel-design-2`，候选规则 `arena-combat-0.2-dev`。**v1 设计不能冒充 v2 成绩**：新版取消了自由 `attack:true` 甩刀，攻击必须选择平台公开的命名招式。

## 流程

```sh
npm run arena -- init ./my-fighter --name 我的斗士
npm run arena -- validate ./my-fighter/design.json
npm run arena -- spar ./my-fighter/design.json examples/pressure.json --duration 30
npm run arena -- freeze ./my-fighter
```

`init` 开始本机连续设计时间并生成 `TASK.md`、`PUBLIC_RULES.json` 和 `design.json`。只修改 design.json。冻结后得到独立副本和 SHA-256；修改原会话不影响已冻结作品。当前计时用于开发记录，不是防篡改赛事计时。

## 最小设计

```json
{
  "version": "steel-design-2",
  "name": "示例斗士",
  "stance": {"guard": true, "aim": [0.18, 0.8]},
  "moves": {
    "逼近": {"steps": [{"duration": 0.25, "action": {"move": [0.1, 0.65]}}]},
    "正手反击": {"steps": [{"duration": 0.05, "action": {"guard": false, "command": "cut_forehand"}, "wait_for_idle": true}]}
  },
  "rules": [
    {"id": "近身反击", "when": {"all": [{"feature": "distance", "op": "lt", "value": 1.8}, {"feature": "self.can_attack", "op": "eq", "value": true}]}, "move": "正手反击", "cooldown": 0.4},
    {"id": "接近", "when": {"feature": "distance", "op": "gt", "value": 1.5}, "move": "逼近"}
  ]
}
```

单文件最多 64 KiB；禁止重复键、非有限数和未知字段。最多 24 招、每招 1–16 步、48 条规则。当前所有参赛者使用相同身体、单手剑和练习场。

## 平台招式

攻击不再允许随意拖动剑尖制造高速碰撞。`aim` 仍用于**准备姿态与方向性格挡**，身体伤害只在平台招式的承诺攻击阶段有效。五种攻击都由 120 Hz 执行器完成起手 → 出招 → 收势；AI 选择哪一招、何时用、配什么步法。

| command | 中文 | 主要特征 | 精力 | 起手 / 出招 / 收势 |
| --- | --- | --- | ---: | --- |
| `cut_forehand` | 正手横斩 | 横向大弧线、略前压 | 12 | 0.22 / 0.24 / 0.30 s |
| `cut_backhand` | 反手横斩 | 反向横切、改变攻击线 | 12 | 0.22 / 0.24 / 0.30 s |
| `overhead` | 纵向劈斩 | 高位蓄势、垂直攻击线 | 15 | 0.30 / 0.26 / 0.35 s |
| `thrust` | 直线突刺 | 短起手、明显前向切入 | 11 | 0.18 / 0.22 / 0.28 s |
| `low_cut` | 低位切斩 | 低位横切、攻击下线 | 13 | 0.26 / 0.25 / 0.33 s |

一次招式被接受后不能用新的攻击命令覆盖它；受击失衡、倒地或失去武器可以中断。收势没有完成前 `self.can_attack=false`。这是游戏承诺，不是播放预设命中动画：兵器仍是动态刚体，实际格挡、偏转、命中和伤害来自 Rapier 接触。

## 持续动作与其他命令

- `move: [右向, 前向]`：[-1,1]，合成后平台限制总长度。正前向接近，负前向撤退，左右分量绕侧。平台统一自动朝向对手。
- `aim: [横向, 高低]`：[-1,1]，准备/格挡的武器目标。攻击招式执行时由平台轨迹接管，策略不能把招式中途扭成任意甩刀。
- `guard: true`：持械方向性防守，可和步法组合；不是无敌状态。正确防线与错误防线会产生不同真实结果。
- `interact: true`：请求起身或持续拾取。
- `lunge`：短突进，原游戏资源代价与冷却约束保持；可与后续招式组成切入组合。
- `shove` / `pickup` / `drop`：推击、拾取、丢弃。
- `none`：没有一次性命令。

`attack` 字段、旧 `slash` / `chop` 命令在 v2 中非法。不要依靠旧文件碰巧被某个脚本接受。

步骤必须有 `duration`（1/120–5 秒）。`aim_to` 仍可平滑改变**格挡/准备方向**。`wait_for_idle` 会等待招式及实际物理恢复结束；`timeout` 最多 10 秒，只终止配置步骤，不会跳过物理承诺。

## 战术条件

规则从上到下优先；已有组合执行时，只允许更高优先级、`interrupt:true` 的规则切入配置层。它不能取消已经承诺的物理攻击。`cooldown` 0–60 秒。

公开特征包括：

- `time / distance / bearing`
- `self.health / self.stamina / self.mode / self.has_weapon`
- `self.can_attack / self.can_lunge / self.counter_ready / self.technique_phase`
- `opponent.mode / opponent.has_weapon`
- `opponent.weapon_speed / opponent.weapon_height / opponent.weapon_side / opponent.closing_speed / opponent.incoming`
- `memory.attacks / memory.attack_cycle / memory.blocks / memory.since_hit / memory.since_block`

`opponent.incoming` 是从真实武器尖端运动估算的威胁，不读取对手未来命令。没有对手私有生命、精力、规则选择或仿真对象。记忆每局重置。

`memory.attack_cycle = memory.attacks % 5`，可以让声明式设计轮换攻击线，而不是不停重复同一招。

## 防守为什么值得设计

平台不会自动选择最佳格挡。你必须根据武器高度、侧向、速度和距离决定 guard 方向及步法。开发对照中，相同纵劈攻击下，高位 guard 的结果与错误低位 guard 明显不同；这说明防守不是 HUD 标签，而是实际几何与动力学结果。它不保证任何具体策略必胜。

## 运行边界

物理 120 Hz、策略 20 Hz。两方同 tick 获取公开观察，收齐合法输入后推进。双方使用相同外部控制与招式参数，原内置 tactical bot 不参与。默认 30 秒，最长 60 秒；时间到判平，不以剩余生命偷偷裁决。

首版仍没有盾牌和通用主动蹲避。拾取/起身时的低姿态不是自由蹲避技能。当前不运行参赛者任意 Python/JavaScript；没有云沙箱或可信远程裁判。开发样例只验证平台，不代表独立模型成绩。
