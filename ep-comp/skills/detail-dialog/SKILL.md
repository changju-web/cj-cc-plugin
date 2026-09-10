---
name: detail-dialog
description: "Generate or incrementally add @gx-web/ep-comp read-only detail dialogs to a table/list page. Use for requests like 详情弹窗、查看详情、详情按钮、只读详情、loadDetail、DetailModel、GxDescriptions, or adding a detail action to an existing table-page. Creates DetailModel, loadDetail, components/detail.vue, detail button, ref, handler, and component instance without changing the GxPaginationTable skeleton."
---

# ep-comp 详情弹窗生成

## Overview

这个 skill 只负责：

- `DetailModel`（落位跟随归属决策，见下）
- `loadDetail`（统一管理形态走 biz 工厂方法，就近形态落 `../api`）
- `components/detail.vue`
- 向现有 `index.vue` 注入详情按钮、详情 handler、详情组件实例

这个 skill 不负责：

- 表单提交
- 查询条件改造
- 改写 `GxPaginationTable` 主结构

## API/Model 归属决策

DetailModel 与 loadDetail 的落位是项目级架构决策，skill 不写死，判定顺序：

1. **项目约定优先**：`docs/ui-codegen.md` 已声明归属（如「biz 统一管理」）→ 按约定执行。
2. **跟随宿主列表页现状**：列表页 model/API 已有明确落位 → 详情的 DetailModel / API 跟随同一落位。**改造存量模块时**例外：项目约定中的统一管理层声明优先于存量就近形态，就近 class API / model 属迁移前历史形态，改造时收敛到统一层。
3. **无法判断** → AskUserQuestion 请用户选择（统一管理 / 就近原则）。

## Modes

### 自动模式（默认）

- 生成方式：`generateDescriptionsItems + GxDescriptions`
- 适用于绝大多数场景，包含以下扩展手段：
  - 枚举映射：`render: (d) => h('span', labelMap[d.status])`
  - 多字段合并：`render: (d) => h('span', \`${d.start} ~ ${d.end}\`)` + `span: N`
  - 条件显隐：`hide: (d) => boolean`
  - 自定义 span：`{ prop: 'xxx', span: 2 }`
- **不能因为有一两个字段复杂就切换原生模式**
- 前置要求：`DetailModel` 的展示字段必须有 `@FieldName` 装饰器，或在配置中手动提供 `label`

### 原生模式（降级）

- 生成方式：`ElDescriptions + ElDescriptionsItem`
- 仅当自动模式所有扩展手段都无法覆盖时使用
- 触发流程：**先列出哪些扩展手段已尝试、为何不适用，再经用户确认后生成**

## When to Use

当用户要的是以下场景时，优先使用这个 skill：

- 详情按钮
- 只读弹窗
- 在现有 `table-page` 上追加详情能力

## Incremental Injection Rules

详情能力只允许做以下增量修改：

1. 追加 import
2. 追加详情组件 ref
3. 追加 `handleDetail`
4. 向 `#action` 注入详情按钮
5. 在根 `div` 内追加详情组件实例

## Expose Contract

- detail：`init(id)`

## Success Criteria

一次成功输出至少应满足：

- 归属决策已完成，DetailModel 与 loadDetail 落位符合决策结论
- 生成 `DetailModel`
- 生成详情查询（`loadDetail` 或 biz 工厂 `byId`）
- 详情组件暴露 `init(id)`
- 自动模式与原生模式边界清晰
- 复杂场景切原生模式前明确需要用户确认
- 详情按钮只注入到 `#action`
- 不混入提交型表单逻辑

## API Reference

在生成代码前，先阅读 [API Reference](./reference.md)。
