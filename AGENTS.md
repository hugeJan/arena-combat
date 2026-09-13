# Arena Combat 开发约定

这是 hugeJan/arena-combat 独立项目，基于固定版本 Stick & Steel，不依赖旧 arena-combat-benchmark。

开始前读 README.md、docs/STATUS.md、docs/ARCHITECTURE.md 和当前 docs/tasks；核对 Git/分支。只修改当前任务范围，别覆盖其他工作。

平台提供身体、基础运动与可靠战斗招式；参赛 AI 设计招式组合、时机和战术。不得让参赛 AI 编写人体平衡算法，也不得退回“自由 aim 轨迹可以直接造成伤害”的无名挥刀。动作接口变化必须同步公开指南、校验器、运行时、样例和测试。

vendor/stick-steel 保持原始字节，与 upstream.lock.json 对照。引擎变化必须记录为明确补丁，由 prepare-engine 生成 .engine；禁止静默修改 vendor。动作、判定和画面来自同一物理世界；渲染、镜头、音效不能修改胜负。

默认只解释有界 JSON，不执行参赛者代码，不使用 eval、Function 或 node:vm 冒充沙箱。双方同 tick 观察后提交双方输入；内置战术 bot 关闭，动作时长、资源和命中规则对称。

当前产品以桌面观战和视频录制为目标。不要投入手机、触控或竖屏专项适配；保持普通桌面窗口缩放即可。

不要声称尚未完成的盾牌、通用主动蹲避、跨机器确定性、独立 AI 设计验收或正式排行榜。开发样例与模型作品区分；测试通过、完整对局、浏览器可用性、动作观感分别记录。

不可运行上游 Genex 生产身份、商店或联机初始化。不复制字体、缓存、凭证、node_modules 或生产配置。保留版权和许可。

结束时更新 docs/STATUS.md 与任务记录，留下真实复现命令、提交身份和未完成范围。不要把计划写成完成事实。
