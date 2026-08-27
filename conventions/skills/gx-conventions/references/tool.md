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

列表页 / 查询页的分页加载默认用 `useTablePage`，与 `GxSearch` + `GxPaginationTable` 构成主链路。签名：数组解构 `[list, 控制器]`，入参为回调式 loader（真机：`system/user/index.vue`）：

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

实证样本：`apps/web/src/views/system/user/`（index.vue + components/add.vue）。

## 选用速查

| 场景 | 用 |
| --- | --- |
| 对象型状态（表单 / 筛选） | `useStateRef` |
| 布尔开关（显隐 / 折叠） | `useToggle` |
| 分页表格数据 | `useTablePage` |
| 非分页列表 | `useLoadList` |
| 单对象详情 | `useLoadMap` |
| 表单脏检查 | `useFormDirtyTracker` |

## 待库作者补充

- [ ] `@gx-web/tool` 其余未实证 hooks 清单（逐个一行场景说明）
- [ ] hooks 组合的推荐次序（如同页同时用 useTablePage + useStateRef 时的结构）
