<script setup lang="ts">
import { useStateRef, useTablePage } from '@gx-web/tool'
import { onMounted } from 'vue'
import { getModelFromJson } from '@gx-web/core'
import { GXPaginationTable, GXSearch, generateFormItems, generateTableColumns } from '@gx-web/ep-comp'
import { AlarmVO } from './model'
import { loadPage } from './api'

const [search, ,resetSearch] = useStateRef(() => getModelFromJson(AlarmVO))

const [list, { page, loading, loadList, reloadList, onChange }] = useTablePage(({ current, size }) =>
  loadPage({ ...search.value, pageNum: current, pageSize: size }).then(res => ({
    records: res.data.records,
    total: res.data.total
  })))

const columns = generateTableColumns(AlarmVO, [
  'deviceSn',
  'placeId',
  'alarmCode',
  'alarmTitle',
  'alarmDetail',
  'alarmTime',
  'createTime'
])

const searchItems = generateFormItems(AlarmVO, [
  'deviceSn'
])

onMounted(loadList)
</script>

<template>
  <GXPaginationTable
    v-model:page="page.current"
    v-model:limit="page.size"
    :columns="columns"
    :data="list"
    :loading="loading"
    :total="page.total"
    @pagination="onChange"
  >
    <template #header>
      <GXSearch :items="searchItems" :form="search" @submit="loadList" @reset="resetSearch();reloadList()" />
    </template>
  </GXPaginationTable>
</template>
