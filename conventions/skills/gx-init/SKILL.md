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

1. 按下方「指针段组合」组装本次指针段（正文固定，库包枚举与边界句按探测结果组装）
2. 读项目根 `AGENTS.md`：
   - 文件不存在 → 创建，先写一级标题（如 `# AGENTS.md`），再追加组装结果
   - 文件存在且**无** `## gx-web 库约定` 节 → 文件末尾追加组装结果
   - 文件存在且**已有**该节 → 定位旧节（从 `## gx-web 库约定` 标题起，到下一个 `##` 标题或文件尾）并与本次组装结果比对：
     - 一致 → 输出「指针已是最新」，结束
     - 不一致 → **整节替换**为本次组装结果，输出「指针已更新（差异：<简述>）」

## 所有权与刷新纪律

- `## gx-web 库约定` 节归 gx-conventions 插件所有，项目内**不手工修改**该节；项目自有内容写其他小节
- 插件升级后**重跑本 skill 即可刷新指针段**（比对 + 整节替换，幂等）；规范正文更新走「市场 bump 版本 + 消费端升级插件 + 重跑 gx-init」

## 指针段组合（探测后组装）

**正文（固定）**：

```md
## gx-web 库约定

使用 gx-web 库（含 <库包枚举>）相关能力时，先调用 `gx-conventions` skill 阅读对应小节约定，严格遵循；生成任务（表格页、表单弹窗、model / api 生成等）仍按各生成 skill 流程执行。
```

**组装规则**：

- **库包枚举**：列探测到的库包（`@gx-web/core` / `@gx-web/tool` / `@gx-web/ep-comp` 与依赖清单的交集），如 `@gx-web/core、@gx-web/ep-comp`
- **私有包边界句**：仅当依赖清单中出现库包之外的 `@gx-web/*`（如 biz / share）时，在正文后附加一行，写**实际命中的包名**（不写"等"猜测）：

```md
注意：@gx-web/biz、@gx-web/share 是本项目内私有包，不在库约定范围。
```

- 无私有包的项目不附加任何边界句；篇目（core / tool / ep-comp / common）由 gx-conventions 自身索引承载，指针里不再枚举

## 边界与收尾

- 只写 `AGENTS.md` 一个文件，不创建 `docs/ui-codegen.md`（那是生成 skill 首跑时的探测产物）
- 不修改项目任何源码、配置与依赖
- 收尾汇报：注入 / 更新结果（新增、已更新、已是最新三态）+ 提醒用户该会话环境需已安装市场 `gx-conventions` 插件（含本插件），否则指针指向的 skill 不存在
