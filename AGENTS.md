# Arena Combat 开发约定

这是 hugeJan/arena-combat 独立新项目，基于固定版本 Stick & Steel，不依赖旧 arena-combat-benchmark。

先读 README.md、docs/STATUS.md、docs/ARCHITECTURE.md，核对 Git 状态。只修改本任务范围，别覆盖他方改动。接口变更同时更新公开指南、校验器、运行时、样例、测试。

平台提供身体与规则，参赛 AI 设计招式和战术。不得让参赛 AI 编写人体平衡算法。保留上游游戏组合，不能退回自研僵硬身体。

vendor/stick-steel 保持原始字节，与 upstream.lock.json 对照。改引擎必须记录明确补丁与测试，由 prepare-engine 生成 .engine，禁止静默改 vendor。动作、判定、画面须来自同一个物理世界；渲染不能改胜负。

默认仅解释有界 JSON，不执行参赛者代码，不使用 eval、Function 或 node:vm 冒充沙箱。双方同 tick 观察，再提交双方输入。外部控制独立于 online 标志，必须关闭原内置机器人，对称执行时长/代价。

不要声明尚未完成的盾牌、通用蹲避、跨机器确定性、Mac 实时帧率或独立 AI 设计验收。开发样例与模型作品区分。自动测试、实际完整对局、网页可用性、动作观感分别记录。

不可运行上游 Genex 生产身份、商店或联机初始化。不复制字体文件、缓存、凭证、node_modules 或生产环境配置。保留版权和许可。

结束更新 docs/STATUS.md 与任务记录，留下真实复现命令、提交身份和未完成范围。不要声称会在对话结束后自动继续。
