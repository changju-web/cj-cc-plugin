<script setup lang="ts">
import { reactive, useTemplateRef } from 'vue'
import type { FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useStateRef, useToggle } from '@gx-web/tool'
import { getModelFromJson } from '@gx-web/core'
import { generateFormItems, GxDialog, GxForm } from '@gx-web/ep-comp'
import { AlarmApi } from '@/api/<域>/alarm'
import { AlarmAuditModel } from '@gx-web/biz'

defineOptions({
  name: 'AlarmAudit'
})

const auditStatusOptions = [
  { label: '通过', value: 1 },
  { label: '拒绝', value: 2 }
]

const emit = defineEmits<{
  submitted: []
}>()

const [visible, setVisible] = useToggle(false)
const [loading, setLoading] = useToggle(false)
const [form, , resetForm] = useStateRef(() => getModelFromJson(AlarmAuditModel, { approveStatus: 1 }))
const FormRef = useTemplateRef('FormRef')

const rules = reactive<FormRules>({
  approveStatus: [{ required: true, message: '请选择审批状态', trigger: 'change' }],
  approveRemark: [{ required: true, message: '请输入审批备注', trigger: 'blur' }]
})

const formItems = generateFormItems(AlarmAuditModel, [
  {
    prop: 'approveStatus',
    label: '审批状态',
    type: 'radio',
    props: { options: auditStatusOptions }
  },
  {
    prop: 'approveRemark',
    props: { type: 'textarea', rows: 3, placeholder: '请输入审批备注' },
    hide: (f) => f.approveStatus !== 2
  }
])

const init = (row: { id: string }) => {
  resetForm()
  form.value.id = row.id
  setVisible(true)
}

const close = () => {
  resetForm()
}

const handleSubmit = async () => {
  try {
    setLoading(true)
    await FormRef.value?.validate()
    const { message } = await AlarmApi.audit(form.value)
    ElMessage.success(message)
    setVisible(false)
    emit('submitted')
  }
  finally {
    setLoading(false)
  }
}

defineExpose({ init })
</script>

<template>
  <GxDialog v-model="visible" title="审批" width="520px" @closed="close">
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
