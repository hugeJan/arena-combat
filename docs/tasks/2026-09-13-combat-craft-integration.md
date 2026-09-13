# 动作重建集成交接

2026-09-13。本轮主实现来自已本地验证的34份源文件，发布提交 8944486a4df05c4fe1b1df22339bc759a4de071a；本地工作区 /mnt/data/arena-combat。

原 feat/combat-craft 分支在发布前新增了5个文档/CI提交，与已验证源码的命令、动作时间和检查数量不同。没有强推或覆盖该分支；另建 feat/combat-craft-verified 接入已验证实现，PR #1。

以本分支实际公开目录和校验器为准：cut_right / cut_left / overhead / thrust / low_cut，steel-design-2，arena-combat-0.2-craft。不要使用另一份草案中的 cut_forehand / cut_backhand / memory.attack_cycle；这些不是此实现的公共接口。

一次性写权限发布工作流与临时抓取工作流已移除，只保留 contents:read 的常规 Linux/macOS/桌面浏览器 CI。主分支在通过集成检查前不修改。最终结果见 STATUS.md 和 COMBAT_CRAFT.md。
