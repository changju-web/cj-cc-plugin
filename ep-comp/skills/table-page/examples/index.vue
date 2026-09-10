<script setup lang="ts">
import { onMounted } from 'vue'
import { ElButton } from 'element-plus'
import { useStateRef, useTablePage } from '@gx-web/tool'
import { getModelFromJson } from '@gx-web/core'
import { GxPaginationTable, GxSearch, generateFormItems, generateTableColumns } from '@gx-web/ep-comp'
import { AlarmQueryModel, AlarmListItemModel } from './model'
import { AlarmApi } from '@/api/<域>/alarm'

defineOptions({
  name: 'AlarmManage'
})

const [search, , resetSearch] = useStateRef(() => getModelFromJson(AlarmQueryModel))

const [list, { page, loading, loadList, reloadList, onChange }] = useTablePage<AlarmListItemModel>(
  ({ current, size }) =>
    AlarmApi.page({ ...search.value, pageNum: current, pageSize: size }).then(res => ({
      records: res.data.records,
      total: res.data.total
    }))
)

const columns = generateTableColumns(AlarmListItemModel, ['alarmCode', 'alarmTitle', 'createTime'])
const searchItems = generateFormItems(AlarmQueryModel, ['deviceSn'])

onMounted(loadList)
</script>

<template>
  <div class="alarm-manage">
    <GxPaginationTable
      v-model:page="page.current"
      v-model:limit="page.size"
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="page.total"
      @pagination="onChange"
    >
      <template #header>
        <GxSearch v-model="search" :items="searchItems" @submit="loadList" @reset="resetSearch();reloadList()" />
      </template>

      <template #action-bar />

      <template #action="{ row }">
        <ElButton link type="primary">详情</ElButton>
      </template>
    </GxPaginationTable>
  </div>
</template>
