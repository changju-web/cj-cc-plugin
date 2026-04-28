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

响应式状态管理,支持设置与重置。

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

### useTemplateRef

用于获取模板 ref，Vue 3.3+ 支持自动类型推导。

**使用示例：**

```ts
import { useTemplateRef } from 'vue'

// 自定义组件 ref（自动推导类型）
const XxxAddRef = useTemplateRef('XxxAddRef')
XxxAddRef.value?.init()

// Element Plus 表单 ref
const FormRef = useTemplateRef('FormRef')
await FormRef.value?.validate()
```

**要点：**

- Vue 3.3+ 自动从模板中的 ref 推导类型，无需泛型参数
- ref 名称需与模板 `ref="..."` 保持一致
- 类型推导基于组件的 `defineExpose` 或组件实例类型

### useToggle

布尔值状态切换,常用于 loading 切换和对话框显隐。默认值为 `false`。

**签名：**

```ts
function useToggle(defaultValue?: boolean): [Ref<boolean>, (value?: boolean) => void]
```

**使用示例：**

```ts
// 对话框显隐
const [visible, setVisible] = useToggle(false)
setVisible(true)   // 打开
setVisible(false)  // 关闭

// Loading 状态
const [loading, setLoading] = useToggle(false)
setLoading(true)   // 开始加载
setLoading(false)  // 结束加载
```

---

## 3. @gx-web/ep-comp — 生成函数

### generateTableColumns

根据 Model 类和字段配置生成表格列配置。

**基础版：**

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

**render 版：**

```ts
import { h } from 'vue'
import { ElTag } from 'element-plus'

const columns = generateTableColumns(AlarmVO, [
  'deviceSn',
  {
    prop: 'alarmCode',
    label: '告警代码',
    minWidth: 160,
    render: ({ row }) => h(
      ElTag,
      { type: row.alarmCode ? 'danger' : 'info' },
      () => row.alarmCode || '未配置'
    )
  },
  {
    prop: 'alarmTime',
    label: '告警时间',
    minWidth: 180,
    render: ({ row }) => h('span', row.alarmTime || '--')
  }
])
```

> 字段级展示用 `render`；操作列仍用 `#action`。

### generateFormItems

根据 Model 类和字段配置生成表单项配置。未指定 `type` 时默认为 `'input'`。

**基础版：**

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

**render 版：**

```ts
import { h } from 'vue'
import { ElButton, ElInput } from 'element-plus'

const formItems = generateFormItems(AlarmFormModel, [
  'alarmCode',
  {
    prop: 'alarmDetail',
    label: '告警详情',
    render: form => h('div', { style: 'display:flex;gap:8px;width:100%;' }, [
      h(ElInput, {
        modelValue: form.alarmDetail,
        'onUpdate:modelValue': (value: string) => {
          form.alarmDetail = value
        },
        placeholder: '请输入告警详情'
      }),
      h(ElButton, {
        onClick: () => {
          form.alarmDetail = form.alarmDetail?.trim?.() || ''
        }
      }, () => '去空格')
    ])
  }
])
```

> 单项复合控件用 `render`；模板化展示用 `#form-item-xxx`。

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

### GxPaginationTable

分页表格容器，集成表格 + 分页组件。

**Props：**

```ts
interface GxPaginationTableProps {
  loading?: boolean          // 加载状态，默认 false
  data?: any[]               // 列表数据，默认 []
  columns?: GxTableProps['columns']  // 表格列配置，默认 []
  total?: number             // 数据总条数，默认 0
  pagination?: boolean       // 是否显示分页，默认 true
  tableProps?: Partial<GxTableProps> // 透传给 GxTable 的属性
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
- `action` — 操作列具名插槽，常用于编辑/删除/更多操作
- `table-column-字段名` — 单列展示插槽，适合状态标签、字典翻译、局部交互
- `default` — 默认插槽（替换整个表格区域）
- `footer` — 底部内容

**基础版：**

```vue
<GxPaginationTable
  v-model:page="page.current"
  v-model:limit="page.size"
  :columns="columns"
  :data="list"
  :loading="loading"
  :total="page.total"
  @pagination="onChange"
>
  <template #header>
    <GxSearch v-model="search" :items="searchItems" @submit="loadList" @reset="resetSearch();reloadList()" />
  </template>

  <template #action="{ row }">
    <ElButton link type="primary" @click="handleEdit(row)">编辑</ElButton>
  </template>
</GxPaginationTable>
```

**slot 版：**

```vue
<GxPaginationTable
  v-model:page="page.current"
  v-model:limit="page.size"
  :columns="columns"
  :data="list"
  :loading="loading"
  :total="page.total"
  @pagination="onChange"
>
  <template #table-column-alarm-code="{ row }">
    <ElTag :type="row.alarmCode ? 'danger' : 'info'">{{ row.alarmCode || '未配置' }}</ElTag>
  </template>

  <template #footer>
    <div>当前页 {{ list.length }} 条，共 {{ page.total }} 条</div>
  </template>
</GxPaginationTable>
```

**整表版：**

```vue
<GxPaginationTable
  v-model:page="page.current"
  v-model:limit="page.size"
  :data="list"
  :loading="loading"
  :total="page.total"
  @pagination="onChange"
>
  <template #default>
    <ElTable :data="list" border>
      <ElTableColumn prop="deviceSn" label="设备SN" min-width="180" />
      <ElTableColumn prop="alarmTitle" label="告警标题" min-width="180" />
    </ElTable>
  </template>
</GxPaginationTable>
```

> 个别列定制用 `table-column-字段名` 或 `columns.render`；整表差异大时用 `#default`。

### GxForm

自动生成表单项的表单组件，基于 Element Plus ElForm。

**Props（GxFormProps）：**

```ts
interface GxFormProps {
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

### GxSearch

搜索表单组件，基于 GxForm，默认开启 `inline` 模式，提交按钮文字默认为 `'查 询'`。

**Props：** 同 `GxFormProps`

**v-model：** 表单数据对象

**Events：**

- `submit(form)` — 查询
- `reset` — 重置

**基础版：**

```vue
<GxSearch v-model="search" :items="searchItems" @submit="loadList" @reset="resetSearch();reloadList()" />
```

**slot 版：**

```vue
<GxSearch v-model="search" :items="searchItems" @submit="loadList" @reset="resetSearch();reloadList()">
  <template #form-item-device-sn>
    <ElInput v-model="search.deviceSn" clearable placeholder="请输入设备SN">
      <template #append>
        <ElButton @click="loadList">快速查询</ElButton>
      </template>
    </ElInput>
  </template>
</GxSearch>
```

> 查询项模板重写用 `form-item-字段名`；单项复合控件也可用 `generateFormItems.render`。

---

## 6. 完整 CRUD 页面模板

### Model 文件模板

```ts
// model/index.ts
import { FieldName } from '@gx-web/core'

/** 查询参数模型 */
export class XxxQueryModel {
  /** 关键字 */
  @FieldName('关键字')
  keyword!: string
}

/** 列表项模型 */
export class XxxListItemModel {
  /** 字段1 */
  @FieldName('字段1')
  field1!: string

  /** 字段2 */
  @FieldName('字段2')
  field2!: string

  id!: string
}

/** 新增/编辑表单模型 */
export class XxxFormModel {
  /** 字段1 */
  @FieldName('字段1')
  field1!: string

  /** 字段2 */
  @FieldName('字段2')
  field2!: string

  id!: string
}
```

### API 文件模板

```ts
// api/index.ts
import useAxios from '@base-lib/hooks/core/useAxios'
import type { XxxListItemModel, XxxQueryModel, XxxFormModel } from '../model'

const request = useAxios()

/** 分页查询 */
export const loadPage = (params: XxxQueryModel) => {
  return request.get<ResPage<XxxListItemModel>>({
    url: '/xxx/page',
    params
  })
}

/** 新增 */
export const add = (data: XxxFormModel) => {
  return request.post({
    url: '/xxx',
    data
  })
}

/** 更新 */
export const update = (data: XxxFormModel) => {
  return request.put({
    url: '/xxx',
    data
  })
}

/** 删除 */
export const removeById = (id: string) => {
  return request.delete({
    url: `/xxx/${id}`
  })
}
```

### 弹窗组件模板

```vue
<!-- components/xxx-add.vue -->
<script setup lang="ts">
import { computed, reactive, useTemplateRef } from 'vue'
import type { FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useStateRef, useToggle } from '@gx-web/tool'
import { getModelFromJson } from '@gx-web/core'
import { generateFormItems, GxForm } from '@gx-web/ep-comp'
import { add, update } from '../api'
import type { XxxListItemModel } from '../model'
import { XxxFormModel } from '../model'

defineOptions({
  name: 'XxxAdd'
})

const emit = defineEmits<{
  submitted: []
}>()

const [visible, setVisible] = useToggle(false)

const [loading, setLoading] = useToggle(false)

const [form, , resetForm] = useStateRef(() => getModelFromJson(XxxFormModel))

const isEdit = computed(() => !!form.value.id)

const rules = reactive<FormRules>({
  field1: [{ required: true, message: '请输入字段1', trigger: 'blur' }]
})

const dialogTitle = computed(() => `${isEdit.value ? '编辑' : '新增'}xxx`)

// 简单字段自动生成
const formItems = generateFormItems(XxxFormModel, [
  'field1',
  'field2'
])

const FormRef = useTemplateRef('FormRef')

/** 新增模式 */
const init = () => {
  setVisible(true)
}

/** 编辑模式 */
const initEdit = (row: XxxListItemModel) => {
  resetForm()
  form.value = { ...row }
  setVisible(true)
}

/** 提交 */
const handleSubmit = async () => {
  try {
    setLoading(true)
    await FormRef.value?.validate()
    const { message } = await (isEdit.value ? update(form.value) : add(form.value))
    ElMessage.success(message)
    setVisible(false)
    emit('submitted')
  }
  catch (error) {
    console.error('handleSubmit => error', error)
  }
  finally {
    setLoading(false)
  }
}

/** 关闭重置 */
const close = () => {
  resetForm()
}

defineExpose({ init, initEdit })
</script>

<template>
  <ElDialog v-model="visible" :title="dialogTitle" width="500px" @closed="close">
    <ElForm ref="FormRef" v-loading="loading" :model="form" :rules="rules" label-width="120px">
      <GxForm :items="formItems" :form="form" />
      <!-- 复杂字段手动补充示例 -->
      <!--
      <ElFormItem label="xxx" prop="xxx">
        <CustomComponent v-model="form.xxx" />
      </ElFormItem>
      -->
    </ElForm>
    <template #footer>
      <ElButton :loading="loading" @click="setVisible(false)">取消</ElButton>
      <ElButton type="primary" :loading="loading" @click="handleSubmit">确定</ElButton>
    </template>
  </ElDialog>
</template>
```

### 主页面模板

> **根节点规则（MANDATORY）**：`<template>` 的直接子元素有且仅有一个 `<div class="模块名-kebab-case">`，所有组件必须包裹在其内部。禁止多根节点。
>
> **输出前不变量（必须先检查）**：
> 1. `GxPaginationTable` 与任意弹窗组件不能直接并列出现在 `<template>` 下
> 2. 如果出现双根节点，说明模板不合格，必须重写
> 3. 该规则是硬约束，不因项目现有写法而放宽

```vue
<!-- index.vue -->
<script setup lang="ts">
import { defineAsyncComponent, onMounted, useTemplateRef } from 'vue'
import { ElMessage } from 'element-plus'
import { useStateRef, useTablePage } from '@gx-web/tool'
import { getModelFromJson } from '@gx-web/core'
import { GxPaginationTable, GxSearch, generateFormItems, generateTableColumns } from '@gx-web/ep-comp'
import { XxxQueryModel, XxxListItemModel } from './model'
import { loadPage, removeById } from './api'

defineOptions({
  name: 'XxxManage'
})

const XxxAdd = defineAsyncComponent(() => import('./components/xxx-add.vue'))

const XxxAddRef = useTemplateRef('XxxAddRef')

const [search, , resetSearch] = useStateRef(() => getModelFromJson(XxxQueryModel))

const [list, { page, loading, loadList, reloadList, onChange }] = useTablePage<XxxListItemModel>(
  ({ current, size }) =>
    loadPage({ ...search.value, pageNum: current, pageSize: size }).then(res => ({
      records: res.data.records,
      total: res.data.total
    }))
)

const columns = generateTableColumns(XxxListItemModel, [
  'field1',
  'field2'
])

const searchItems = generateFormItems(XxxQueryModel, [
  'keyword'
])

/** 新增 */
const handleAdd = () => {
  XxxAddRef.value?.init()
}

/** 编辑 */
const handleEdit = (row: XxxListItemModel) => {
  XxxAddRef.value?.initEdit(row)
}

/** 删除 */
const handleDel = async (row: XxxListItemModel) => {
  try {
    const { message } = await removeById(row.id)
    ElMessage.success(message)
    loadList()
  }
  catch (error) {
    console.error('error =>', error)
  }
}

onMounted(loadList)
</script>

<!-- MANDATORY: 根节点必须是单个 div，class 为模块名 kebab-case -->
<template>
  <div class="xxx-manage">
    <GxPaginationTable
      v-model:page="page.current"
      v-model:limit="page.size"
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="page.total"
      @pagination="onChange"
    >
      <template #header>
        <GxSearch v-model="search" :items="searchItems" @submit="loadList" @reset="resetSearch();reloadList()" />
      </template>

      <template #action="{ row }">
        <ElButton link type="primary" @click="handleEdit(row)">编辑</ElButton>
        <ElPopconfirm title="是否删除?" placement="left" @confirm="handleDel(row)">
          <template #reference>
            <ElButton link type="danger">删除</ElButton>
          </template>
        </ElPopconfirm>
      </template>

      <template #action-bar>
        <ElButton type="primary" @click="handleAdd">新增</ElButton>
      </template>
    </GxPaginationTable>
    <!-- 弹窗组件也必须在根 div 内部 -->
    <XxxAdd ref="XxxAddRef" @submitted="reloadList" />
  </div>
</template>
```

---

## 7. 组件注册系统

### useComponentMap

组件映射管理，默认注册了 `input`（GxInput）和 `select`（GxSelect）。

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
