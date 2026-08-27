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

列表页 / 查询页的分页加载默认用 `useTablePage`，与 `GxSearch` + `GxPaginationTable` 构成主链路：

```ts
import { useTablePage } from '@gx-web/tool'

const { tableData, pagination, loadPage, loading } = useTablePage(api)
```

- 完整页面骨架生成走 `ep-comp:table-page`，本篇只定选择依据：有分页表格即用，不手写 `pageNum/pageSize` 状态与请求拼装
- 返回值解构以 ep-comp:table-page 的 reference 为准，此处不复制签名（约定唯一归属）

## 选用速查

| 场景 | 用 |
| --- | --- |
| 对象型状态（表单 / 筛选） | `useStateRef` |
| 布尔开关（显隐 / 折叠） | `useToggle` |
| 分页表格数据 | `useTablePage` |

## 待库作者补充

- [ ] `@gx-web/tool` 其余 hooks 清单及各自适用场景（逐个一行说明即可）
- [ ] hooks 组合的推荐次序（如同页同时用 useTablePage + useStateRef 时的结构）
