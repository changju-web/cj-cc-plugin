---
name: wd-list-page
description: "Generate mini-program Wot UI list/search/infinite-scroll page skeletons for apps/mini-program from Swagger, Knife4j, OpenAPI JSON, request/response examples, or existing module code. Use for requests like 生成小程序列表页、查询页、分页列表、gx-list、useListStream、wd-search、gx-search-more、根据接口生成小程序页面骨架. Produces class models with @gx-web/core, API wrappers with @/service, useStateRef query state, useListStream pagination, gx-list slots, card list rendering, empty state, and stable navigation hooks for later form/detail pages."
---

# wd-comp 列表页生成

## Overview

这个 skill 只生成小程序列表页底座：

- `model/index.ts`：`XxxPageQuery`、`XxxListItem`
- `api/index.ts`：`loadXxxPage`
- `index.vue`：`definePage`、`useStateRef`、`useListStream`、`gx-list`、搜索区、卡片列表、空状态

这个 skill 不负责：

- 新增 / 编辑 / 提交表单页
- 详情页
- 删除 / 审核 / 批量操作
- 复杂业务 feature 组件

## Required References

生成代码前先阅读：

1. `../../references/core-tool.md`
2. `../../references/mini-program.md`
3. `./reference.md`

## Output Scope

固定输出三部分：

1. Model
2. API
3. 主列表页

## Contracts

### Model

- 查询条件命名：`XxxPageQuery`
- 列表项命名：`XxxListItem`
- 使用 `@ClassName` 和 `@FieldName`
- 数组/对象默认值使用 `@Default(() => [])` / `@Default(() => ({}))`

### API

- 默认生成 `loadXxxPage`
- 使用 `@/service`
- 分页入参先匹配邻近模块；无法判断时使用 `QueryParams<XxxPageQuery>` 并标记待确认

### Page

- 根节点 class：`xxx-page`
- 使用 `definePage`
- 查询条件使用 `useStateRef(() => getModelFromJson(XxxPageQuery))`
- 分页使用 `useListStream<XxxListItem>`
- 列表容器使用 `gx-list`
- 简单搜索用 `wd-search`
- 复杂搜索用 `gx-search-more`，并拆 `components/more-search-popup.vue`

## Stable Hooks

保留后续增量能力的稳定位置：

- header：搜索与页面级按钮
- default：列表卡片
- 行点击：`handleDetail(item)` 或 toast 兜底
- 页面级新增：`handleAdd()`，如果目标页不在本次范围，用 `功能迁移中` toast

## Success Criteria

一次成功输出至少满足：

- Model 使用 `@gx-web/core` 声明式 class。
- 查询状态使用 `useStateRef`。
- 分页列表使用 `useListStream + gx-list`。
- 空状态使用 `wd-empty` 或 `gx-list` 内置 empty。
- 不手写分页状态机。
- 不引入 uView、Vuex、Vue 2 class component 或旧全局 `$xxx` 方法。
- 不手改 `pages.json`。

