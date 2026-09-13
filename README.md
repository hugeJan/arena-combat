# Arena Combat

**基于 Stick & Steel 的 AI 战斗设计竞技场。平台提供身体，AI 设计打法。**

保留上游 Rapier 物理、辅助主动布娃娃身体、持械动作、角色和武器绘制、跟随镜头、碰撞反馈。新增双方独立配置策略、同刻观察、统一动作参数、试战、冻结和回放。独立于旧 MuJoCo 项目。

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

当前 **0.1 开发原型**，不是正式 Benchmark 发行。GitHub CI 运行 `34750392390` 对代码提交 `49175c1` 的 Linux、macOS 和浏览器检查全部通过：每个核心环境 22 项平台测试、6 项上游物理测试及生产构建；浏览器实际验证开赛、暂停恢复、终局、导出、回放跳转和 390 像素布局。证据与失败探索见 [状态](docs/STATUS.md)。

同配置的两场 macOS ARM64 无画面对局分别模拟 13.075/24.3833 秒、计算墙钟 1.4115/2.0374 秒。这不是用户 MacBook 网页帧率。无 GPU 的 CI 浏览器截图仍显示低帧率和积压；图形性能尚未完成验收。

**已确认跨运行环境结果不一致。** 同设计、同源码摘要在浏览器和 Node 中出现初始微小姿态差异及不同终局，原因尚未定位；同进程重复测试通过不代表跨机器逐位复现。比较策略需固定同一执行环境，当前不提供正式跨模型排行榜或可信远程裁判。

首版只开放同体型单手剑和练习场。防守是武器格挡，不是盾牌；尚无通用主动蹲避。拾取/起身低姿态不是额外蹲避技能。任意 Python/JavaScript 策略尚未开放，当前仅解释有界 JSON，不运行用户代码。

本机用户可以暂停浏览器比赛，隐藏页面会自动暂停；无人值守试战使用 CLI。原游戏的同 tick 双重失能、接触处理顺序、任意长时间对战、多对手平衡、独立 AI 设计验收仍待进一步检查。开发样例不是独立 AI 作品。

## 重跑检查

```sh
npm test
npm run test:upstream
npm run build
```

常规 CI 只有仓库读取权限；一次性导入与发布工作流已移除。

## 上游与许可

上游：[Rabneba/stick-steel](https://github.com/Rabneba/stick-steel)，固定提交 `4c8e1d05a1ec47db93b687a81a82878727308b20`，MIT，Copyright (c) 2026 Rab Neba。

`vendor/stick-steel/` 保留原始源码及 LICENSE，`upstream.lock.json` 保存逐文件摘要。`patches/external-control.json` 记录双外部控制修补；启动前校验原文件，再生成 `.engine/`，不静默编辑上游。第三方依赖、素材保留各自许可。新代码同样按 MIT 分发。

不依赖、不改动 `arena-combat-benchmark`，旧工程与历史作品独立保留。
