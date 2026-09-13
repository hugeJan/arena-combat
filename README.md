# Arena Combat

**基于 Stick & Steel 的 AI 战斗设计竞技场。平台提供身体与可靠招式，AI 负责组合招式、选择时机与设计战术。**

当前开发候选 `0.2` 的重点不是继续扩装备，而是解决第一版最明显的问题：斗士不能再靠连续改武器朝向制造“乱挥刀”。正式攻击必须调用平台公开的命名招式，每一招都有明确起手、攻击线、承诺阶段、精力代价与收势；防守和脚步仍由 AI 决定。

## 立即运行

需要 Node.js **22.13+**：

```sh
git clone https://github.com/hugeJan/arena-combat.git
cd arena-combat
npm ci
npm run dev
```

打开 **http://127.0.0.1:5180/**。Mac 也可运行根目录 `启动竞技场.command`。

赛前页面用于编辑或导入两份设计；开赛后进入纯桌面观战模式，配置栏退出画面，把主要空间交给竞技场。比赛结束可以暂停、回放、拖动时间轴并导出完整记录。

> 本项目以桌面观战和视频录制为目标，不再投入手机/触控适配。正常桌面窗口缩放仍应可用。

## 0.2 招式系统

首批平台招式全部驱动真实 Stick & Steel 武器刚体，不是播放命中动画：

| 命令 | 招式 | 起手 / 出招 / 收势 | 精力 |
| --- | --- | --- | ---: |
| `cut_forehand` | 正手横斩 | 0.22 / 0.24 / 0.30 s | 12 |
| `cut_backhand` | 反手横斩 | 0.22 / 0.24 / 0.30 s | 12 |
| `overhead` | 纵向劈斩 | 0.30 / 0.26 / 0.35 s | 15 |
| `thrust` | 直线突刺 | 0.18 / 0.22 / 0.28 s | 11 |
| `low_cut` | 低位切斩 | 0.26 / 0.25 / 0.33 s | 13 |

招式执行期间不能重复提交另一个攻击绕过承诺。攻击准备时的脚步、打击阶段的推进以及收势撤回由平台统一执行；AI 仍然负责什么时候选哪一招、是否先格挡/侧移/撤步、何时突进以及如何针对对手改变策略。

旧版自由 `attack:true` 和 `slash` 命令在 `steel-design-2` 中被拒绝。普通 `aim` 只负责待机/格挡姿态，不再能偷偷变成未命名的伤害挥击。

## 让 AI 参加

```sh
npm run arena -- init ./my-fighter --name 我的斗士
```

把生成的 `my-fighter/TASK.md` 交给 Codex、DeepSeek Harness 等本地 AI 工具。AI 阅读公开指南并修改 `design.json`：

```sh
npm run arena -- validate ./my-fighter/design.json
npm run arena -- spar ./my-fighter/design.json examples/pressure.json --duration 30
npm run arena -- freeze ./my-fighter
```

完整规则与可用观察见 [参赛指南](docs/PARTICIPANT.md)。两个设计换位对战：

```sh
npm run arena -- match examples/pressure.json examples/counter.json --swap --duration 30 --out outputs/my-first-pair
```

CLI 尽快计算；浏览器按现实时间调度同一个 120 Hz 物理内核。两者当前仍不能混用为正式排名，因为跨运行环境逐位一致性尚未解决。

## 三层职责

- **身体执行层**：固定 Stick & Steel / Rapier 身体、握持、碰撞、伤害与基础步态。
- **招式执行层**：平台提供经过验证的攻击轨迹、起手、承诺和收势，不替 AI 选招。
- **战术层**：AI 根据公开观察、历史、优先级与冷却选择格挡、脚步、突进和命名招式。

观战端只读取同一物理世界的姿态与接触。命中、格挡、受击和赛果不能由特效或镜头修改。

## 当前验证范围

本地开发环境已经验证：

- 26 项平台测试通过；
- 6 项保留的上游核心物理测试通过；
- TypeScript / Vite 生产构建通过；
- 五种招式的实际剑尖轨迹在物理解算后具有明显不同的横向/纵向范围；
- 对同一纵向劈斩，匹配的高位防守与错误低位防守产生明显不同的实际受击结果；
- 两份开发样例会在完整 30 秒对局中实际轮换多种招式，并产生真实兵器碰撞和命中。

这些是开发对照，不是独立模型成绩。桌面新镜头和界面必须继续经过真实浏览器截图/观感检查后，才能宣称观赏性达到目标。实际证据和未完成项见 [状态](docs/STATUS.md)。

## 尚未完成

- 盾牌与通用主动蹲避；
- 更丰富的假动作、组合技与不同武器招式库；
- 独立模型只读公开资料完成设计、试战、修改的正式验收；
- 跨浏览器/Node/机器的确定性；
- 可信远程裁判与正式排行榜。

目前仍是开发候选，不把“测试通过”冒充“比赛已经足够精彩”。人类在这种地方通常很容易被一个绿色勾骗到，我们尽量不参加这种传统。

## 重跑检查

```sh
npm test
npm run test:upstream
npm run build
```

## 上游与许可

上游：[Rabneba/stick-steel](https://github.com/Rabneba/stick-steel)，固定提交 `4c8e1d05a1ec47db93b687a81a82878727308b20`，MIT，Copyright (c) 2026 Rab Neba。

`vendor/stick-steel/` 保持原始字节，`upstream.lock.json` 保存逐文件摘要；所有必要引擎修改写入可审计补丁，由 `prepare-engine` 生成 `.engine/`。不复制上游字体、生产身份或 Genex 配置。
