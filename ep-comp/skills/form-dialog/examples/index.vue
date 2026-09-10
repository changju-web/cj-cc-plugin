<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { ElButton } from 'element-plus'
import { useStateRef, useTablePage } from '@gx-web/tool'
import { getModelFromJson } from '@gx-web/core'
import { GxPaginationTable, GxSearch, generateFormItems, generateTableColumns } from '@gx-web/ep-comp'
import { AlarmQueryModel, AlarmListItemModel } from './model'
import { AlarmApi } from '@/api/<域>/alarm'
import AlarmAdd from './components/alarm-add.vue'
import AlarmAudit from './components/alarm-audit.vue'

defineOptions({
  name: 'AlarmManage'
})

const AlarmAddRef = useTemplateRef('AlarmAddRef')
const AlarmAuditRef = useTemplateRef('AlarmAuditRef')
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

const handleAdd = () => {
  AlarmAddRef.value?.init()
}

const handleEdit = (row: AlarmListItemModel) => {
  AlarmAddRef.value?.initEdit(row)
}

const handleAudit = (row: AlarmListItemModel) => {
  AlarmAuditRef.value?.init(row)
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
        <ElButton link type="primary" @click="handleEdit(row)">
          编辑
        </ElButton>
        <ElButton link type="warning" @click="handleAudit(row)">
          审批
        </ElButton>
      </template>

      <template #action-bar>
        <ElButton type="primary" @click="handleAdd">
          新增
        </ElButton>
      </template>
    </GxPaginationTable>

    <AlarmAdd ref="AlarmAddRef" @submitted="reloadList" />
    <AlarmAudit ref="AlarmAuditRef" @submitted="reloadList" />
  </div>
</template>
