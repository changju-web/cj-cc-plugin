# tool 篇 · @gx-web/tool hooks 场景选择

覆盖 `@gx-web/tool` 的 hooks 选用约定。原则：**优先 hooks，不裸用底层 API 再手写等价逻辑**。

## useStateRef —— 组件状态对象首选

表单、筛选条件、批量编辑等"对象型状态"用 `useStateRef`，收益是可整体 set、可一键 reset：

```ts
import { useStateRef } from '@gx-web/tool'

const [form, setForm, resetForm] = useStateRef(() => ({
  name: '',
  age: ''
}))
```

- 禁止 `ref({ ... })` / `reactive({ ... })` + 手写重置函数来模拟同一能力
- 初始值工厂传入，保证 reset 回到确定形态

## useToggle —— 布尔开关

弹窗显隐、折叠、加载态等布尔开关用 `useToggle`：

```ts
import { useToggle } from '@gx-web/tool'

const [visible, setVisible] = useToggle()
```

- 禁止 `ref(false)` + 手写 `xxx.value = !xxx.value`

## useTablePage —— 分页表格数据链路

列表页 / 查询页的分页加载默认用 `useTablePage`，与 `GxSearch` + `GxPaginationTable` 构成主链路。签名：数组解构 `[list, 控制器]`，入参为回调式 loader（真机：[../examples/user-index.vue](../examples/user-index.vue)）：

```ts
import { useTablePage } from '@gx-web/tool'

const [list, { page, loading, setLoading, loadList, reloadList, onChange }] = useTablePage(
  ({ current, size }) =>
    User.page({ ...form.value, pageNum: current, pageSize: size }).then(({ data }) => ({
      records: data.records,
      total: data.total
    }))
)
```

- loader 接收 `{ current, size }`，返回归一为 `{ records, total }`——不手写 `pageNum` / `pageSize` 状态与请求拼装
- `loadList` 带当前查询条件查询，`reloadList` 重置到第一页重查，`onChange` 接 GxPaginationTable 的 `@pagination`
- 完整页面骨架生成走 `ep-comp:table-page`

## 其余 hooks（真机实证）

| Hook | 场景 | 要点 |
| --- | --- | --- |
| `useLoadList` | 非分页列表加载（详情页关联数据等） | `const [list, { reloadList }] = useLoadList(loader)` |
| `useLoadMap` | 单对象加载（详情数据） | `const [detail, { load, loading, resetData }] = useLoadMap(loader)` |
| `useFormDirtyTracker` | 编辑表单字段级脏检查 | `const { isFieldDirty, resetToInitial, updateInitial } = useFormDirtyTracker(form)`，配合「仅提交改动字段」的编辑场景 |

实证样本（随插件分发，`examples/` 扁平摆放）：[../examples/user-index.vue](../examples/user-index.vue) + [../examples/user-add.vue](../examples/user-add.vue)（含 [../examples/user-model.ts](../examples/user-model.ts)）。

## usePagination —— 通用分页控制

`useTablePage` 内部基于 `usePagination` 实现；非表格场景需要自行控制分页时按需直接使用 `usePagination(callback, config)`。

## 旧版遗弃 hooks（新代码禁止使用）

| 遗弃 | 替换为 |
| --- | --- |
| `useState` | `useStateRef` |
| `useList` | `useLoadList` |
| `useMap` | `useLoadMap` |

存量旧代码可渐进替换；新代码与生成代码禁止出现左列——在旧代码中看到这些 hooks 不要沿用其写法。

## hooks 组合次序（表格页标准结构）

查询表单 `useStateRef`（初始态 `getModelFromJson(Model, 覆盖值)`）→ 表格 `useTablePage`（loader 展开 `form.value` 拼查询条件）→ 弹窗开关 `useToggle` → 子组件 `ref<InstanceType<typeof Xxx>>`，完整结构见 [../examples/user-index.vue](../examples/user-index.vue)。

## 选用速查

| 场景 | 用 |
| --- | --- |
| 对象型状态（表单 / 筛选） | `useStateRef` |
| 布尔开关（显隐 / 折叠） | `useToggle` |
| 分页表格数据 | `useTablePage` |
| 非分页列表 | `useLoadList` |
| 单对象详情 | `useLoadMap` |
| 表单脏检查 | `useFormDirtyTracker` |
| 非表格场景自行分页 | `usePagination` |

## 待库作者补充

- [ ] `useCompRef` / `useExposeProxy` / `useInterval` / `useListStream` / `useResizeObserver` / `useWatermark` / `useWinResize` 七个 hooks 的适用场景（逐个一行说明即可）
