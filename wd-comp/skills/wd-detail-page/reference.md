# wd-detail-page Reference

## Model Template

```ts
import { ClassName, FieldName } from '@gx-web/core'

@ClassName('人员详情')
export class PersonDetail {
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
import type { PersonDetail } from '../model'

const URL = '/module-wechat/person'

export const loadPersonDetail = (id: string) => {
  return request<Res<PersonDetail>>({
    method: 'get',
    url: `${URL}/info`,
    params: { id }
  })
}
```

## Page Template

```vue
<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { getModelFromJson } from '@gx-web/core'
import { useStateRef, useToggle } from '@gx-web/tool'
import { displayValue } from '@/utils'
import { loadPersonDetail } from './api'
import { PersonDetail } from './model'

definePage({
  style: {
    navigationBarTitleText: '人员详情'
  }
})

const [detail, setDetail] = useStateRef(() => getModelFromJson(PersonDetail))
const [loading, setLoading] = useToggle(false)

const loadDetail = async (id: string) => {
  try {
    setLoading(true)
    const { data } = await loadPersonDetail(id)
    setDetail(data)
  } catch (error) {
    console.error('person load detail failed:', error)
    uni.showToast({
      title: '详情加载失败',
      icon: 'none'
    })
  } finally {
    setLoading(false)
  }
}

onLoad((options) => {
  const id = options?.id

  if (!id) {
    uni.showToast({
      title: '缺少详情信息',
      icon: 'none'
    })
    return
  }

  loadDetail(String(id))
})
</script>

<template>
  <view class="person-detail-page">
    <view v-if="loading" class="person-detail-page__loading">
      <wd-loading />
    </view>
    <template v-else>
      <wd-cell-group custom-class="person-detail-card" title="基础信息">
        <wd-cell :value="displayValue(detail.name)" title="姓名" />
        <wd-cell :value="displayValue(detail.phone)" title="手机号" />
      </wd-cell-group>
    </template>
  </view>
</template>
```

## List Navigation Template

```ts
const handleDetail = (item: PersonListItem) => {
  if (!item.id) {
    uni.showToast({ title: '缺少详情信息', icon: 'none' })
    return
  }

  uni.navigateTo({
    url: `/pages-core/person/detail?id=${item.id}`
  })
}
```

