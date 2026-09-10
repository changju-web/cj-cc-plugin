---
name: table-page
description: "Generate @gx-web/ep-comp list/table/pagination page skeletons from Swagger, Knife4j, OpenAPI JSON, API examples, or existing module code. Use for requests like 生成列表页、查询页、分页表格、table-page、表格底座、先生成页面骨架、根据接口生成查询条件和表格. Produces QueryModel/ListItemModel, loadPage, GxSearch, generateFormItems, generateTableColumns, useTablePage, and GxPaginationTable stable slots (#header/#action/#action-bar). Use before adding form-dialog or detail-dialog; do not generate add/edit/audit/detail dialogs by default."
---

# ep-comp 表格页生成

## Overview

这个 skill 生成表格页底座，model 与 API 的落位由「API/Model 归属决策」决定：

- `XxxQueryModel`、`XxxListItemModel`（统一管理形态：契约实体落 biz，页面 model 继承补字段；就近形态：落 `model/index.ts`）
- 分页查询 API（统一管理形态：biz 工厂方法 + app 侧消费文件；就近形态：`api/index.ts` 的 `loadPage`）
- `index.vue`：`GxSearch`、`GxPaginationTable`、`#header`、`#action`、`#action-bar`

这个 skill 不负责：

- 新增 / 编辑 / 审核弹窗
- 详情弹窗
- `loadDetail`
- `add` / `update` / `audit` / `removeById`

## When to Use

当用户要的是以下场景时，优先使用这个 skill：

- 根据 Swagger / Knife4j / OpenAPI 生成查询页、分页列表页
- 先生成 `ep-comp` 列表页骨架，后续再逐步追加弹窗能力
- 用户要的是 `generateTableColumns + generateFormItems + useTablePage + GxPaginationTable` 这一条主链路

## When NOT to Use

以下场景不应只使用这个 skill：

- 用户明确要求新增 / 编辑 / 审核弹窗
- 用户要详情弹窗
- 用户要一次性补全复杂表单交互

此时应：

1. 先用 `table-page` 生成底座
2. 再按需切换到 `form-dialog` 或 `detail-dialog`

## Output Scope

按归属决策结论输出三部分：

1. `Model`
2. `API`
3. `主页面集成`

### Model

至少生成：

- `XxxQueryModel`
- `XxxListItemModel`（或统一管理形态下的 biz 实体 + 页面行模型继承）

### API

至少生成：

- 分页查询（`loadPage` 或 biz 工厂的 `page` 方法）

### 主页面集成

至少生成：

- 搜索区：`#header`
- 行级操作槽：`#action`
- 页面级操作槽：`#action-bar`
- 根节点 `<div class="模块名-kebab-case">`

## API/Model 归属决策

model 与 API 的落位是项目级架构决策，skill 不写死。生成前按以下顺序确定：

1. **项目约定优先**：读 `docs/ui-codegen.md`（或项目同类约定文件），已有归属声明（如「biz 统一管理」）→ 直接按约定执行。
2. **探测项目结构**（无约定文件时）：
   - **统一管理形态**：workspace 存在统一 api/model 层（如 `@gx-web/biz`：`src/model/<域>/` 装饰器实体 + `src/api/<域>/` 的 `createXxxApi(request)` 工厂、app 侧仅一行消费），且存量页面从统一层 import → 契约实体与 API 工厂落统一层，页面 model 继承实体只补页面字段；
   - **就近形态**：存量页面把 model/api 放 `views/<module>/model`、`views/<module>/api` → 跟随就近形态；
   - 两种迹象并存或都无法确认 → AskUserQuestion 请用户选择（统一管理 / 就近原则），确认后再生成。
   - **改造存量模块时**：项目约定中的统一管理层声明优先于存量就近形态——存量 class 静态方法 API、就近 model 属迁移前历史形态，不是惯例依据；改造即把 api/model 收敛到统一层、引用点一并切换，不新增就近文件。
3. **请求实例不虚构**：统一管理形态由 app 层把项目请求实例注入工厂（`ApiRequest` 参数）；就近形态直接用项目请求层。以项目实际请求封装为准，禁止套用模板占位写法。

## Shared Contracts

### 根节点 contract

```vue
<template>
  <div class="module-kebab-case">
    <GxPaginationTable ...>
      <template #header>...</template>
      <template #action="{ row }">...</template>
      <template #action-bar>...</template>
    </GxPaginationTable>
  </div>
</template>
```

### 挂点 contract

- `#header`：查询区
- `#action`：行级操作
- `#action-bar`：页面级操作

### 交接 contract

后续 dialog 类 skill 只能在以下位置做增量注入：

- 追加 import
- 追加组件 ref
- 追加 handler
- 向 `#action` / `#action-bar` 注入按钮
- 在根 `div` 内、`GxPaginationTable` 之后追加组件实例

## Default Behavioral Constraints

- 默认只生成列表页底座
- 默认保留空的 `#action` / `#action-bar` 挂点
- 不擅自生成弹窗组件
- 不重写成整页自定义结构，除非用户明确要求

## Success Criteria

一次成功输出至少应满足：

- 归属决策已完成且结论明确（约定 / 探测 / 用户确认三选一有据）
- 正确生成 `XxxQueryModel` 和 `XxxListItemModel`（落位符合归属决策）
- API 只有分页查询（落位符合归属决策）
- `index.vue` 使用 `GxSearch`、`GxPaginationTable`、`useTablePage`
- 模板只有一个根节点 `<div class="模块名-kebab-case">`
- 保留稳定挂点，便于 `form-dialog` / `detail-dialog` 继续注入

## API Reference

在生成代码前，先阅读 [API Reference](./reference.md)。
