# detail-dialog Reference

## Expose Contract

- detail：`init(id)`

## 前置要求

`generateDescriptionsItems` 依赖 `@FieldName` 装饰器读取字段标签。使用前确保 `DetailModel` 的展示字段都已标注：

```ts
import { FieldName } from '@gx-web/core'

export class AlarmDetailModel {
  @FieldName('告警代码')
  alarmCode!: string

  @FieldName('创建时间')
  createTime!: string
}
```

## 自动模式组件模板

标准字段用字符串简写，复杂字段用扩展手段，**不要因为有一两个字段复杂就整体切原生模式**：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useLoadMap, useToggle } from '@gx-web/tool'
import { generateDescriptionsItems, GxDescriptions, GxDialog } from '@gx-web/ep-comp'
import { AlarmApi } from '@/api/<域>/alarm' // 统一管理形态；就近形态: import { loadDetail } from '../api'
import { AlarmDetailModel } from '../model' // 统一管理形态: import { AlarmDetailModel } from '@gx-web/biz'

const [visible, setVisible] = useToggle(false)
const currentId = ref('')

const [detail, { load, loading, resetData }] = useLoadMap<AlarmDetailModel>(
  () => AlarmApi.byId(currentId.value).then(res => res.data)
)

const items = generateDescriptionsItems(AlarmDetailModel, [
  'alarmCode',
  'alarmTitle',
  'alarmDetail',
  'alarmTime',
  'createTime'
])

const init = async (id: string) => {
  currentId.value = id
  setVisible(true)
  await load()
}

const close = () => {
  resetData()
}

defineExpose({ init })
</script>

<template>
  <GxDialog v-model="visible" title="详情" width="720px" @closed="close">
    <GxDescriptions v-model="detail" :items="items" :column="2" border :loading="loading" />
  </GxDialog>
</template>
```

## 自动模式扩展手段

复杂字段优先用以下扩展手段，**不要因为有部分字段复杂就切换原生模式**：

### 枚举映射（render: h()）

```ts
import { h } from 'vue'

const statusMap = Object.fromEntries(statusOptions.map(o => [o.value, o.label]))

{
  prop: 'status',
  render: (d) => h('span', statusMap[d.status] ?? '--')
}
```

### 多字段合并展示（render: h() + span）

```ts
{
  prop: 'startTime',
  label: '测试周期',
  span: 2,
  render: (d) => h('span', `${d.startTime || '--'} ~ ${d.endTime || '--'}`)
}
```

### 条件显隐

```ts
{ prop: 'approveRemark', hide: (d) => !d.approveRemark }
```

### 自定义 span

```ts
{ prop: 'approveRemark', span: 2 }
```

`render` 的 `d` 参数是响应式 detail 对象，直接读取即可。

## 原生模式组件模板

仅当自动模式所有扩展手段都无法覆盖时使用。切换前需列出原因并经用户确认。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ElDescriptions, ElDescriptionsItem } from 'element-plus'
import { useToggle } from '@gx-web/tool'
import { GxDialog } from '@gx-web/ep-comp'
import { AlarmApi } from '@/api/<域>/alarm' // 统一管理形态；就近形态: import { loadDetail } from '../api'
import type { AlarmDetailModel } from '../model'

const [visible, setVisible] = useToggle(false)
const [loading, setLoading] = useToggle(false)
const detail = ref<AlarmDetailModel>()

const init = async (id: string) => {
  setVisible(true)
  setLoading(true)
  try {
    const { data } = await AlarmApi.byId(id)
    detail.value = data
  }
  finally {
    setLoading(false)
  }
}

defineExpose({ init })
</script>

<template>
  <GxDialog v-model="visible" title="详情" width="720px">
    <div v-loading="loading">
      <ElDescriptions :column="2" border>
        <ElDescriptionsItem label="告警代码">{{ detail?.alarmCode || '--' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="告警标题">{{ detail?.alarmTitle || '--' }}</ElDescriptionsItem>
      </ElDescriptions>
    </div>
  </GxDialog>
</template>
```

## Shared Contracts

### 根节点 contract

```vue
<template>
  <div class="module-kebab-case">
    <GxPaginationTable ... />
    <Detail ref="DetailRef" />
  </div>
</template>
```

### 按钮注入规则

- 详情按钮只能注入 `#action`
- 详情组件实例必须放在根 `div` 内部、`GxPaginationTable` 之后
