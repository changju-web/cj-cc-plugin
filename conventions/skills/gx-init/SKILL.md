---
name: gx-init
description: "One-time setup for business projects using the gx-web library. Injects the gx-conventions pointer section into the target project's AGENTS.md (creates the file if missing, skips if already present). Use for requests like 初始化业务项目、接入 gx-web 约定、写入 gx-conventions 指针、配置项目 AGENTS 约定."
---

# gx-init · 业务项目约定初始化

一次性装配 skill：把 gx-web 库约定指针写入调用项目的 `AGENTS.md`，使该项目的所有 agent 会话自动遵循 `gx-conventions` 约定。无代码生成输出。

## 前置确认

1. 定位项目根：以当前会话工作目录为准（monorepo 取仓库根，各 app 共用一份 AGENTS.md）
2. 探测 `@gx-web/*` 依赖：查根 `package.json` 与 `apps/*/package.json` 的 dependencies / devDependencies
   - 命中 → 继续注入
   - 未命中 → 询问用户该项目是否确实使用 gx-web 库，确认后才注入

## 注入流程

1. 读项目根 `AGENTS.md`
   - 文件不存在 → 创建，先写一级标题（如 `# AGENTS.md`），再追加指针段
   - 文件存在 → 检查是否已含 `gx-conventions` 字样（幂等）
     - 已含 → 输出「指针已存在，跳过」，结束
     - 未含 → 在文件末尾追加指针段
2. 追加内容为下方模板**原文**，不改动措辞（保持各项目一致，便于后续升级识别）

## 指针段模板

```md
## gx-web 库约定

使用 @gx-web/*（core / tool / ep-comp / biz / share）相关能力时，先调用 `gx-conventions` skill 阅读对应小节约定（core / tool / ep-comp / common 四篇），严格遵循；生成任务（表格页、表单弹窗、model / api 生成等）仍按各生成 skill 流程执行。
```

## 边界与收尾

- 只写 `AGENTS.md` 一个文件，不创建 `docs/ui-codegen.md`（那是生成 skill 首跑时的探测产物）
- 不修改项目任何源码、配置与依赖
- 收尾汇报：注入结果 + 提醒用户该会话环境需已安装市场 `gx-conventions` 插件（含本插件），否则指针指向的 skill 不存在
- 约定内容更新不重跑本 skill：规范改动走市场 bump 版本 + 消费端升级插件，指针段本身无需变化
