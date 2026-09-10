<script setup lang="ts">
import { computed, reactive, useTemplateRef } from 'vue'
import type { FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useStateRef, useToggle } from '@gx-web/tool'
import { getModelFromJson } from '@gx-web/core'
import { generateFormItems, GxDialog, GxForm } from '@gx-web/ep-comp'
import { AlarmApi } from '@/api/<域>/alarm'
import type { AlarmListItemModel } from '../model'
import { AlarmFormModel } from '@gx-web/biz'

defineOptions({
  name: 'AlarmAdd'
})

const emit = defineEmits<{
  submitted: []
}>()

const [visible, setVisible] = useToggle(false)
const [loading, setLoading] = useToggle(false)
const [form, , resetForm] = useStateRef(() => getModelFromJson(AlarmFormModel))

const isEdit = computed(() => !!form.value.id)
const dialogTitle = computed(() => `${isEdit.value ? '编辑' : '新增'}告警`)

const rules = reactive<FormRules>({
  alarmCode: [{ required: true, message: '请输入告警代码', trigger: 'blur' }],
  alarmTitle: [{ required: true, message: '请输入告警标题', trigger: 'blur' }]
})

const formItems = generateFormItems(AlarmFormModel, ['alarmCode', 'alarmTitle', 'alarmDetail'])
const FormRef = useTemplateRef('FormRef')

const init = () => {
  setVisible(true)
}

const initEdit = (row: AlarmListItemModel) => {
  resetForm()
  form.value = { ...form.value, ...row }
  setVisible(true)
}

const close = () => {
  resetForm()
}

const handleSubmit = async () => {
  try {
    setLoading(true)
    await FormRef.value?.validate()
    const { message } = await (isEdit.value ? AlarmApi.update(form.value) : AlarmApi.add(form.value))
    ElMessage.success(message)
    setVisible(false)
    emit('submitted')
  }
  finally {
    setLoading(false)
  }
}

defineExpose({ init, initEdit })
</script>

<template>
  <GxDialog v-model="visible" :title="dialogTitle" width="500px" @closed="close">
    <GxForm
      ref="FormRef"
      v-model="form"
      :items="formItems"
      :rules="rules"
      :loading="loading"
      label-width="120px"
      @cancel="setVisible(false)"
      @submit="handleSubmit"
    />
  </GxDialog>
</template>
