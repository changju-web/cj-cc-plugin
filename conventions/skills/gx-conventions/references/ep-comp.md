# ep-comp 篇 · @gx-web/ep-comp 使用约定

覆盖 `@gx-web/ep-comp` 的组件使用约定，核心是**声明式优先**。页面 / 弹窗骨架生成走 ep-comp 各生成 skill，本篇管生成之外的日常使用与修改。

## 声明式优先链

三层 schema（`generateFormItems` / `generateTableColumns` / `generateDescriptionsItems`）表达需求时，严格沿优先链取第一个可用手段：

```text
内置 type → 注册后 type（ComponentMap）→ 动态 props / hide → render: h() 兜底 → 原生模式
```

- 下结论"schema 表达不了"之前，必须先查完优先链前两级
- `render: h()` 是兜底而非默认；原生模式（手写 ElForm 等）需列出原因并经用户确认

## ComponentMap 扩充（app 侧注入）

内置 `type`（input / select / radio / date 等）之外，业务组件经 app 侧注入后同样声明式可用。**先查项目注册表再断定组件不存在**：

```ts
// src/config/ep-comp.ts
import { compMap } from '@gx-web/ep-comp'

declare module '@gx-web/ep-comp' {
  interface ComponentMap {
    'dict-select': typeof DictSelect
    'test-app-select': typeof TestAppSelect
  }
}

compMap.registerComponents({ 'dict-select': DictSelect })
```

注册后 schema 直接用：

```ts
{ prop: 'deviceModel', type: 'dict-select', props: { dictCode: 'door_state' } }
```

- 类型扩充（`declare module`）与运行时注入（`registerComponents`）缺一不可
- 常见注入位：字典组件族、业务选择器（如 system-role-select）；各项目实际清单以该项目 `src/config/ep-comp.ts` 为准

## 统一 v-model，禁止手写挂接

GX 系组件（GxForm / GXSearch 等）的 modelValue 由组件统一处理，**schema 声明式用法下禁止**手写 `modelValue` + `onUpdate:modelValue` 挂接，禁止手写 string / number 值归一逻辑——这些是组件层已处理的职责。例外：`render: h()` 兜底内部不受限（render 本就是全手动渲染，见声明式优先链兜底层）。

## 插槽使用边界

| 插槽 | 使用边界 |
| --- | --- |
| `#header` / `#action-bar` / `#action` | 正常注入使用：表头搜索区、表格工具条、行操作列 |
| `#table-column-*` | 样式特殊处理、回显处理（如按行数据映射展示文案） |
| `#form-item-*` | **type 注入不能解决时才用**：type 绑定的是单字段，复杂组件涉及多字段绑定或需要组件 ref 时走插槽注入 |

**插槽名必须 kebab-case（横线分隔）**：字段名 `parkId` 的表单项插槽是 `#form-item-park-id`，写 `#form-item-parkId` **无效**——camelCase 字段名转插槽名时逐词横线分隔（实证：`createUser` → `#table-column-create-user`）。

## 单组件日常用法

生成任务之外的直接使用规范，真机样本：`apps/web/src/views/system/user/index.vue`（表格页）与 `components/add.vue`（新增/编辑弹窗）。

### GxPaginationTable

```vue
<GxPaginationTable
  v-model:page="page.current"
  v-model:limit="page.size"
  :columns="columns"
  :data="list"
  :loading="loading"
  :total="page.total"
  :table-props="{ selection: true, actionWidth: 300 }"
  @pagination="onChange"
  @selection-change="setSelectionRows"
>
```

- `page` / `onChange` / `loading` / `list` 来自 `useTablePage`（见 tool.md）；`table-props` 透传表格配置（勾选列、操作列宽）
- 四大插槽：`#header`（放 GxSearch）、`#action-bar`、`#table-column-*`、`#action`

### GxSearch（查询区）

```vue
<GxSearch v-model="form" :items="searchItems" @submit="loadList" @reset="handleReset" />
```

### GxDialog + GxForm（弹窗表单）

```vue
<GxDialog v-model="visible" :title="dialogTitle" width="700px" @closed="close">
  <GxForm
    ref="FormRef"
    v-model="form"
    v-loading="loading"
    :items="formItems"
    :rules="rules"
    :row="{ gutter: 20 }"
    label-width="90px"
    show-reset
    @cancel="setVisible(false)"
    @reset="handleReset"
    @submit="handleSubmit"
  />
</GxDialog>
```

弹窗组件固定模式（add.vue）：

- `visible` 由弹窗组件内部 `useToggle` 管理，**不由父组件传入**；`@closed` 里 resetForm
- `defineExpose({ init, initEdit })`——父组件 `xxxRef.value?.init()` 新增 / `initEdit(row)` 编辑；标题 computed 拼接「新增 / 编辑 + 实体名」
- 提交成功后 `emit('submitted')`，父组件收到后刷新列表
- `rules` 用 element-plus `FormRules`；`formItems` 的 `col: { span }` 控布局、`hide: () => xxx` 响应式显隐、`props` 传响应式值自动联动（如 `disabled: isEdit`）

## 生成任务路由

- 列表页 / 表格底座 → `ep-comp:table-page`
- 新增 / 编辑 / 审批表单弹窗 → `ep-comp:form-dialog`
- 只读详情弹窗 → `ep-comp:detail-dialog`（model 命名 `XxxDetailModel`，普通 class + `@FieldName`，库内无 DetailModel 基类）
- 本篇约定在生成产物上同样生效（生成 skill 引用本文，不复制）
