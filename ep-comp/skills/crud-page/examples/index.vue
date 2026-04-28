<script setup lang="ts">
import { defineAsyncComponent, h, onMounted, useTemplateRef } from 'vue'
import { ElButton, ElInput, ElMessage, ElPopconfirm, ElTag, ElTable, ElTableColumn } from 'element-plus'
import { useStateRef, useTablePage } from '@gx-web/tool'
import { getModelFromJson } from '@gx-web/core'
import { GxPaginationTable, GxSearch, generateFormItems, generateTableColumns } from '@gx-web/ep-comp'
import { AlarmQueryModel, AlarmVO } from './model'
import { loadPage, removeById } from './api'

defineOptions({
  name: 'AlarmManage'
})

const AlarmAdd = defineAsyncComponent(() => import('./components/alarm-add.vue'))

const AlarmAddRef = useTemplateRef('AlarmAddRef')

const [search, , resetSearch] = useStateRef(() => getModelFromJson(AlarmQueryModel))

const [list, { page, loading, loadList, reloadList, onChange }] = useTablePage<AlarmVO>(
  ({ current, size }) =>
    loadPage({ ...search.value, pageNum: current, pageSize: size }).then(res => ({
      records: res.data.records,
      total: res.data.total
    }))
)

const columns = generateTableColumns(AlarmVO, [
  'deviceSn',
  'placeId',
  'alarmCode',
  'alarmTitle',
  {
    prop: 'alarmTime',
    label: '告警时间',
    minWidth: 180,
    render: ({ row }) => h('span', row.alarmTime || '--')
  },
  'alarmDetail',
  'createTime'
])

const searchItems = generateFormItems(AlarmQueryModel, [
  'deviceSn'
])

/** 新增 */
const handleAdd = () => {
  AlarmAddRef.value?.init()
}

/** 编辑 */
const handleEdit = (row: AlarmVO) => {
  AlarmAddRef.value?.initEdit(row)
}

/** 删除 */
const handleDel = async (row: AlarmVO) => {
  try {
    const { message } = await removeById(row.id)
    ElMessage.success(message)
    loadList()
  }
  catch (error) {
    console.error('error =>', error)
  }
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
        <GxSearch v-model="search" :items="searchItems" @submit="loadList" @reset="resetSearch();reloadList()">
          <template #form-item-device-sn>
            <ElInput v-model="search.deviceSn" clearable placeholder="请输入设备SN">
              <template #append>
                <ElButton @click="loadList">快速查询</ElButton>
              </template>
            </ElInput>
          </template>
        </GxSearch>
      </template>

      <template #table-column-alarm-code="{ row }">
        <ElTag :type="row.alarmCode ? 'danger' : 'info'">{{ row.alarmCode || '未配置' }}</ElTag>
      </template>

      <template #action="{ row }">
        <ElButton link type="primary" @click="handleEdit(row)">编辑</ElButton>
        <ElPopconfirm title="是否删除?" placement="left" @confirm="handleDel(row)">
          <template #reference>
            <ElButton link type="danger">删除</ElButton>
          </template>
        </ElPopconfirm>
      </template>

      <template #action-bar>
        <ElButton type="primary" @click="handleAdd">新增</ElButton>
      </template>

      <template #footer>
        <div>当前页 {{ list.length }} 条，共 {{ page.total }} 条</div>
      </template>

      <template #default>
        <ElTable :data="list" border>
          <ElTableColumn prop="deviceSn" label="设备SN" min-width="180" />
          <ElTableColumn prop="alarmTitle" label="告警标题" min-width="180" />
          <ElTableColumn label="告警代码" min-width="160">
            <template #default="{ row }">
              <ElTag :type="row.alarmCode ? 'danger' : 'info'">{{ row.alarmCode || '未配置' }}</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="createTime" label="入库时间" min-width="180" />
        </ElTable>
      </template>
    </GxPaginationTable>
    <AlarmAdd ref="AlarmAddRef" @submitted="reloadList" />
  </div>
</template>
