# @gx-web/ep-comp API Reference

本文件从 `gx-web-lib` monorepo 源码中提取，供 skill 生成代码时参照。

---

## 1. @gx-web/core — 装饰器与工具

### @FieldName(fieldName)

为类属性标记可读名称，供 `generateTableColumns` / `generateFormItems` 自动生成 label。

```ts
import { FieldName } from '@gx-web/core'

export class AlarmVO {
  @FieldName('告警代码')
  alarmCode!: string
}
```

### getModelFromJson(constructor, json?)

实例化类并合并默认值与传入数据。

```ts
import { getModelFromJson } from '@gx-web/core'

const instance = getModelFromJson(AlarmVO)         // 使用默认值
const instance = getModelFromJson(AlarmVO, { id: '1' }) // 覆盖指定字段
```

**签名：**

```ts
function getModelFromJson<T extends object>(
  constructor: new () => T,
  json?: Partial<T>
): T
```

### getModelFieldName(constructor, fieldKey)

获取属性的可读名称（读取 `@FieldName` 装饰器值），无装饰器时返回属性名本身。

```ts
getModelFieldName(AlarmVO, 'alarmCode') // '告警代码'
```

### getModelClassName(constructor)

获取 `@ClassName` 装饰器标记的类可读名称。

---

## 2. @gx-web/tool — Hooks

### useTablePage

分页列表数据管理 Hook，返回列表数据和操作方法。

**签名：**

```ts
type OnLoad<T> = (params: {
  current: number
  size: number
}) => Promise<{ records: T[]; total: number }>

function useTablePage<T>(
  onLoad: OnLoad<T>,
  userConfig?: Partial<{ pageSize: number }> // 默认 pageSize: 20
): readonly [
  T[],
  {
    loading: Ref<boolean>
    setLoading: (val?: boolean) => void
    loadList: () => Promise<T[]>
    reloadList: () => Promise<T[]>   // 重置到第1页并重新加载
    setPage: (params: Partial<{ current: number; size: number; total: number }>) => void
    resetPage: () => void
    resetParams: () => void           // 等价于 resetPage
    page: Ref<{ current: number; size: number; total: number }>
    onCurrentChange: () => void
    onSizeChange: () => void
    onChange: () => void
  }
]
```

**使用示例：**

```ts
const [list, { page, loading, loadList, reloadList, onChange }] = useTablePage(
  ({ current, size }) =>
    loadPage({ ...search.value, pageNum: current, pageSize: size }).then(res => ({
      records: res.data.records,
      total: res.data.total
    }))
)

onMounted(loadList)
```

**要点：**

- `onLoad` 回调必须返回 `Promise<{ records: T[]; total: number }>`
- `loadList` 使用当前 page 参数请求；`reloadList` 重置到第1页再请求
- `page` 是一个响应式对象 `{ current, size, total }`

### useStateRef

响应式状态管理，支持设置与重置。

**签名：**

```ts
function useStateRef<T extends AnyObject>(createState: () => T): [
  Ref<UnwrapRef<T>>,
  (params: DeepPartial<T> | ((state: UnwrapRef<T>) => void)) => void,
  () => void  // reset
]
```

**使用示例：**

```ts
const [search, , resetSearch] = useStateRef(() => getModelFromJson(AlarmVO))
```

---

## 3. @gx-web/ep-comp — 生成函数

### generateTableColumns

根据 Model 类和字段配置生成表格列配置。

**签名：**

```ts
type FieldConfig<T> =
  | Extract<InstanceKey<T>, string>   // 字符串简写
  | EPTableColumnConfigType<T>        // 完整配置对象

function generateTableColumns<T extends NoArgConstructor>(
  constructor: T,
  fieldsConfig: Array<FieldConfig<T>>
): EPTableColumnConfigType<T>[]
```

**使用示例：**

```ts
const columns = generateTableColumns(AlarmVO, [
  'deviceSn',          // 字符串简写，自动从 @FieldName 取 label
  'alarmCode',
  'alarmTime',
  { prop: 'createTime', label: '创建时间', width: 180 }, // 完整配置
  { prop: 'status', type: 'select', props: { options: statusOptions } }
])
```

### generateFormItems

根据 Model 类和字段配置生成表单项配置。未指定 `type` 时默认为 `'input'`。

**签名：**

```ts
function generateFormItems<T extends NoArgConstructor>(
  constructor: T,
  fieldsConfig: Array<FieldConfig<T>>
): EPFormItemConfigType<T>[]
```

**使用示例：**

```ts
const searchItems = generateFormItems(AlarmVO, [
  'deviceSn',                                    // 默认 input
  { prop: 'status', type: 'select' },            // select
  { prop: 'alarmTime', type: 'input', props: { type: 'datetime' } } // 带属性
])
```

---

## 4. @gx-web/ep-comp — 类型定义

### EPTableColumnConfigType

```ts
interface EPTableColumnConfigType<T extends NoArgConstructor> {
  type?: ComponentKeyType              // 'input' | 'select' | 自定义注册的类型
  props?: Partial<ComponentPropsMap[ComponentKeyType]>  // 组件属性
  prop?: InstanceKey<T>                // 字段名
  hide?: boolean | ((data: InstanceType<T>[]) => boolean)
  label?: string                       // 列标题
  width?: string | number
  minWidth?: string | number
  sort?: number
  fixed?: boolean | 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  render?: (scope: { row: InstanceType<T>; column: any; $index: number }) => ReturnType<typeof defineComponent>
  headerRender?: (scope: { column: any; $index: number }) => ReturnType<typeof defineComponent>
}
```

### EPFormItemConfigType

```ts
interface EPFormItemConfigType<T extends NoArgConstructor> {
  type?: ComponentKeyType              // 'input' | 'select' | 自定义注册的类型
  props?: Partial<ComponentPropsMap[ComponentKeyType]>  // 组件属性
  prop?: InstanceKey<T>                // 字段名
  label?: string                       // 标签文本
  labelPosition?: 'left' | 'right' | 'top'
  labelWidth?: string | number
  required?: boolean
  rules?: Arrayable<FormItemRule>
  error?: string
  showMessage?: boolean
  inlineMessage?: string | boolean
  size?: '' | 'large' | 'default' | 'small'
  for?: string
  validateStatus?: '' | 'error' | 'validating' | 'success'
  sort?: number
  hide?: boolean | ((form: InstanceType<T>) => boolean)
  col?: ColConfigType                  // 栅格布局配置
  render?: (form: InstanceType<T>) => ReturnType<typeof defineComponent>
}
```

### ComponentKeyType

当前默认注册的组件类型：`'input'` | `'select'`。可通过 `useComponentMap` 注册更多类型。

---

## 5. @gx-web/ep-comp — 组件

### GXPaginationTable

分页表格容器，集成表格 + 分页组件。

**Props：**

```ts
interface GXPaginationTableProps {
  loading?: boolean          // 加载状态，默认 false
  data?: any[]               // 列表数据，默认 []
  columns?: GXTableProps['columns']  // 表格列配置，默认 []
  total?: number             // 数据总条数，默认 0
  pagination?: boolean       // 是否显示分页，默认 true
  tableProps?: Partial<GXTableProps> // 透传给 GXTable 的属性
}
```

**v-model：**

- `page` — 当前页码，默认 `1`
- `limit` — 每页条数，默认 `10`

**Events：**

- `pagination` — 分页参数变化时触发，payload: `{ page: number, limit: number }`

**Slots：**

- `header` — 搜索区/头部内容
- `action-bar` — 操作栏
- `default` — 默认插槽（替换整个表格区域）
- `footer` — 底部内容

**典型用法：**

```vue
<GXPaginationTable
  v-model:page="page.current"
  v-model:limit="page.size"
  :columns="columns"
  :data="list"
  :loading="loading"
  :total="page.total"
  @pagination="onChange"
>
  <template #header>
    <GXSearch :items="searchItems" :form="search" @submit="loadList" @reset="resetSearch();reloadList()" />
  </template>
</GXPaginationTable>
```

> **注意**：`v-model:page` 绑定的是 `page.current`（页码数字），`v-model:limit` 绑定的是 `page.size`（每页条数数字），而不是直接绑定整个 `page` 对象。

### GXForm

自动生成表单项的表单组件，基于 Element Plus ElForm。

**Props（GXFormProps）：**

```ts
interface GXFormProps {
  items?: EPFormItemConfigType<any>[]   // 表单项配置
  row?: RowConfigType                    // 栅格布局
  loading?: boolean                      // 加载状态
  submitText?: string                    // 提交按钮文字，默认 '提 交'
  resetText?: string                     // 重置按钮文字，默认 '重 置'
  rules?: Record<string, any>            // 验证规则
  inline?: boolean                       // 行内模式，默认 false
  labelPosition?: 'left' | 'right' | 'top'
  labelWidth?: string | number
  labelSuffix?: string
  hideRequiredAsterisk?: boolean
  showMessage?: boolean
  inlineMessage?: boolean
  statusIcon?: boolean
  size?: '' | 'large' | 'default' | 'small'
  disabled?: boolean
}
```

**v-model：** 表单数据对象

**Events：**

- `submit` — 提交表单
- `reset` — 重置表单

### GXSearch

搜索表单组件，基于 GXForm，默认开启 `inline` 模式，提交按钮文字默认为 `'查 询'`。

**Props：** 同 `GXFormProps`

**v-model：** 表单数据对象

**Events：**

- `submit(form)` — 查询
- `reset` — 重置

---

## 6. 完整列表页模板

```vue
<script setup lang="ts">
import { useStateRef, useTablePage } from '@gx-web/tool'
import { onMounted } from 'vue'
import { getModelFromJson } from '@gx-web/core'
import { GXPaginationTable, GXSearch, generateFormItems, generateTableColumns } from '@gx-web/ep-comp'
import { XxxModel } from './model'
import { loadPage } from './api'

const [search, , resetSearch] = useStateRef(() => getModelFromJson(XxxModel))

const [list, { page, loading, loadList, reloadList, onChange }] = useTablePage(
  ({ current, size }) =>
    loadPage({ ...search.value, pageNum: current, pageSize: size }).then(res => ({
      records: res.data.records,
      total: res.data.total
    }))
)

const columns = generateTableColumns(XxxModel, [
  'field1',
  'field2',
  'field3'
])

const searchItems = generateFormItems(XxxModel, [
  'field1',
  { prop: 'field2', type: 'select' }
])

onMounted(loadList)
</script>

<template>
  <GXPaginationTable
    v-model:page="page.current"
    v-model:limit="page.size"
    :columns="columns"
    :data="list"
    :loading="loading"
    :total="page.total"
    @pagination="onChange"
  >
    <template #header>
      <GXSearch :items="searchItems" :form="search" @submit="loadList" @reset="resetSearch();reloadList()" />
    </template>
  </GXPaginationTable>
</template>
```

### Model 文件模板

```ts
// model/index.ts
import { FieldName } from '@gx-web/core'

export class XxxQueryModel {
  @FieldName('关键字')
  keyword!: string
}

export class XxxListItemModel {
  @FieldName('字段1')
  field1!: string

  @FieldName('字段2')
  field2!: string
}
```

### API 文件模板

```ts
// api/index.ts
import useAxios from '@base-lib/hooks/core/useAxios'
import type { XxxListItemModel, XxxQueryModel } from '../model'

const request = useAxios()

export const loadPage = (params: XxxQueryModel) => {
  return request.get<ResPage<XxxListItemModel>>({
    url: '/xxx/page',
    params
  })
}
```

---

## 7. 组件注册系统

### useComponentMap

组件映射管理，默认注册了 `input`（GXInput）和 `select`（GXSelect）。

```ts
const { registerComponent, registerComponents, getComponent, getAllComponents, hasComponent } = useComponentMap()

// 注册单个组件
registerComponent('date-picker', MyDatePicker)

// 批量注册
registerComponents({
  'date-picker': MyDatePicker,
  'cascader': MyCascader
})
```

---

## 8. 响应类型约定

```ts
interface Res<T> {
  code: string
  data: T
  message: string
  ok: boolean
}

type ResPage<T> = Res<{
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

映射方式：`res.data.records` → 列表数据，`res.data.total` → 总数。
