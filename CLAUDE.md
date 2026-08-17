# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库定位

这是一个 **Claude Code 插件 Marketplace**，用于管理和分发面向团队业务场景的插件。不是一个可构建/运行的项目，没有 build、test、lint 命令。

## 仓库结构

```text
.claude-plugin/
  marketplace.json            — Marketplace 清单（注册所有插件）
ep-comp/                      — 基于 @gx-web/ep-comp 的业务代码生成插件
  .claude-plugin/plugin.json
  skills/
    crud-page/                — 从 Swagger/OpenAPI 生成完整 CRUD 页面
    table-page/               — 从 Swagger/OpenAPI 生成纯表格分页页面
    detail-dialog/            — 生成详情弹窗组件
    form-dialog/              — 生成表单弹窗组件
    <skill>/
      SKILL.md                — skill 指令（流程规则、触发条件、输出格式）
      reference.md            — API 签名与类型参考（从 monorepo 提取的知识）
      examples/               — 可落地的代码示例
notify-hook/                  — Windows 任务栏闪烁通知 hook 插件
  skills/setup/               — 安装 Toast 通知与 claude-focus:// 协议
ssd-workflow/                 — Spec-Driven Development 工作流编排插件（OpenSpec × Superpowers）
  skills/
    ssd/                      — 主入口：流程导航（用产物判阶段）
    ssd-propose/              — 阶段 1 WHAT：brainstorming → /opsx:propose
    ssd-plan/                 — 阶段 2 HOW：→ superpowers:writing-plans
    ssd-apply/                — 阶段 3 执行：按 plan 实现 + 执行纪律路由
    ssd-archive/              — 阶段 4 归档：→ /opsx:archive
mcp/                          — 共享 MCP 服务器配置（未注册到 marketplace）
  .mcp.json                   — tavily / github / chrome-devtools / context7 / codegraph
docs/
  superpowers/
    plans/                    — 历史实现计划
    specs/                    — 历史设计规格
```

## Skill 文件职责分离

- **SKILL.md**：只写"什么时候触发"和"生成流程/规则"，不内联 API 签名
- **reference.md**：只写组件 Props、函数签名、类型定义、完整模板，不写触发逻辑
- **examples/**：提供可直接参考的落地代码

## 依赖关系

skill 中引用的组件和工具来自 monorepo `gx-web-lib`（`D:\Develop\Project\gx-web-lib`），主要涉及：

- `@gx-web/core` — 装饰器（`@FieldName`）、工具函数（`getModelFromJson`）
- `@gx-web/tool` — Hooks（`useTablePage`、`useStateRef`）
- `@gx-web/ep-comp` — 组件（`GxPaginationTable`、`GxForm`、`GxSearch`）和生成函数（`generateTableColumns`、`generateFormItems`）

monorepo API 变更时，需要同步更新对应 skill 的 `reference.md`。

## 新增插件

1. 在根目录创建以插件名称命名的目录（`kebab-case`）
2. 在插件目录下创建 `.claude-plugin/plugin.json`（含 `name`、`description`、`version`、`repository`、`author`）
3. 在 `.claude-plugin/marketplace.json` 的 `plugins` 数组中注册新插件（`name` + `source` + `description`）

## 新增 Skill 规范

1. 在 `<plugin>/skills/` 下创建以 skill 名称命名的目录（`kebab-case`）
2. 必须包含 `SKILL.md`（frontmatter 含 `name` 和 `description`）
3. 如果依赖外部库 API，在同级创建 `reference.md` 并在 `SKILL.md` 中引用
4. 提供至少一组 `examples/`

## AGENTS.md

`AGENTS.md` 是 Codex 版本的入口文件，结构与 CLAUDE.md 镜像，定位改为"Codex 插件 Marketplace"。新增插件或 skill 时需同步维护。

## Agent skills

### Issue tracker

工单以本地 markdown 文件存放在 `.scratch/<feature>/` 下，详见 `docs/agents/issue-tracker.md`。

### Triage labels

沿用默认五个 triage 标签（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix），详见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局：根目录 `CONTEXT.md` + `docs/adr/`（懒创建），详见 `docs/agents/domain.md`。
