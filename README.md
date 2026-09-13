# Arena Combat

**基于 Stick & Steel 的 AI 战斗设计竞技场。平台提供身体，AI 设计打法。**

保留上游 Rapier 物理、辅助主动布娃娃身体、持械动作、角色和武器绘制、跟随镜头、碰撞反馈。新增双方独立配置策略、同刻观察、统一动作参数、试战、冻结和回放。独立于旧 MuJoCo 项目。

## 0.2 战斗动作与桌面观赛

本版把持续鼠标式乱挥改为五种有承诺的剑招：右势横斩、回身反斩、高位劈斩、直线刺击、低位切斩。每招都有起手、出剑、收势、实际物理手部/躯干目标和精力代价。提供四种持械架势、起手佯攻取消、付费后撤步和真实低姿态；AI负责何时使用与怎样组合，平台不替它选择应对。

只做桌面。开赛自动收起配置区，稳定双人观赛镜头、可切换全景/纯净观战/全屏、实际招式与阶段提示、关键接触回看。看台与旗帜只放在原碰撞场地之外，不偷偷扩大场地。动作实验室可逐招执行并选择防守对照，不计成绩。

接口变成 `steel-design-2`，规则独立为 `arena-combat-0.2-craft`。旧冻结作品不能贴上新规则继续使用；旧JSON可作为重新设计的参考。具体动作承诺、取消、几何限制见 [参赛指南](docs/PARTICIPANT.md)，实施及实际检查见 [本轮记录](docs/COMBAT_CRAFT.md)。

## 立即运行

Node.js **22.13 或以上**，建议 Node 22 的较新补丁版。首次安装需要 npm 网络访问，游戏本身不需要账号、模型 API 或 Genex 服务。

```sh
git clone https://github.com/hugeJan/arena-combat.git
cd arena-combat
npm ci
npm run dev
```

打开 **http://127.0.0.1:5180/**。红蓝双方可选择开发样例、导入模型生成的 JSON 或直接编辑配置，然后点击“冻结配置并开赛”。比赛结束可回看、拖动时间轴、导出本局完整记录。

Mac 也可以运行根目录的 `启动竞技场.command`，或在终端执行 `bash 启动竞技场.command`；脚本核验 Node 版本，首次安装依赖并打开网页，不终止其他占用端口的服务。

本仓库已包含实际游戏素材，不需要再运行 Git LFS。首次导入保留了上游版权与许可，但没有复制字体或生产发布配置。

## 让 AI 参加

```sh
npm run arena -- init ./my-fighter --name 我的斗士
```

将 `my-fighter/TASK.md` 交给 Codex 或其他本地 AI 工具。AI 阅读公开指南、修改 `design.json`，随后：

```sh
npm run arena -- validate ./my-fighter/design.json
npm run arena -- spar ./my-fighter/design.json examples/pressure.json --duration 30
npm run arena -- freeze ./my-fighter
```

冻结会产生独立副本和 SHA-256 摘要；CLI 检查已冻结设计与当前规则是否匹配。完整过程见 [参赛指南](docs/PARTICIPANT.md)。

两个设计的完整换位对战：

```sh
npm run arena -- match examples/pressure.json examples/counter.json --swap --duration 30 --out outputs/my-first-pair
```

CLI 尽快计算，不人为等待现实时间；浏览器按现实时间调度固定步进，不预演胜负。机器来不及时显示积压，不用跳过仿真步掩盖性能问题。两种入口使用同一 Match 和物理内核，但已观察到浏览器与 Node 的结果差异，不能混用两者进行排名。

输出目录保留设计、同 tick 观察、动作、反馈、接触事件、姿态帧、赛果和摘要。

## 已实现

- 身体层：固定上游游戏，显式外部双控制补丁；双方使用相同动作时长与资源规则，内置机器人决策关闭。
- 招式层：动作步骤、武器方向渐变、持续引导挥动、快捷斩击、下劈、突进、推击、拾取与起身请求。
- 战术层：优先级条件、打断/中止、冷却、实际接受反馈和有限历史观察。
- 观战：复用原游戏角色、兵器、镜头、真实接触特效和声音，采用练习场；新增双设计入口与本局回放。
- 工作流：本地任务、配置校验、试战、经过时间记录、冻结副本与日志。

## 验证与限制

当前仍是开发候选，不是正式跨模型排名发行。新增真实剑尖轨迹差异、格挡/撤步/降低姿态对照、动作承诺与取消、相同输入重跑、终局后不改赛果等检查。具体版本、环境和完整验证结果以 [当前状态](docs/STATUS.md) 为准。

本机用户已反馈旧版运行流畅；本轮需要另外验证动作变更后的整场观感。无画面计算耗时不是网页帧率。浏览器与Node的旧有微小初始化差异尚未定位，不能混合运行环境排名。双方同tick输入与相同动作参数，也不代表接触处理顺序、同时失能等所有边界已经完全公平。

固定同体型单手剑和练习场。没有盾牌，没有无敌闪避，也不运行任意用户脚本。降低姿态不是必定躲开攻击，命名招式也不是锁定伤害。开发对照和样例不冒充独立AI作品。隐藏网页会暂停这场本机开发对局；无人值守试战使用CLI。

## 重跑检查

```sh
npm test
npm run test:upstream
npm run test:combat
npm run build
```

常规 CI 只有仓库读取权限；一次性导入与发布工作流已移除。

## 上游与许可

上游：[Rabneba/stick-steel](https://github.com/Rabneba/stick-steel)，固定提交 `4c8e1d05a1ec47db93b687a81a82878727308b20`，MIT，Copyright (c) 2026 Rab Neba。

`vendor/stick-steel/` 保留原始源码及 LICENSE，`upstream.lock.json` 保存逐文件摘要。`patches/external-control.json` 记录双外部控制修补；启动前校验原文件，再生成 `.engine/`，不静默编辑上游。第三方依赖、素材保留各自许可。新代码同样按 MIT 分发。

不依赖、不改动 `arena-combat-benchmark`，旧工程与历史作品独立保留。
