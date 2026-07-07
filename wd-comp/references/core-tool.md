# @gx-web/core and @gx-web/tool Reference

## Model Contract

业务 API、查询条件、表单、详情和列表项优先使用 class model。

```ts
import { ClassName, Default, FieldName } from '@gx-web/core'

@ClassName('人员查询条件')
export class PersonPageQuery {
  @FieldName('关键词')
  keyword!: string

  @Default(() => [])
  @FieldName('门禁授权状态')
  authStatus!: string[]
}
```

生成规则：

- 从 `@gx-web/core` 导入 `ClassName`、`FieldName`、`Default`、`getModelFromJson`。
- API/domain model 使用 class；组件 props、事件 payload、局部 helper shape 才使用 interface/type。
- 对用户可见、搜索、展示、提交字段添加 `@FieldName`。
- 对数组和对象默认值使用 `@Default(() => [])` / `@Default(() => ({}))`，避免共享引用。
- 简单默认值可用 class 字段初始值或 `@Default(value)`；需要被 `getModelFromJson` 统一覆盖的默认值优先用 `@Default`。
- 初始化 model 使用 `getModelFromJson(ModelClass, defaults?)`。

## useStateRef

对象和数组状态优先使用 `useStateRef`。

```ts
import { getModelFromJson } from '@gx-web/core'
import { useStateRef } from '@gx-web/tool'
import { PersonPageQuery } from './model'

const [query, setQuery, resetQuery] = useStateRef(() => getModelFromJson(PersonPageQuery))

setQuery({ keyword: '张三' })
resetQuery()
```

约束：

- `setState` 对对象执行合并更新，适合表单、查询条件和详情状态。
- 重置查询条件使用 `resetQuery()`，不要逐个字段清空。
- 如果 reset 后需要立刻刷新列表，使用 `resetQuery(); reloadList()`。

## useToggle

布尔状态优先使用 `useToggle`。

```ts
import { useToggle } from '@gx-web/tool'

const [visible, setVisible] = useToggle(false)
const [submitting, setSubmitting] = useToggle(false)
```

约束：

- loading、visible、submitting、actionLoading 等布尔状态优先使用 `useToggle`。
- 需要显式赋值时调用 `setVisible(true)` / `setVisible(false)`。

## useListStream

小程序滚动分页列表优先使用 `useListStream`。

```ts
import { useListStream } from '@gx-web/tool'
import { loadPersonPage } from './api'
import type { PersonListItem } from './model'

const [list, { loadList, reloadList, status, loading, page }] =
  useListStream<PersonListItem>(({ current, size }) =>
    loadPersonPage({
      page: { current, size },
      queryParams: query.value
    }).then(({ data }) => data)
  )
```

约束：

- `onLoad` 必须返回 `{ records: T[]; total: number }`。
- 如果接口返回 `ResPage<T>`，直接 `.then(({ data }) => data)`。
- 如果接口返回嵌套结构，转换成 `{ records, total }` 后再返回。
- 列表容器使用 `gx-list`，并绑定 `:data`、`:status`、`:loading`、`:load`。
- 不手写 `current`、`size`、`records`、`finished`、`loading` 状态，除非现有模块已有特殊约定。

## useLoadMap

详情页可使用 `useStateRef` 手动加载，也可用 `useLoadMap`。

```ts
import { getModelFromJson } from '@gx-web/core'
import { useLoadMap } from '@gx-web/tool'
import { loadPersonDetail } from './api'
import { PersonDetail } from './model'

const currentId = ref('')
const [detail, { load, loading, resetData }] = useLoadMap(
  () => loadPersonDetail(currentId.value).then(({ data }) => data),
  () => getModelFromJson(PersonDetail)
)
```

约束：

- 简单详情页可用 `useStateRef + useToggle`，需要统一 load/reload/resetData 时再用 `useLoadMap`。
- 进入页面参数缺失时先 toast 并停止加载。

