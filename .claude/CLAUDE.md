# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库定位

这是一个 **Claude Code 插件库**，用于存放面向团队业务场景的 skill。不是一个可构建/运行的项目，没有 build、test、lint 命令。

## 仓库结构

```text
.claude-plugin/plugin.json   — 插件元数据（名称、版本、作者）
skills/                      — 每个 skill 一个目录
  <skill-name>/
    SKILL.md                 — skill 指令（流程规则、触发条件、输出格式）
    reference.md             — API 签名与类型参考（从 monorepo 提取的知识）
    examples/                — 可落地的代码示例
```

## Skill 文件职责分离

- **SKILL.md**：只写"什么时候触发"和"生成流程/规则"，不内联 API 签名
- **reference.md**：只写组件 Props、函数签名、类型定义、完整模板，不写触发逻辑
- **examples/**：提供可直接参考的落地代码

## 依赖关系

skill 中引用的组件和工具来自 monorepo `gx-web-lib`（`D:\Develop\Project\gx-web-lib`），主要涉及：

- `@gx-web/core` — 装饰器（`@FieldName`）、工具函数（`getModelFromJson`）
- `@gx-web/tool` — Hooks（`useTablePage`、`useStateRef`）
- `@gx-web/ep-comp` — 组件（`GXPaginationTable`、`GXForm`、`GXSearch`）和生成函数（`generateTableColumns`、`generateFormItems`）

monorepo API 变更时，需要同步更新对应 skill 的 `reference.md`。

## 新增 Skill 规范

1. 在 `skills/` 下创建以 skill 名称命名的目录（`kebab-case`）
2. 必须包含 `SKILL.md`（frontmatter 含 `name` 和 `description`）
3. 如果依赖外部库 API，在同级创建 `reference.md` 并在 `SKILL.md` 中引用
4. 提供至少一组 `examples/`
