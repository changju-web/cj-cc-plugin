<script setup lang="ts">
import { h, ref } from 'vue'
import { useLoadMap, useToggle } from '@gx-web/tool'
import { generateDescriptionsItems, GxDescriptions, GxDialog } from '@gx-web/ep-comp'
import { AlarmApi } from '@/api/<域>/alarm'
import { AlarmDetailModel } from '../model'

defineOptions({
  name: 'AlarmDetail'
})

const statusOptions = [
  { label: '待处理', value: 0 },
  { label: '已处理', value: 1 }
]
const statusMap = Object.fromEntries(statusOptions.map(o => [o.value, o.label]))

const [visible, setVisible] = useToggle(false)
const currentId = ref('')

const [detail, { load, loading, resetData }] = useLoadMap<AlarmDetailModel>(
  () => AlarmApi.byId(currentId.value).then(res => res.data)
)

const items = generateDescriptionsItems(AlarmDetailModel, [
  'alarmCode',
  'alarmTitle',
  {
    prop: 'alarmStatus',
    render: (d) => h('span', statusMap[d.alarmStatus] ?? '--')
  },
  {
    prop: 'alarmTime',
    label: '告警周期',
    span: 2,
    render: (d) => h('span', `${d.alarmTime || '--'} ~ ${d.endTime || '--'}`)
  },
  { prop: 'alarmDetail', span: 2 },
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
