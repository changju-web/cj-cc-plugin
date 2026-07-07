<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { getModelFromJson } from '@gx-web/core'
import { useStateRef, useToggle } from '@gx-web/tool'
import { loadPersonDetail } from './api'
import { PersonDetail } from './model'

definePage({
  style: {
    navigationBarTitleText: '人员详情'
  }
})

const [detail, setDetail] = useStateRef(() => getModelFromJson(PersonDetail))
const [loading, setLoading] = useToggle(false)

const displayValue = (value: unknown) =>
  value === null || value === undefined || value === '' ? '--' : String(value)

const loadDetail = async (id: string) => {
  try {
    setLoading(true)
    const { data } = await loadPersonDetail(id)
    setDetail(data)
  } catch (error) {
    console.error('person load detail failed:', error)
    uni.showToast({ title: '详情加载失败', icon: 'none' })
  } finally {
    setLoading(false)
  }
}

onLoad((options) => {
  const id = options?.id

  if (!id) {
    uni.showToast({ title: '缺少详情信息', icon: 'none' })
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
    <wd-cell-group v-else custom-class="person-detail-card" title="基础信息">
      <wd-cell :value="displayValue(detail.name)" title="姓名" />
      <wd-cell :value="displayValue(detail.phone)" title="手机号" />
    </wd-cell-group>
  </view>
</template>

<style lang="scss" scoped>
.person-detail-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 24rpx;
  background: #f6f7fb;
}

.person-detail-page__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

.person-detail-card {
  overflow: hidden;
  border-radius: 12rpx;
}
</style>
