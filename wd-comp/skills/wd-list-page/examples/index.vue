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

const [list, { loadList, reloadList, status, loading, page }] =
  useListStream<PersonListItem>(({ current, size }) =>
    loadPersonPage({
      page: { current, size },
      queryParams: query.value
    }).then(({ data }) => data)
  )

const totalText = computed(() => `共 ${page.value.total} 条`)

const displayValue = (value: unknown) =>
  value === null || value === undefined || value === '' ? '--' : String(value)

const handleSearch = () => {
  reloadList()
}

const handleReset = () => {
  resetQuery()
  reloadList()
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
        <view class="person-card">
          <view class="person-card__title">{{ displayValue(item.name) }}</view>
          <view class="person-card__meta">{{ displayValue(item.phone) }}</view>
        </view>
      </template>
    </gx-list>
  </view>
</template>

<style lang="scss" scoped>
.person-page {
  min-height: 100vh;
  background: #f6f7fb;
}

.person-page__header {
  box-sizing: border-box;
  padding: 20rpx 24rpx 16rpx;
  background: #fff;
}

.person-page__summary {
  margin-top: 16rpx;
  color: #3d4656;
  font-size: 26rpx;
  line-height: 36rpx;
}

.person-card {
  box-sizing: border-box;
  margin-bottom: 20rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 12rpx;
}

.person-card__title {
  color: #1f2329;
  font-weight: 600;
  font-size: 32rpx;
  line-height: 44rpx;
}

.person-card__meta {
  margin-top: 12rpx;
  color: #646a73;
  font-size: 26rpx;
  line-height: 38rpx;
}
</style>
