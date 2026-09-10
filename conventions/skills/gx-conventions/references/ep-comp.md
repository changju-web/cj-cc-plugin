# ep-comp 篇 · @gx-web/ep-comp 使用约定

覆盖 `@gx-web/ep-comp` 的组件使用约定，核心是**声明式优先**。页面 / 弹窗骨架生成走 ep-comp 各生成 skill，本篇管生成之外的日常使用与修改。

## 声明式优先链

三层 schema（`generateFormItems` / `generateTableColumns` / `generateDescriptionsItems`）表达需求时，严格沿优先链取第一个可用手段：

```text
内置 type → 注册后 type（ComponentMap）→ 动态 props / hide / col → 插槽（#form-item-*）→ render: h() 兜底 → 原生模式
```

- 下结论"schema 表达不了"之前，必须先查完 render 之前的全部层级
- 插槽层管未注册进 ComponentMap 的常规组件：**单个 v-model、不需要组件 ref** 的（如 ElInputNumber）走 `#form-item-*` 插槽而非 render——插槽写法更短、模板自动导入省显式 import（实证：ElInputNumber 走 render 需要手动 import + h 挂接，插槽版三行完事）
- `render: h()` 只兜底插槽也表达不了的场景（程序化渲染、复杂联动）；原生模式（手写 ElForm 等）需列出原因并经用户确认

## ComponentMap 扩充（app 侧注入）

内置 `type`（input / select / radio / date 等）之外，业务组件经 app 侧注入后同样声明式可用。**先查项目注册表再断定组件不存在**：

```ts
// src/config/ep-comp.ts
import { compMap } from "@gx-web/ep-comp";

declare module "@gx-web/ep-comp" {
  interface ComponentMap {
    "dict-select": typeof DictSelect;
    "test-app-select": typeof TestAppSelect;
  }
}

compMap.registerComponents({ "dict-select": DictSelect });
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

| 插槽                                  | 使用边界                                                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#header` / `#action-bar` / `#action` | 正常注入使用：表头搜索区、表格工具条、行操作列                                                                                                                   |
| `#table-column-*`                     | 样式特殊处理、回显处理（如按行数据映射展示文案）                                                                                                                 |
| `#form-item-*`                        | **先于 render**：type / 注册 type 解决不了时一律走插槽注入——未注册常规组件的单字段 v-model、多字段绑定、需要组件 ref 都算；仅插槽也表达不了才 `render: h()` 兜底 |

**插槽名必须 kebab-case（横线分隔）**：字段名 `parkId` 的表单项插槽是 `#form-item-park-id`，写 `#form-item-parkId` **无效**——camelCase 字段名转插槽名时逐词横线分隔（实证：`createUser` → `#table-column-create-user`）。

## 单组件日常用法

生成任务之外的直接使用规范，真机样本（随插件分发，提炼自 xbwisdom system/user，示例间引用已闭环）：[../examples/user-index.vue](../examples/user-index.vue)（表格页）与 [../examples/user-add.vue](../examples/user-add.vue)（新增/编辑弹窗，引用 [../examples/user-model.ts](../examples/user-model.ts)）。

### GxPaginationTable

```vue
<template>
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
  />
</template>
```

- `page` / `onChange` / `loading` / `list` 来自 `useTablePage`（见 tool.md）；`table-props` 透传表格配置（勾选列、操作列宽）
- **操作列默认渲染**（GxTable `action: true`）：无行操作的列表必须显式 `table-props: { action: false }` 隐藏，避免空「操作」列占位
- 四大插槽：`#header`（放 GxSearch）、`#action-bar`、`#table-column-*`、`#action`

### GxSearch（查询区）

```vue
<template>
  <GxSearch
    v-model="form"
    :items="searchItems"
    @submit="loadList"
    @reset="handleReset"
  />
</template>
```

### GxDialog + GxForm（弹窗表单）

```vue
<template>
  <GxDialog
    v-model="visible"
    :title="dialogTitle"
    width="700px"
    @closed="close"
  >
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
</template>
```

弹窗组件固定模式（add.vue）：

- `visible` 由弹窗组件内部 `useToggle` 管理，**不由父组件传入**；`@closed` 里 resetForm
- `defineExpose({ init, initEdit })`——父组件 `xxxRef.value?.init()` 新增 / `initEdit(row)` 编辑；标题 computed 拼接「新增 / 编辑 + 实体名」
- 模板 Ref 一律 `const xxxRef = useTemplateRef('xxxRef')`（Vue 3.5+：key 与模板 `ref` 属性严格同名、vue-tsc 自动推断实例类型、返回只读 Ref）；不用裸 `ref<InstanceType<typeof Xxx>>()`；v-for 多实例 Ref 用 `useTemplateRefsList`
- 提交成功后 `emit('submitted')`，父组件收到后刷新列表
- `rules` 用 element-plus `FormRules`；`formItems` 的 `col: { span }` 控布局、`col: (form) => ({ span })` 函数式动态布局（同 hide 接收表单值，用于隐藏项后的通栏补位，避免两列配对前移错位）、`hide: () => xxx` 响应式显隐、`props` 传响应式值自动联动（如 `disabled: isEdit`）

## 生成任务路由

- 列表页 / 表格底座 → `ep-comp:table-page`
- 新增 / 编辑 / 审批表单弹窗 → `ep-comp:form-dialog`
- 只读详情弹窗 → `ep-comp:detail-dialog`（model 命名 `XxxDetailModel`，普通 class + `@FieldName`，库内无 DetailModel 基类）
- 本篇约定在生成产物上同样生效（生成 skill 引用本文，不复制）
