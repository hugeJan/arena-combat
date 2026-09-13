# Arena Combat · AI 战斗设计指南 0.2

你设计的是打法，不是人体平衡算法。平台提供 Stick & Steel 的物理身体和定型剑招；你选择攻击线、时机、步法、防守架势、组合和局内适应。默认版本 `steel-design-2`，规则 `arena-combat-0.2-craft`。比赛只执行冻结配置，不调用大模型。

## 参赛流程

在项目根目录创建新会话，不复用旧规则的冻结作品：

```sh
npm run arena -- init ./my-fighter --name 我的斗士
npm run arena -- validate ./my-fighter/design.json
npm run arena -- spar ./my-fighter/design.json examples/pressure.json --duration 30
npm run arena -- freeze ./my-fighter
```

阅读生成的 TASK.md 和 PUBLIC_RULES.json，只编辑 design.json。冻结产生独立副本与 SHA-256；CLI 拒绝规则或内容摘要不匹配的作品。设计时间连续包含试战、休息和等待，是本机经过时间记录，不是防篡改竞赛计时。开发样例不是独立 AI 作品。

## 最小设计

```json
{
  "version": "steel-design-2",
  "name": "中线反击",
  "stance": {"guard": true, "guard_pose": "high", "move": [0, 0]},
  "moves": {
    "逼近": {"steps": [{"duration": 0.2, "action": {"move": [0.1, 0.65]}}]},
    "封线": {"steps": [{"duration": 0.25, "action": {"guard_pose": "inside", "move": [0.2, -0.25]}}]},
    "回刺": {"steps": [
      {"duration": 0.06, "action": {"guard": false, "command": "thrust", "move": [0, 0.1]}, "wait_for_idle": true},
      {"duration": 0.25, "action": {"guard": true, "guard_pose": "high", "move": [0, -0.4]}}
    ]}
  },
  "rules": [
    {"id": "格挡后反击", "when": {"all": [{"feature": "self.counter_ready", "op": "eq", "value": true}, {"feature": "self.can_attack", "op": "eq", "value": true}]}, "move": "回刺", "interrupt": true, "cooldown": 0.5},
    {"id": "发现来袭", "when": {"feature": "opponent.incoming", "op": "eq", "value": true}, "move": "封线", "interrupt": true, "cooldown": 0.3},
    {"id": "距离合适", "when": {"all": [{"feature": "distance", "op": "lt", "value": 1.65}, {"feature": "self.can_attack", "op": "eq", "value": true}]}, "move": "回刺", "cooldown": 1.1},
    {"id": "接近", "when": {"feature": "distance", "op": "gt", "value": 1.5}, "move": "逼近"}
  ]
}
```

这是语法示例，不保证获胜。丢失武器、倒地与低精力时的策略需要自己设计。最多64 KiB、24个组合、每组合16步、48条规则；禁止重复JSON键、未知字段、非有限数。

## 基础剑招

以下为普通单手剑的公开游戏时间，不是人体运动学标准。参数及完整目标轨迹来自 PUBLIC_RULES.json / src/arena/choreography.ts。

| command | 名称与攻击线 | 起手 | 出剑 | 收势 | 基础精力 |
| --- | --- | ---: | ---: | ---: | ---: |
| cut_right | 右势横斩，持械侧横向切入 | 0.32s | 0.30s | 0.42s | 15 |
| cut_left | 回身反斩，反方向横切 | 0.34s | 0.30s | 0.44s | 15 |
| overhead | 高位劈斩，由上向下 | 0.42s | 0.30s | 0.48s | 19 |
| thrust | 直线刺击，先收臂再伸出 | 0.27s | 0.27s | 0.43s | 12 |
| low_cut | 低位切斩，降低架势切下路 | 0.36s | 0.32s | 0.46s | 17 |

每招联动持械手、武器方向、躯干扭转和俯身，通过原有有限力矩身体执行。目标轨迹不是强制传送，真实身体受关节范围、接触与受击影响，命中可能滞后于出剑阶段。伤害必须来自实际接触和上游速度/刃口/部位规则；只有已承诺且尚在执行的招式能产生兵器伤害，包含收势中的残余随动。准备、取消后和纯待机碰触不能刷伤害。步法仍由你的 move 决定，不自动追击。

选择招式后，任意修改 aim 或切换 guard 都不能重写已承诺的轨迹。新招在忙碌时被拒绝，不自动排队。受击反震仍可能打断。真实格挡后的0.8秒 counter_ready 窗口可以把下一招起手乘0.72，基础精力不减；窗口不保证反击命中。

`slash` 是交替横斩的兼容别名；`chop` 是 overhead 的兼容别名。推荐显式指定五种剑招。新版拒绝 `attack:true`；旧版钢设计1仅做语法兼容，其持续攻击在新规则下变成一次边沿触发横斩，必须释放后才能再触发，不能当作旧规则作品继续计分。

## 防守、取消、步法

`stance` 是默认持续输入；步骤 action 按字段覆盖 stance，不相加。

| 字段/命令 | 语义 |
| --- | --- |
| move: [右向,前向] | 各[-1,1]，向量总长度归一到1。自动朝向当前对手是双方共用、公开的身体辅助 |
| guard: true | 持械格挡，不能和攻击命令同时请求，不是盾牌或无敌 |
| guard_pose | high / inside / outside / low。选取固定高、内、外、低架势，仍需要时机与距离；不替你自动选择正确方向 |
| aim: [横向,高低] | 各[-1,1]。用于非命名格挡方向、待机、下一次收势目标；guard_pose在guard=true时优先。不能在已承诺攻击途中任意改轨迹 |
| crouch: [0,1] | 统一降低架势，最大额外降低0.22m，目标变化率0.9m/s，并降低移动速度；改变真实受击位置，不获得无敌 |
| command: feint | 仅在起手前85%内且精力足够时取消，额外花4精力，保留原消耗并经历0.32s收势。绝不能取消已出剑攻击 |
| command: lunge | 前向短突进，18精力、0.24s执行、0.85s共享冷却；仍受实际身体、碰撞和姿态限制 |
| command: backstep | 快速后撤，14精力、0.20s执行、0.75s共享冷却；可配合攻击但不取消其承诺 |
| interact: true / pickup | 请求起身/拾取。原动作执行方式保留，不由平台主动替你决定 |
| shove / drop | 原推击/丢弃武器；推击必须实际靠近、空出手且有精力，不保证成功 |

普通移动目标速度1.55m/s，持械格挡时1.05m/s，受击与降低姿态会减慢。冲刺附加目标速度2.6m/s，而不是位置瞬移。低位架势在特定对照中可改变低斩暴露，但不等于每一次都发生兵器格挡；一次没有受伤也可能是对方挥空。不要把任何防守姿态理解成克制关系表里的必胜按钮。

## 组合执行

一步的 `duration` 在[1/120,5]秒，可有 `action`、`aim_to`、`wait_for_idle`、`timeout`。`aim_to` 在duration内改变待机/格挡方向，不覆盖定型招式轨迹。`wait_for_idle` 实际等待自己恢复到可攻击状态，精力不足也会继续等。默认timeout=max(3,duration+2)，最多10秒。

同一步的一次性命令被内核接受后不会重复发送。拒绝可重试，超时只放弃组合步骤，不改写物理状态。优先级打断与abort_when也只改变后续策略，不自动取消已承诺攻击；佯攻必须显式发送feint。

例如：overhead起手0.14秒（不要wait_for_idle）→ feint并wait_for_idle → 侧移后thrust。实际选中或取消都可能失败，需要检查反馈。

## 战术与公开特征

规则从上到下优先，只有更高优先级且interrupt=true的规则能打断正在进行的组合。cooldown从选中开始计；每招可有abort_when。条件为布尔值、all/any/not，或{feature,op,value}；最多六层，每组12项。数值比较lt/le/gt/ge/eq/ne，布尔/姿态仅eq/ne。

| 特征 | 含义 |
| --- | --- |
| time / distance / bearing | 模拟时间、实际骨盆平面距离、对手相对方位 |
| self.health / self.stamina / self.mode | 自己资源与upright/fallen/rising/falling/hanging状态 |
| self.has_weapon / self.can_attack / self.can_lunge / self.can_backstep | 自己持械与当前可请求状态；can_attack以最便宜剑招计算，重招仍可能因精力不足拒绝 |
| self.can_feint / self.is_windup / self.is_recovering / self.attack_progress | 自己当前剑招能否取消、阶段、整个招式进度[0,1] |
| self.counter_ready | 原内核真实格挡后的反击窗口 |
| opponent.mode / opponent.has_weapon | 对手可见身体与持械状态 |
| opponent.weapon_speed / opponent.weapon_height / opponent.weapon_side | 实际剑尖速度、相对自身骨盆高度、自己局部右方向上的剑尖坐标 |
| opponent.incoming | 尖端向自身接近速度>0.8m/s且三维距离<1.8m的估计，不读取未来指令 |
| memory.attacks / memory.blocks | 自己被接受的剑招次数 / 作为目标的兵器交锋事件次数；blocks不是保证每次都是成功格挡 |
| memory.since_hit / memory.since_block / memory.since_threat | 距上次自己受击/兵器交锋/估计威胁的模拟时间 |
| memory.high_threat_fraction | 来袭时尖端高于自身骨盆0.4m的指数平滑比例，初值0.5，每次来袭观察更新10% |

不提供对手私有生命、精力、未来招式或仿真对象，不运行用户代码、网络、文件系统或eval。记忆每局重置。结构化配置的条件和组合有界，不是任意机器学习程序。

## 观察与赛果

原Rapier身体120Hz，策略20Hz，双方读取同tick观察后提交动作。默认30秒、最多60秒；超时平局，不按剩余生命偷偷判胜。上游自动朝向、握持、恢复辅助公开对称；平台不会选择最佳格挡方向、追击或招式。

姿态帧含实际招式/阶段元数据，每4步保存；画面和碰撞同源。终局之后最多1.5秒物理收尾单独保存在presentationFrames，不继续策略或改变赛果/竞争帧。回放可以查看这段落地，但不是新的比赛时间。

本版本只面向桌面。动作实验室是明确标注的开发输入测试，不是AI作品或排名。浏览器可暂停且隐藏页面暂停，无人值守使用CLI。跨浏览器/Node逐位复现、所有接触顺序/同时失能公平性、更多对手平衡和独立模型验收尚未完成；本版本不发布正式跨模型总榜。
