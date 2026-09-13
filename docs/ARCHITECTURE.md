# 架构

## 三层职责

1. **身体执行层**：`.engine/stick-steel/` 由固定上游源码和可审计补丁生成。Rapier 120 Hz 负责主动布娃娃身体、动态兵器、碰撞、伤害和失能。
2. **招式执行层**：`src/arena/techniques.ts` 定义五种公开招式的起手、攻击线、收势、精力与受限步法；`src/engine/adapter.ts` 在每个物理步推进目标。参赛者只选择招式，不直接声明伤害、扭矩或任意攻击轨迹。
3. **战术层**：`src/arena/runtime.ts` 从公开观察和本局记忆按优先级/冷却选择动作组合。配置不读取对手未来输入或私有资源。

## 为什么取消自由甩刀

旧 `steel-design-1` 允许 `attack:true + aim_to` 连续驱动武器，AI 很容易把“战斗设计”退化成高速扫动参数。`steel-design-2` 删除该攻击入口：`aim` 只负责准备与防守方向，身体伤害在外部控制模式下要求 `f.attack && f.state === 'swing'`，而 `f.attack` 只由受信任招式执行器在 committed strike 阶段打开。

这不是动画命中盒。起手、剑路和收势是运动目标，实际剑仍是 Rapier 动态刚体，由有限力矩驱动；兵器碰撞可以偏转招式，身体接触才进入原 damage 规则。

## 招式承诺

每个招式有 windup / strike / recovery。接受后：

- 配置层不能用新攻击覆盖活跃招式；
- 策略的普通 `move` 仅以受限比例混入平台步法；
- `aim` 和 `guard` 在招式期间不改变攻击轨迹；
- 受击失衡、倒地、失械可物理中断；
- 完成招式及底层恢复前 `self.can_attack=false`。

因此 AI 比较的是时机、攻击线、步法、防守和组合，不是“谁能发更疯的连续坐标”。

## 同 tick 与记录

`src/engine/adapter.ts` 先取得两个观察；`src/arena/match.ts` 每 6 个物理步（20 Hz）同时计算两份配置，再一次性验证和提交。回放每 4 步记录实际姿态。输入、反馈、战术 trace、接触、姿态和结果一同归档。

## 桌面观战

`src/viewer/stage.ts` 复用上游 avatar、weapon-view、effects、audio 与练习场素材。默认镜头改为稳定的双人 spectator camera，以双方中点和距离构图，不再跟随红方。实际碰撞驱动 impact label、声音和轻微镜头冲击；渲染不影响胜负。

开赛后网页进入 desktop fight view，隐藏配置侧栏，把主要空间交给竞技场。项目不再投入手机/触控适配；正常桌面窗口缩放只是基础网页行为。

## 冻结与身份

`prepare-engine.mjs` 校验 `vendor/stick-steel` 原始字节，再应用 `patches/external-control.json` 生成 `.engine`。规则、招式目录、适配器、策略运行时、依赖锁和补丁共同进入候选身份哈希。v1 与 v2 规则身份不同，旧作品不能沿用成绩或设计时间。

当前仍是本机开发 Benchmark：没有任意用户代码沙箱、远程裁判、跨环境确定性承诺、盾牌或通用蹲避。
