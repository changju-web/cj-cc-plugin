<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { ElButton } from 'element-plus'
import { useStateRef, useTablePage } from '@gx-web/tool'
import { getModelFromJson } from '@gx-web/core'
import { GxPaginationTable, GxSearch, generateFormItems, generateTableColumns } from '@gx-web/ep-comp'
import { AlarmQueryModel, AlarmListItemModel } from './model'
import { AlarmApi } from '@/api/<域>/alarm'
import Detail from './components/detail.vue'

defineOptions({
  name: 'AlarmManage'
})

const DetailRef = useTemplateRef('DetailRef')
const [search, , resetSearch] = useStateRef(() => getModelFromJson(AlarmQueryModel))

const [list, { page, loading, loadList, reloadList, onChange }] = useTablePage<AlarmListItemModel>(
  ({ current, size }) =>
    AlarmApi.page({ ...search.value, pageNum: current, pageSize: size }).then(res => ({
      records: res.data.records,
      total: res.data.total
    }))
)

const columns = generateTableColumns(AlarmListItemModel, ['alarmCode', 'alarmTitle'])
const searchItems = generateFormItems(AlarmQueryModel, ['deviceSn'])

const handleDetail = (row: AlarmListItemModel) => {
  DetailRef.value?.init(row.id)
}

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

      <template #action="{ row }">
        <ElButton link type="primary" @click="handleDetail(row)">
          详情
        </ElButton>
      </template>
    </GxPaginationTable>

    <Detail ref="DetailRef" />
  </div>
</template>
