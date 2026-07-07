# wd-list-page Reference

## Model Template

```ts
import { ClassName, Default, FieldName } from '@gx-web/core'

@ClassName('人员查询条件')
export class PersonPageQuery {
  @FieldName('关键词')
  keyword!: string

  @Default(() => [])
  @FieldName('状态')
  status!: string[]
}

@ClassName('人员列表项')
export class PersonListItem {
  id!: string

  @FieldName('姓名')
  name!: string

  @FieldName('手机号')
  phone!: string
}
```

## API Template

```ts
import request from '@/service'
import type { PersonListItem, PersonPageQuery } from '../model'

const URL = '/module-wechat/person'

export const loadPersonPage = (data: QueryParams<PersonPageQuery>) => {
  return request<ResPage<PersonListItem>>({
    method: 'post',
    url: `${URL}/query`,
    data
  })
}
```

## Page Template

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { getModelFromJson } from '@gx-web/core'
import { useListStream, useStateRef } from '@gx-web/tool'
import { loadPersonPage } from './api'
import { PersonPageQuery } from './model'
import type { PersonListItem } from './model'

definePage({
  style: {
    navigationBarTitleText: '人员管理'
  }
})

const [query, , resetQuery] = useStateRef(() => getModelFromJson(PersonPageQuery))

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  return String(value)
}

const [list, { loadList, reloadList, status, loading, page }] =
  useListStream<PersonListItem>(({ current, size }) =>
    loadPersonPage({
      page: { current, size },
      queryParams: query.value
    }).then(({ data }) => data)
  )

const totalText = computed(() => `共 ${page.value.total} 条`)

const handleSearch = () => {
  reloadList()
}

const handleReset = () => {
  resetQuery()
  reloadList()
}

const handleDetail = (item: PersonListItem) => {
  if (!item.id) {
    uni.showToast({ title: '缺少详情信息', icon: 'none' })
    return
  }

  uni.navigateTo({
    url: `/pages-core/person/detail?id=${item.id}`
  })
}
</script>

<template>
  <view class="person-page">
    <gx-list
      :data="list"
      :status="status"
      :loading="loading"
      :load="loadList"
      :row-key="(item, index) => item.id || index"
      content-class="person-page__content"
      height="100vh"
      empty-text="数据为空"
    >
      <template #header>
        <view class="person-page__header">
          <wd-search
            v-model="query.keyword"
            placeholder="请输入关键词"
            placeholder-left
            @search="handleSearch"
            @clear="handleReset"
            @cancel="handleReset"
          />
          <view class="person-page__summary">
            <text>{{ totalText }}</text>
          </view>
        </view>
      </template>

      <template #default="{ item }">
        <view class="person-card" @click="handleDetail(item)">
          <view class="person-card__title">{{ displayValue(item.name) }}</view>
          <view class="person-card__meta">{{ displayValue(item.phone) }}</view>
        </view>
      </template>
    </gx-list>
  </view>
</template>
```

## More Search Template

复杂筛选使用：

```vue
<gx-search-more
  v-model="query.keyword"
  placeholder="请输入关键词"
  @search="handleSearch"
  @clear="handleReset"
  @cancel="handleReset"
  @reset="handleReset"
  @confirm="handleSearch"
>
  <MoreSearchPopup v-model="query" />
</gx-search-more>
```

`MoreSearchPopup` 内部优先使用 `wd-cell-group`、`wd-cell`、`wd-input`、`gx-dict-radio`、`gx-dict-checkbox`、`gx-date-range-picker`。

