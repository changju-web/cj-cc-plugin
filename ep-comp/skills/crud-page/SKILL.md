---
name: crud-page
description: Generate ep-comp CRUD page scaffolds from Swagger, Knife4j, OpenAPI JSON, or request/response examples. Use this whenever the user wants to turn API docs into `generateTableColumns`, `generateFormItems`, `useTablePage`, `GxForm`, `GxPaginationTable`, and CRUD dialog components based pages, even if they only say "根据 Swagger 生成列表页". If the context clearly points to an `@gx-web/ep-comp` page, use this skill proactively.
---

# ep-comp Swagger CRUD 页面生成

## Overview

这个 skill 用于把 Swagger / Knife4j / OpenAPI 文档，或用户直接提供的请求/响应示例，转成基于 `@gx-web/ep-comp` 的 **完整 CRUD 页面**接入代码。

目标不是解释单个组件 API，而是生成 CRUD 页面主链路：

- `generateTableColumns`
- `generateFormItems`
- `useTablePage`
- `GxForm`
- `GxPaginationTable`
- 新增/编辑弹窗组件（`ElDialog` + 表单验证 + `defineExpose`）
- 完整 CRUD API（查询/新增/编辑/删除）

默认生成**完整 CRUD 页面**，包含分页查询、新增/编辑弹窗、操作列（编辑/删除）。

## When to Use

当任务满足以下特征时，应优先使用这个 skill：

- 用户提供 Swagger / Knife4j / OpenAPI 文档或接口示例
- 用户要生成分页查询页面或列表页骨架
- 目标是 `@gx-web/ep-comp` 体系下的页面接入
- 需要同时生成查询表单与分页表格主链路

如果用户没有明确提到 `ep-comp`，但当前仓库上下文、已有对话或用户表述已经足以推断目标属于 `ep-comp` 列表页接入，也应直接使用这个 skill，并在输出开头明确说明：

> 以下内容按 `ep-comp` 体系生成。

如果上下文还不足以判断是否属于 `ep-comp` 体系，先追问技术栈或组件体系，再决定是否继续。

## When NOT to Use

以下场景不应触发这个 skill：

- 用户只问 `generateTableColumns` 的单独用法
- 用户只问 `GxForm` 或 `GxPaginationTable` 的 props
- 用户给的是接口文档，但目标不是 `ep-comp` 体系
- 用户仅想阅读 Swagger 文档，不需要生成页面骨架
- 用户要做的是纯详情页（无 CRUD 操作），而非列表 CRUD 页面

## Input Sources

支持以下三类输入源：

1. Swagger / Knife4j 页面 URL
2. OpenAPI JSON / Swagger JSON
3. 用户直接贴出的请求 / 响应示例

### Minimum requirements

#### 1. Swagger / Knife4j 页面

至少应能识别：

- 接口路径
- 请求方法
- 分页请求参数定义
- 列表响应结构或响应示例

#### 2. OpenAPI JSON / Swagger JSON

至少应能识别：

- 目标接口的 `path`
- `method`
- 请求参数 schema
- 响应 schema 或响应示例

#### 3. 请求 / 响应示例

至少应包含：

- 请求字段示例
- 列表数据示例
- 能判断分页字段位置的信息

如果以上最小门槛不满足，不要伪造完整主链路。应明确降级为：

- 结构草稿
- 待确认项

输出时直接说明：

> 当前信息不足，以下先给出结构草稿；所有不确定内容统一放入“待确认项”。

## Default Output Mode

默认采用**两段式**输出。

### 第一段：接入草稿

当用户只给接口文档或示例时：

- 不猜项目目录
- 不绑定具体工程结构
- 输出可复制、可改造的代码草稿

### 第二段：落地代码

当用户补充了模块名、目录结构或目标文件路径后：

- 输出可直接落地的文件结构与代码
- 默认按模块目录组织

## Output Format

输出固定为以下八段，顺序不要变：

1. `Model`
2. `API`
3. `查询表单`
4. `表格分页 + 操作列`
5. `弹窗组件`
6. `主页面集成`
7. `类型导出`
8. `待确认项`

这样做的原因是：第三方接入更关心”能否直接抄用”和”哪里还要自己补”，固定结构比自由发挥更稳定。

---

## 1. Model

至少生成：

- `XxxQueryModel` — 查询参数
- `XxxListItemModel` — 列表展示字段
- `XxxFormModel` — 新增/编辑表单字段

命名规则：

- 默认统一使用 `Model` 结尾
- 如果用户已显式给出命名，遵循用户命名
- 不默认切换到 `VO`

字段处理原则：

- 优先保留文档中能确认的字段
- 字段中文语义清楚时，可用 `@FieldName(...)`
- **所有字段必须添加 `/** ... */` 块注释**，确保 IDE 悬停可见
- **类本身也必须添加块注释**
- 块注释内容与 `@FieldName` 保持一致
- 类型或含义不明确时，不要强猜，统一放到”待确认项”里，并明确写出”需人工确认”

`XxxFormModel` 规则：

- 仅包含可编辑字段，不包含纯展示字段（如 `createdTime`、`updatedTime`）
- `id` 字段必须包含，用于区分新增/编辑模式
- 字段应与 API 文档中的新增/编辑请求体对应

## 2. API

至少生成：

- 分页接口函数（`loadPage`）
- 新增接口函数（`add`）
- 更新接口函数（`update`）
- 删除接口函数（`removeById`）
- 请求参数类型
- 响应类型
- 与 `useTablePage` 对接的返回映射

约束：

- 不假设用户项目里的请求实例名
- 可用占位写法，例如 `request.post(...)`
- 必须提示用户替换为项目里的真实请求封装
- 最终都要落到 `useTablePage` 需要的 `Promise<{ records, total }>` 契约
- `add` 和 `update` 使用 `XxxFormModel` 作为参数类型
- `removeById` 接受 `id: string`
- 所有 API 函数添加块注释说明用途

### 项目约定识别

当用户提供参考代码，或当前任务要求输出落地代码时，先识别项目约定，再生成 API 接入代码。

优先识别以下内容：

- request 来源与初始化方式
- request 调用风格
  - `request.get({ url, params })`
  - `request.post({ url, data })`
  - `request.get(url, { params })`
  - 其他项目自定义风格
- 分页参数命名
  - `current / size`
  - `pageNum / pageSize`
  - 其他项目自定义命名
- 响应解包层级
  - `res.data`
  - `res.data.records / res.data.total`
  - `res.result`
  - 其他项目实际结构
- 分页 records / total 的真实路径
- 是否已有公共 `Res<T>` / `ResPage<T>` 或等价类型

识别优先级固定为：

1. 用户提供的现有业务模块代码
2. 当前仓库已有 API 与列表页实现
3. 用户口头说明
4. Swagger / OpenAPI 本身可确认的信息
5. 通用占位写法

如果无法确认项目约定，不要强猜；应降级为通用草稿模式，并在“待确认项”中明确标注“需人工确认”。

### 模式切换规则

#### 项目适配模式

当 request 封装、分页参数、响应类型或响应结构已经确认时：

- 优先复用项目已有写法
- 优先复用项目已有 `Res<T>` / `ResPage<T>` 或等价类型
- 直接按项目约定生成 API 与 `useTablePage` 映射代码

#### 兼容映射模式

当响应结构已知，但不是 `Res<T>` / `ResPage<T>` 时：

- 复用项目实际响应结构或类型命名
- 不强行改写成 `Res<T>` / `ResPage<T>`
- 只保证最终映射到 `useTablePage` 所需的 `{ records, total }`

#### 通用草稿模式

当 request 封装、响应解包层级、分页字段路径都无法确认时：

- 仅输出可改造的最小 API 草稿
- 使用占位 request 写法
- 显式保留兼容映射占位代码
- 所有不确定项统一进入“待确认项”

### 模式输出模板

所有模式都建议先输出一段极短判断：

```md
接入模式：项目适配模式 / 兼容映射模式 / 通用草稿模式
已识别约定：
- request：`...`
- 分页参数：`...`
- 响应类型：`...`
- 列表映射：`...`
```

#### 项目适配模式模板

```ts
import useAxios from '@base-lib/hooks/core/useAxios'
import type { XxxListItemModel, XxxQueryModel } from '../model'

const request = useAxios()

export const loadPage = (params: XxxQueryModel) => {
  return request.get<ResPage<XxxListItemModel>>({
    url: '/xxx/page',
    params
  })
}

const [list, { page, loading, loadList, reloadList, onChange }] = useTablePage(({ current, size }) =>
  loadPage({ ...search.value, pageNum: current, pageSize: size }).then(res => ({
    records: res.data.records,
    total: res.data.total
  })))
```

#### 兼容映射模式模板

```ts
import { requestInstance } from '@/request'
import type { PageResult } from '@/types/api'
import type { XxxListItemModel, XxxQueryModel } from '../model'

export const loadPage = (params: XxxQueryModel) => {
  return requestInstance.get<PageResult<XxxListItemModel>>('/xxx/page', {
    params
  })
}

const [list, { page, loading, loadList, reloadList, onChange }] = useTablePage(({ current, size }) =>
  loadPage({ ...search.value, current, size }).then(res => ({
    records: res.result.list,
    total: res.result.total
  })))
```

要点：复用项目已有响应类型命名，不强行改写成 `Res<T>` / `ResPage<T>`，只在 `useTablePage` 前完成 `{ records, total }` 映射。

#### 通用草稿模式模板

```md
接入模式：通用草稿模式
未识别到项目 request / 响应约定，以下代码为可改造草稿。
```

```ts
export const loadPage = (params: XxxQueryModel) => {
  return request.get({
    url: '/xxx/page',
    params
  })
}

const [list, { page, loading, loadList, reloadList, onChange }] = useTablePage(({ current, size }) =>
  loadPage({
    ...search.value,
    pageNum: current,
    pageSize: size
  }).then(res => ({
    records: res.data?.records ?? [],
    total: res.data?.total ?? 0
  })))
```

如果这里的 `request`、`pageNum / pageSize`、`res.data.records / res.data.total` 都无法确认，必须放入“待确认项”，并明确写出“需人工确认”。

## 3. 查询表单

至少生成：

- `generateFormItems(...)`
- `GxForm` 示例
- 查询模型默认值
- 查询与重置的基本交互说明

默认按以下层级组织示例，避免一上来就输出复杂自定义：

1. 基础版：`generateFormItems + GxSearch` 完成标准查询表单
2. slot 版：当搜索项需要模板化自定义时，补 `#form-item-字段名`
3. render 版：当单个表单项更适合函数式组合时，补 `generateFormItems.render`

## 4. 表格分页 + 操作列

至少生成：

- `generateTableColumns(...)` — 只配置数据列，不包含操作列
- `useTablePage(...)`
- `GxPaginationTable` 示例
- `loading`、`page`、`total`、`onChange` 的联动方式
- 操作列（编辑/删除按钮）

这里必须遵循当前推荐链路：

- 使用 `generateTableColumns`
- 使用 `generateFormItems`
- 使用 `useTablePage`
- 使用 `GxForm`
- 使用 `GxPaginationTable`
- 不回退到已移除的 `getEPTableColumns`

操作列规则：

- **统一通过 `GxPaginationTable` 的 `#action` slot 渲染**，不在 `generateTableColumns` 中使用 render 配置
- 编辑按钮：`<ElButton link type="primary">`，调用弹窗组件的 `initEdit(row)` 方法
- 删除按钮：使用 `<ElPopconfirm title="是否删除?" placement="left">` 二次确认
- 删除操作使用 try/catch 错误处理

其他展示与查询自定义规则：

- 普通数据列默认优先使用 `generateTableColumns` 的基础字段配置
- 单列轻定制：用 `#table-column-字段名` 或 `generateTableColumns.render`
- 查询项 / 表单项定制：用 `#form-item-字段名` 或 `generateFormItems.render`
- 局部展示替换：优先更直观的写法，必要时补另一种
- 如果表格整体结构差异较大，再使用 `GxPaginationTable` 的 `#default` 接管整个表格区域
- 操作列仍然优先 `#action` slot，不要改成 render

推荐示例层级：

1. 基础版：`columns + #action + #action-bar`
2. slot 版：补 `#table-column-字段名`、`#form-item-字段名`、`#footer`
3. render 版：补 `generateTableColumns.render`、`generateFormItems.render`
4. 整表版：仅在结构差异明显时补 `#default`

render / slot 判断原则：

- 字段级展示：优先 `render`
- 模板级展示：优先具名 slot
- 重业务逻辑：下沉到方法、组合式函数或子组件

操作列 slot 模板：

```vue
<template #action="{ row }">
  <ElButton link type="primary" @click="handleEdit(row)">编辑</ElButton>
  <ElPopconfirm title="是否删除?" placement="left" @confirm="handleDel(row)">
    <template #reference>
      <ElButton link type="danger">删除</ElButton>
    </template>
  </ElPopconfirm>
</template>
```

## 5. 弹窗组件

生成独立文件 `components/xxx-add.vue`，使用 `ElDialog`。

核心模式：

- `defineOptions({ name: 'XxxAdd' })` 设置组件名称
- `useToggle` 管理显隐，额外维护 `loading` 状态
- `useStateRef` 管理表单数据（支持 reset）
- `computed` 判断 `isEdit`（基于 `form.value.id` 是否存在）
- `defineExpose({ init, initEdit })` 暴露方法给父组件
- 提交成功后 `emit('submitted')` 通知父组件刷新
- `@closed` 事件中重置表单
- CRUD 操作使用 try/catch/finally 错误处理，finally 中关闭 loading

表单生成策略（混合模式）：

1. 简单字段（input、select、textarea）：使用 `generateFormItems` + `GxForm` 自动生成
2. 复杂字段（树选择器、上传、自定义组件）：手动 `ElFormItem`
3. 在输出中明确标注哪些是自动生成、哪些需要手动补充

弹窗表单规范：

- `ElForm` 设置 `label-width="120px"`
- 表单验证使用 `reactive<FormRules>`
- 表单区域添加 `v-loading="loading"`
- 取消和确定按钮都添加 `:loading="loading"`

## 6. 主页面集成

生成完整 `index.vue`，集成搜索、表格、操作列和弹窗组件。

### MANDATORY OUTPUT INVARIANTS

在输出任何 `index.vue` 之前，必须先检查以下不变量：

1. **根节点不变量**：`<template>` 的直接子元素有且仅有一个 `<div class="模块名-kebab-case">`
2. `GxPaginationTable`、弹窗组件、以及其他兄弟内容都必须包裹在这个根 `<div>` 内
3. 如果 `GxPaginationTable` 与任意弹窗组件在 `<template>` 下成为兄弟节点，则判定为**错误输出**，必须重写
4. 该规则是**硬约束**，优先级高于常见 Vue 页面习惯写法，不允许省略

关键规范：

- `defineOptions({ name: 'XxxManage' })` 设置组件名称
- `defineAsyncComponent` 异步加载弹窗组件
- **模板必须有且仅有一个根节点 `<div class="模块名-kebab-case">`，所有内容（GxPaginationTable、弹窗组件等）必须包裹在该 div 内部**
- `GxSearch` 使用 `v-model="search"` 绑定
- 操作列通过 `#action` slot 渲染（见段落 4）
- 新增按钮通过 `#action-bar` slot 渲染
- 高级搜索项：补 `#form-item-字段名` 或 `generateFormItems.render`
- 单列展示定制：补 `#table-column-字段名` 或 `generateTableColumns.render`
- 整表结构重写：用 `GxPaginationTable` 的 `#default`
- 弹窗组件使用 `useTemplateRef` 获取组件 / 表单实例引用
- 组件 ref：`useTemplateRef('XxxAddRef')`
- 表单 ref：`useTemplateRef('FormRef')`
- 弹窗的 `@submitted` 事件触发 `reloadList()`

### MANDATORY — 根节点结构

正确：

```vue
<template>
  <div class="模块名-kebab-case">
    <GxPaginationTable ...>...</GxPaginationTable>
    <XxxAdd ref="XxxAddRef" @submitted="reloadList" />
  </div>
</template>
```

错误（禁止）：

```vue
<template>
  <GxPaginationTable ...>...</GxPaginationTable>
  <XxxAdd ref="XxxAddRef" @submitted="reloadList" />
</template>
```

> **绝对禁止**输出无根节点的多根节点模板。弹窗组件（Add/Edit Dialog）与 GxPaginationTable 是兄弟节点，必须统一包裹在根 `<div>` 内。

### Final Output Checklist

输出 `index.vue` 前，逐项确认：

- [ ] `<template>` 只有一个直接子节点
- [ ] 该直接子节点是 `<div class="模块名-kebab-case">`
- [ ] `GxPaginationTable` 在该根节点内
- [ ] 所有弹窗 / 异步组件在该根节点内
- [ ] 没有把 `GxPaginationTable` 和弹窗组件并列放在 `<template>` 下
- [ ] 如果发现双根节点结构，已重写而不是保留

## 7. 类型导出

各目录 `index.ts` 统一导出。model 和 api 的类型定义通过文件内直接 export 暴露。

## 8. 待确认项

这一段必须始终输出。

凡是以下情况，都统一使用“需人工确认”这句措辞，不要改写成模糊表达：

- 推断生成的字段类型
- 缺失的枚举 options
- 不确定的日期 / 时间格式
- 不确定的请求方式、响应映射、模块路径、鉴权或 headers

待确认项建议按两级组织：

### 必确认

- request 实例名称、导入路径、初始化方式
- 请求方法是否为 `GET` / `POST`
- 分页参数命名是否为 `current / size`、`pageNum / pageSize` 或其他项目约定
- 响应是否已经由 request 层或拦截器解包
- `records` / `total` 的真实路径是否已确认
- 是否已有全局 `Res<T>` / `ResPage<T>` 或等价类型
- 模块名与落地路径是否已确定

### 可后补

- 字段语义不明确项
- `select` 类型字段的 options 缺失项
- 日期字段的查询格式与展示格式
- 是否还需要操作列
- 是否需要扩展 CRUD / action
- 请求封装、鉴权、headers 是否需要对接项目实际实现
- 弹窗表单字段是否与列表展示字段一致
- 是否有复杂字段需要手动覆盖（树选择器、上传等）
- 操作列按钮权限控制
- 是否需要详情页
- 弹窗宽度是否合适

## Field Inference Rules

采用**半自动推断**：允许有限推断，但所有推断项都必须明确标注“需人工确认”。

### Query fields

#### 倾向生成 `input`

- `keyword`
- `name`
- `title`
- `code`
- `id`
- `remark`
- `phone`
- `email`

#### 倾向生成 `select`

- `status`
- `type`
- `category`
- `level`
- `bizType`

如果这样推断了，必须明确说明：

- 这是推断生成
- options 未知
- 需人工确认

#### 倾向生成时间范围候选

- `startTime / endTime`
- `beginTime / endTime`
- `createTimeStart / createTimeEnd`
- `dateRange`

如果这样推断了，必须明确说明：

- 这是推断生成
- 值格式需人工确认
- 提交字段映射需人工确认

### Table columns

优先使用列表响应 schema 生成列。

可直接出列的字段：

- 文本字段
- 数字字段
- 布尔字段
- 语义明确的基础字段

谨慎处理的字段：

- 超长文本
- 嵌套对象
- 数组
- 字典编码字段
- 时间戳 / 日期格式字段

对这些字段：

- 可以保留列
- 但不要默认补复杂 `render`
- 要提醒用户确认展示格式或是否需要自定义渲染
- 如需自定义渲染，可按场景补 `#table-column-字段名` slot 或 `generateTableColumns.render` 两种方案，而不是固定只给一种

## Response Structure Convention

如果当前上下文已确认项目采用以下统一响应约定：

```ts
export interface Res<T> {
  code: string
  data: T
  message: string
  ok: boolean
}

export type ResPage<T> = Res<{
  current: number
  optimizeCountSql: boolean
  orders: any[]
  pages: number
  records: T[]
  searchCount: boolean
  size: number
  total: number
}>
```

则默认按以下方式映射：

- 列表数据：`res.data.records`
- 总数：`res.data.total`
- 返回给 `useTablePage`：`{ records, total }`

如果用户项目已有公共 `Res` / `ResPage` 类型，应优先复用现有类型定义，不重复内联。

如果用户项目使用的是等价类型，例如 `ApiResult<T>`、`PageResult<T>`、`ResultPage<T>`、`CommonResponse<T>`，也应优先复用，不要强行改写成 `Res` / `ResPage`。

如果找不到现成公共类型，但列表响应结构已经可以确认，优先生成局部 response alias 或局部占位类型，不要默认创建项目级公共 `Res` / `ResPage`。

无论上游响应体是什么结构，最终返回给 `useTablePage` 的稳定契约都应为：

```ts
{ records, total }
```

如果无法确认项目是否沿用这套结构，则不要强行假设。应：

- 把 `data / records / total` 结构恢复为待确认项
- 生成兼容映射占位代码
- 明确说明当前属于通用草稿模式或兼容映射模式

## Directory Contract

当用户要求输出落地代码时，默认按以下结构生成：

```text
模块名称/
  api/
    index.ts
  model/
    index.ts
  index.vue
  components/
    ...
  其他目录/
    ...
```

### 必生成

- `api/index.ts`
- `model/index.ts`
- `index.vue`
- `components/xxx-add.vue`

### 条件生成

- `components/`：只有确实需要拆查询区、操作栏、弹窗或其他子组件时才生成
- 其他目录：只有用户明确要求或页面主链路确实需要时才生成

## Do Not Guess

不要擅自猜测以下内容：

- 枚举 options
- 鉴权方案
- headers / 租户字段
- 项目里的 request 实例名
- 响应是否已经被 request 层或拦截器解包
- `records` / `total` 所在层级路径
- request 返回值是否已经是业务数据
- 权限控制
- 复杂操作列业务逻辑
- 未在文档中体现的业务规则

如果这些信息缺失，应进入“待确认项”，而不是编造成既定事实。

## Degrade Gracefully

### 页面不可访问

不要卡住或反复重试。直接告诉用户改提供：

- OpenAPI JSON
- 请求 / 响应示例

### 信息不足

如果输入不足以支撑完整主链路：

- 输出结构草稿
- 明确保留待确认项
- 不假装已经确定所有字段

### 输出过长

如果上下文长度受限：

- 可以压缩代码细节
- 但必须保留“待确认项（精简版）”

## Default Behavioral Constraints

- 默认生成完整 CRUD 页面（查询 + 新增/编辑弹窗 + 操作列）
- 默认不做额外抽象
- 优先给最小可用 CRUD 主链路
- 用户一旦提供目录结构，再切换到落地代码模式

## Example Framing

如果用户说：

> 给你一个 Swagger 地址，帮我生成列表页

而当前上下文已经明确这是 `ep-comp` 项目，那么你应直接进入此 skill，并按八段结构输出。

如果用户说：

> 根据这个接口生成查询条件和分页表格

也应优先按 `generateFormItems + GxForm + generateTableColumns + useTablePage + GxPaginationTable` 的主链路来组织答案。

## Success Criteria

一次成功输出至少应满足：

- 正确识别分页接口的请求参数与返回结构
- 输出 `Model`、`API`、`查询表单`、`表格分页 + 操作列`、`弹窗组件`、`主页面集成`、`类型导出`、`待确认项` 八段结构
- Model 包含 QueryModel、ListItemModel、FormModel 三个模型，所有字段含块注释
- API 包含 loadPage、add、update、removeById 四个接口
- 弹窗组件使用 ElDialog + try/catch/finally + loading 状态
- 主页面模板有且仅有一个根节点 `<div class=”模块名-kebab-case”>`，GxPaginationTable 和弹窗组件等全部内容包裹在其内部（**无例外，无省略**），defineAsyncComponent 加载弹窗
- 推断项明确标注”需人工确认”
- 用户补充模块名或目录结构后，可继续生成落地代码

## API Reference

在生成代码前，**必须先阅读 [API Reference](./reference.md)**，了解所有组件 Props、函数签名、类型定义和完整使用模板。

reference.md 包含以下内容：

- `@gx-web/core`：`@FieldName`、`getModelFromJson`、`getModelFieldName`
- `@gx-web/tool`：`useTablePage`、`useStateRef`、`useToggle`
- `vue`：`useTemplateRef`
- `vue-component-type-helpers`：`ComponentExposed`
- `@gx-web/ep-comp`：`generateTableColumns`、`generateFormItems`、`GxPaginationTable`、`GxForm`、`GxSearch`、`useComponentMap`
- 所有类型定义：`EPTableColumnConfigType`、`EPFormItemConfigType`、`GxFormProps`、`GxPaginationTableProps`
- 完整 CRUD 页面模板（index.vue + model + api + dialog component）
