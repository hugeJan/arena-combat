# Arena Combat

**基于 Stick & Steel 的 AI 战斗设计竞技场。平台提供身体，AI 设计打法。**

保留上游 Rapier 物理、辅助主动布娃娃身体、角色和武器绘制、接触反馈。新增共享定型剑招、双人观赛镜头、双方独立配置策略、同刻观察、试战、冻结和回放。独立于旧 MuJoCo 项目。

## 0.2 战斗动作与桌面观赛

本版把持续鼠标式乱挥改为五种有承诺的剑招：右势横斩、回身反斩、高位劈斩、直线刺击、低位切斩。每招都有起手、出剑、收势、实际物理手部/躯干目标和精力代价。提供四种持械架势、起手佯攻取消、付费后撤步和真实低姿态；AI负责何时使用与怎样组合，平台不替它选择应对。

只做桌面。开赛自动收起配置区，稳定双人观赛镜头、可切换全景/纯净观战/全屏、实际招式与阶段提示、关键接触回看。看台与旗帜只放在原碰撞场地之外，不偷偷扩大场地。动作实验室可逐招执行并选择防守对照，还能精确定格起手末段、出剑中段或收势中段，不计成绩。

接口采用 `steel-design-2`，规则独立为 `arena-combat-0.2-craft`。旧冻结作品不能贴上新规则继续使用；旧JSON可作为重新设计的参考。具体动作承诺、取消、几何限制见 [参赛指南](docs/PARTICIPANT.md)，实施及实际检查见 [本轮记录](docs/COMBAT_CRAFT.md)。

## 立即运行

Node.js **22.13 或以上**，建议 Node 22 的较新补丁版。首次安装需要 npm 网络访问，游戏本身不需要账号、模型 API 或 Genex 服务。

```sh
git clone https://github.com/hugeJan/arena-combat.git
cd arena-combat
npm ci
npm run dev
```

打开 **http://127.0.0.1:5180/**。红蓝双方可选择开发样例、导入模型生成的 JSON 或直接编辑配置，然后点击“冻结配置并开赛”。比赛结束可回看、拖动时间轴、导出本局完整记录。

Mac 也可以运行根目录的 `启动竞技场.command`，或执行 `bash 启动竞技场.command`。本仓库已包含实际游戏素材，不需要再运行 Git LFS。首次导入保留上游版权与许可，没有复制字体或生产发布配置。

已经部署过旧版时，先停止旧开发服务，检查 `git status --short` 并保留未提交改动、个人斗士和记录。处于main且无冲突时执行：

```sh
git pull --ff-only
npm ci
npm run dev
```

## 让 AI 参加

```sh
npm run arena -- init ./my-fighter --name 我的斗士
```

将 `my-fighter/TASK.md` 交给本地 AI 工具。AI 阅读公开指南、修改 `design.json`，随后：

```sh
npm run arena -- validate ./my-fighter/design.json
npm run arena -- spar ./my-fighter/design.json examples/pressure.json --duration 30
npm run arena -- freeze ./my-fighter
```

冻结产生独立副本和 SHA-256 摘要；CLI检查设计与当前规则是否匹配。更新游戏规则后新建会话，不移植旧作品的设计时间或成绩。

两个设计的完整换位对战：

```sh
npm run arena -- match examples/pressure.json examples/counter.json --swap --duration 30 --out outputs/my-first-pair
```

CLI尽快计算，不人为等待现实时间；浏览器按现实时间调度固定步进，不预演胜负。机器来不及时显示积压，不跳过仿真步掩盖性能问题。两种入口使用同一Match和内核，但已有跨运行环境结果差异，不能混合排名。

输出保留设计、同tick观察、动作、反馈、接触事件、姿态帧、赛果和摘要。

## 已实现

- 身体层：固定上游游戏和显式共享身体补丁；双方动作时长、资源规则一致，内置机器人决策关闭。
- 招式层：五种完整剑招、四种方向架势、起手取消与恢复、付费撤步/突进、降低姿态、拾取与起身。普通aim只引导待机/格挡，不能覆盖已承诺攻击。
- 战术层：优先级条件、打断/中止、冷却、实际接受反馈和有限历史观察。
- 观战：原角色、兵器、接触特效和声音，加稳定双人镜头、工作台分离、实验室阶段定格、关键接触回放和独立终局物理收尾。
- 工作流：本地任务、配置校验、试战、经过时间记录、冻结副本与日志。

## 验证与限制

0.2已通过PR #1合并main，代码提交78895ab。合并前CI34756244545的Linux/macOS各44项平台测试、6项上游核心物理测试及构建通过，分别执行35个攻防对照和完整换位开发对局；真实桌面浏览器完成15个阶段定格及整场/暂停/回放检查。详见 [当前状态](docs/STATUS.md)。

仍是开发候选，不是正式跨模型总榜。实际身体会有跟随和接触偏差，不是动作捕捉或专业剑术模拟。具体攻防对照不代表所有距离和时机均有效，实景检查不等于用户已经认可整场观赏性。

用户反馈旧版本机流畅，但0.2具体网页FPS须另外测定。无GPU CI浏览器仍有低帧率和积压，无画面计算耗时不能冒充网页帧率。跨浏览器/Node初始化差异、接触顺序/同时失能、公平性泛化、多对手平衡和独立AI设计验收尚待处理。

固定同体型单手剑和练习场，没有盾牌或无敌闪避，不运行任意用户脚本。降低姿态不保证躲开，命名剑招不锁定伤害。开发样例不是独立AI作品。隐藏网页会暂停本机开发对局，无人值守试战使用CLI。

## 重跑检查

```sh
npm test
npm run test:upstream
npm run test:combat
npm run build
```

只保留只读常规CI，一次性写权限导入/发布工作流已移除。

## 上游与许可

上游：[Rabneba/stick-steel](https://github.com/Rabneba/stick-steel)，固定提交 `4c8e1d05a1ec47db93b687a81a82878727308b20`，MIT，Copyright (c) 2026 Rab Neba。

`vendor/stick-steel/`保留原始源码及LICENSE，`upstream.lock.json`保存逐文件摘要。`patches/external-control.json`、`patches/combat-craft.json`、`patches/combat-body.json`分别记录双外部控制、招式和共享身体跟随修补。启动前校验原文件，再生成`.engine/`，不静默修改上游。第三方依赖、素材保留各自许可，新代码按MIT分发。

不依赖、不改动arena-combat-benchmark；旧工程与历史作品独立保留。
