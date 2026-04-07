---
name: ep-comp-swagger-list-page
description: Generate ep-comp pagination list page scaffolds from Swagger, Knife4j, OpenAPI JSON, or request/response examples. Use this whenever the user wants to turn API docs into `generateTableColumns`, `generateFormItems`, `useTablePage`, `GXForm`, and `GXPaginationTable` based list pages, even if they only say "根据 Swagger 生成列表页". If the context clearly points to an `@gx-web/ep-comp` list page, use this skill proactively.
---

# ep-comp Swagger 列表页生成

## Overview

这个 skill 用于把 Swagger / Knife4j / OpenAPI 文档，或用户直接提供的请求/响应示例，转成基于 `@gx-web/ep-comp` 的分页列表页接入代码。

目标不是解释单个组件 API，而是生成列表页主链路：

- `generateTableColumns`
- `generateFormItems`
- `useTablePage`
- `GXForm`
- `GXPaginationTable`

默认只覆盖**单个分页查询页面**。只有用户明确要求时，才扩展到 CRUD、详情、操作列方案等内容。

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
- 用户只问 `GXForm` 或 `GXPaginationTable` 的 props
- 用户要做的是新增页、详情页、弹窗页，而不是分页列表页
- 用户给的是接口文档，但目标不是 `ep-comp` 体系
- 用户仅想阅读 Swagger 文档，不需要生成页面骨架

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

输出固定为以下五段，顺序不要变：

1. `Model`
2. `API`
3. `查询表单`
4. `表格分页`
5. `待确认项`

这样做的原因是：第三方接入更关心“能否直接抄用”和“哪里还要自己补”，固定结构比自由发挥更稳定。

---

## 1. Model

至少生成：

- `XxxQueryModel`
- `XxxListItemModel`

命名规则：

- 默认统一使用 `Model` 结尾
- 如果用户已显式给出命名，遵循用户命名
- 不默认切换到 `VO`

字段处理原则：

- 优先保留文档中能确认的字段
- 字段中文语义清楚时，可用 `@FieldName(...)`
- 类型或含义不明确时，不要强猜，统一放到“待确认项”里，并明确写出“需人工确认”

## 2. API

至少生成：

- 分页接口函数
- 请求参数类型
- 响应类型
- 与 `useTablePage` 对接的返回映射

约束：

- 不假设用户项目里的请求实例名
- 可用占位写法，例如 `request.post(...)`
- 必须提示用户替换为项目里的真实请求封装
- 最终都要落到 `useTablePage` 需要的 `Promise<{ records, total }>` 契约

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
- `GXForm` 示例
- 查询模型默认值
- 查询与重置的基本交互说明

## 4. 表格分页

至少生成：

- `generateTableColumns(...)`
- `useTablePage(...)`
- `GXPaginationTable` 示例
- `loading`、`page`、`total`、`onChange` 的联动方式

这里必须遵循当前推荐链路：

- 使用 `generateTableColumns`
- 使用 `generateFormItems`
- 使用 `useTablePage`
- 使用 `GXForm`
- 使用 `GXPaginationTable`
- 不回退到已移除的 `getEPTableColumns`

## 5. 待确认项

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

- 默认只做单个分页查询页面
- 默认不扩展到 CRUD / 详情 / 权限
- 默认不做额外抽象
- 优先给最小可用主链路
- 用户一旦提供目录结构，再切换到落地代码模式

## Example Framing

如果用户说：

> 给你一个 Swagger 地址，帮我生成列表页

而当前上下文已经明确这是 `ep-comp` 项目，那么你应直接进入此 skill，并按五段结构输出。

如果用户说：

> 根据这个接口生成查询条件和分页表格

也应优先按 `generateFormItems + GXForm + generateTableColumns + useTablePage + GXPaginationTable` 的主链路来组织答案。

## Success Criteria

一次成功输出至少应满足：

- 正确识别分页接口的请求参数与返回结构
- 输出 `Model`、`API`、`查询表单`、`表格分页`、`待确认项` 五段结构
- 推断项明确标注“需人工确认”
- 不擅自扩展到未要求的业务能力
- 用户补充模块名或目录结构后，可继续生成落地代码

## API Reference

在生成代码前，**必须先阅读 [API Reference](./reference.md)**，了解所有组件 Props、函数签名、类型定义和完整使用模板。

reference.md 包含以下内容：

- `@gx-web/core`：`@FieldName`、`getModelFromJson`、`getModelFieldName`
- `@gx-web/tool`：`useTablePage`、`useStateRef`
- `@gx-web/ep-comp`：`generateTableColumns`、`generateFormItems`、`GXPaginationTable`、`GXForm`、`GXSearch`、`useComponentMap`
- 所有类型定义：`EPTableColumnConfigType`、`EPFormItemConfigType`、`GXFormProps`、`GXPaginationTableProps`
- 完整列表页模板（index.vue + model + api）
