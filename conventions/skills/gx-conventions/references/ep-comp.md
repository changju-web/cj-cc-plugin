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

GX 系组件（GxForm / GXSearch 等）的 modelValue 由组件统一处理，schema / 插槽用法下**禁止**手写 `modelValue` + `onUpdate:modelValue` 挂接，禁止手写 string / number 值归一逻辑——这些是组件层已处理的职责。

## 生成任务路由

- 列表页 / 表格底座 → `ep-comp:table-page`
- 新增 / 编辑 / 审批表单弹窗 → `ep-comp:form-dialog`
- 只读详情弹窗 → `ep-comp:detail-dialog`（model 命名 `XxxDetailModel`，普通 class + `@FieldName`，库内无 DetailModel 基类）
- 本篇约定在生成产物上同样生效（生成 skill 引用本文，不复制）

## 待库作者补充

- [ ] GxDialog / GxPaginationTable 等单组件的日常直接使用约定（不走 schema 时）
- [ ] 插槽（#header / #action 等）的使用边界：什么需求该走插槽而不是 type
