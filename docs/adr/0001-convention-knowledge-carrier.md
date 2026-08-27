# 约定型知识采用「AGENTS.md 指针 + 版本化 skill」载体

gx-web 库的约定型用法（core model 规范、tool hooks 场景、ep-comp 声明式优先等）此前无版本化载体，散落在个人 AGENTS.md 与各生成 skill 中，多项目复用时更新困难、消费端会话反复纠正。决定新建独立插件 `gx-conventions`（单 skill，1.0.0 起步）承载库官方规范，个人与消费项目 AGENTS.md 只落一行指针「涉及 @gx-web/* 先调 `gx-conventions`」，规范更新走「市场修改 + bump 版本 + 消费端升级」，不向消费项目落副本。

## Considered Options

- **大而全「gx-web 用法」生成 skill**：约定型知识无任务意图时语义触发不可靠，且与生成 skill 双轴重复 —— 否
- **扩充个人 AGENTS.md**：无条件注入可靠，但无版本机制、只治个人不治团队、多项目更新困难 —— 否
- **ui-codegen.md 基线预填**（创建项目约定文件时从插件资产拷官方规范基线）：规范落地成项目文件后，市场更新需 diff 同步，易漂移 —— 否
- **AGENTS.md 指针 + 版本化 skill**（采纳）：指针是指令级上下文（触发可靠性接近无条件注入），skill 跟插件版本分发（一处更新全项目生效），description 语义触发做兜底

## Consequences

- 约定唯一归属 gx-conventions；生成 skill 的 reference 只保留链路必需部分，指向而不复制，否则双归属即重复维护
- skill 调用时短名不带插件前缀，故市场 skill 短名必须自带域前缀（`gx-` / `wd-` / `spec-`）且全局唯一
- 项目个性约定仍在消费项目 `docs/ui-codegen.md`（快环），与本插件分工：库官方规范 vs 项目个性
- 慢环蒸馏新增一个去向：跨项目通用信号除改生成 skill 外，可沉淀进 gx-conventions 对应篇
