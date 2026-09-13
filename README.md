# Arena Combat

**基于 Stick & Steel 的 AI 战斗设计竞技场。平台提供身体，AI 设计打法。**

保留上游 Rapier 物理、主动布娃娃身体、持械动作、角色和武器绘制、跟随镜头、碰撞反馈。新增双方独立配置策略、同刻观察、统一执行规则、试战、冻结和回放。不是旧 MuJoCo 项目的新皮肤。

## 立即运行

Node.js **22.13 或以上**，建议 Node 22 的较新补丁版。首次安装需要 npm 网络访问，之后游戏本身不需要账号、模型 API 或 Genex 服务。

```sh
git clone https://github.com/hugeJan/arena-combat.git
cd arena-combat
npm ci
npm run dev
```

打开 **http://127.0.0.1:5180/**。红蓝双方可选择开发样例、导入模型生成的 JSON 或直接编辑配置，然后点击“冻结配置并开赛”。比赛结束可回看、拖动时间轴、导出本局完整记录。

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

CLI 尽快计算，不人为等待现实时间；浏览器观战按正常时间推进，不预先播放胜负剧本。二者使用同一 Match 和物理内核。输出目录保留设计、同 tick 观察、动作、反馈、接触事件、姿态帧、赛果和摘要。

## 现在实际有什么

- 身体层：固定上游游戏，明确外部双控制补丁；双方都使用相同动作时长与资源规则，内置机器人关闭。
- 招式层：动作步骤、武器方向渐变、持续引导挥动、快捷斩击、下劈、突进、推击、拾取与起身请求。
- 战术层：优先级条件、打断/中止、冷却、实际接受反馈和有限历史观察。
- 观战：复用原游戏的角色与兵器、练习场表现、镜头、真实接触特效和声音；新增双设计入口与回放。
- 工作流：本地任务、配置校验、试战、连续经过时间记录、冻结副本与日志。

## 不要把原型误当成成品

当前 **0.1 开发原型**。没有正式跨模型排行榜或可信远程裁判；浏览器由本机用户控制，暂停会暂停比赛。隐藏页面会自动暂停。无人值守试战用 CLI。

首版只开放同体型单手剑和练习场。防守是武器格挡，不是盾牌；尚无通用主动蹲避。原游戏的拾取/起身低姿态不是额外蹲避技能。任意 Python/JavaScript 策略尚未开放，当前仅解释有界 JSON，不运行用户代码。

原游戏的接触事件顺序、任意长时间对战和多对手平衡仍需进一步审计；同进程重复通过不能外推为跨机器逐位复现。完整浏览器观感与用户 Mac 性能必须分别验证。开发样例不是独立 AI 作品。

## 检查

```sh
npm test
npm run test:upstream
npm run build
```

GitHub CI 执行固定依赖的测试与构建。实际检查、失败探索和未验收范围见 [状态](docs/STATUS.md)。

## 上游与许可

上游：[Rabneba/stick-steel](https://github.com/Rabneba/stick-steel)，固定提交 `4c8e1d05a1ec47db93b687a81a82878727308b20`，MIT，Copyright (c) 2026 Rab Neba。

`vendor/stick-steel/` 保留原始源码及 LICENSE，`upstream.lock.json` 保存逐文件摘要。`patches/external-control.json` 记录唯一的双外部控制修补；启动前校验原文件，再生成 `.engine/`，不静默编辑上游。第三方依赖、素材保留各自许可。新代码同样按 MIT 分发。

不依赖、不改动 `arena-combat-benchmark`，旧工程与历史作品独立保留。
