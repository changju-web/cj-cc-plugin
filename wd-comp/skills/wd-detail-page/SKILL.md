---
name: wd-detail-page
description: "Generate mini-program Wot UI read-only detail pages for apps/mini-program. Use for requests like 小程序详情页、查看详情、只读详情、loadDetail、onLoad 读取参数、wd-cell-group 详情展示、从列表跳详情. Produces class DetailModel with @gx-web/core, loadDetail API, independent detail.vue page, onLoad parameter validation, useStateRef/useToggle or useLoadMap detail loading, wd-loading, wd-cell-group cards, dict/image display, and safe toast fallback for missing route params."
---

# wd-comp 详情页生成

## Overview

这个 skill 生成小程序只读详情页。默认形态是独立页面，不是弹窗。

负责内容：

- `model/index.ts` 中追加 `XxxDetail`
- `api/index.ts` 中追加 `loadXxxDetail`
- `detail.vue`
- 可选向列表页注入 `handleDetail`

不负责内容：

- 表单提交
- 列表页重写
- 审核/删除等动作

## Required References

生成代码前先阅读：

1. `../../references/core-tool.md`
2. `../../references/mini-program.md`
3. `./reference.md`

## Detail Contract

- 详情 model 使用 `class + @ClassName + @FieldName`
- 页面通过 `onLoad(options)` 读取 id 或业务参数
- 参数缺失时使用 `uni.showToast` 并停止加载
- 详情状态使用 `useStateRef`，loading 使用 `useToggle`
- 复杂详情加载可使用 `useLoadMap`
- 展示使用 `wd-cell-group`、`wd-cell`、业务卡片、`gx-dict`、`gx-dict-tag`、`gx-img`

## Incremental Injection Rules

如果要给已有列表页追加详情入口，只允许：

1. 追加 `handleDetail`
2. 向卡片点击或操作按钮注入 `uni.navigateTo`
3. 不改写 `gx-list` 主结构

## Success Criteria

一次成功输出至少满足：

- `detail.vue` 是独立页面并使用 `definePage`。
- `onLoad` 参数有缺失校验。
- `loadDetail` 错误有 toast 或项目错误处理。
- 详情展示字段使用稳定分组，文本不互相遮挡。
- 不引入 uView、Vuex、Vue 2 class component 或旧全局 `$xxx` 方法。

