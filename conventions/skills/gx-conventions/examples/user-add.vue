<script setup lang="ts">
import { computed, h, useTemplateRef } from 'vue'
import { getModelFromJson } from '@gx-web/core'
import { useFormDirtyTracker, useLoadList, useLoadMap, useStateRef, useToggle } from '@gx-web/tool'
import { GxDialog, GxForm, generateFormItems } from '@gx-web/ep-comp'
import type { FormRules } from 'element-plus'
import type { UserTableModel } from './user-model'
import { UserFormModel } from './user-model'
import { useEncrypt } from '@/hooks'
import { passwordIntensity, required, requiredArray } from '@/utils/formRules'
import { validatorPhone } from '@/utils/validate'
import User from '@/api/system/user'
import { SystemDeptTreeSelectMultiple, loadDeptUser, loadDeptUserSetting } from '@/features/system'

defineOptions({
  name: 'UserAdd'
})

const emit = defineEmits<{
  submitted: []
}>()

const [visible, setVisible] = useToggle(false)
const [loading] = useToggle(false)

const [form, setForm, resetForm] = useStateRef(() =>
  getModelFromJson(UserFormModel, {
    password: '',
    phone: '',
    userRoles: [],
    nickname: '',
    realName: '',
    userType: '',
    gender: '1',
    userDepts: [],
    email: '',
    status: 1
  })
)

const isEdit = computed(() => !!form.value.id)

const dialogTitle = computed(() => `${isEdit.value ? '编辑' : '新增'}用户`)

const FormRef = useTemplateRef('FormRef')

const rules: FormRules = {
  username: [required()],
  password: [required(), passwordIntensity()],
  nickname: [required()],
  gender: [required()],
  phone: [required(), { validator: validatorPhone }],
  userDepts: [required(), requiredArray()],
  userRoles: [required(), requiredArray()],
  email: [{ type: 'email', message: '请输入正确的邮箱地址' }]
}

const col = { span: 12 }

const formItems = generateFormItems(UserFormModel, [
  {
    prop: 'username',
    col: { span: 24 },
    props: { disabled: isEdit }
  },
  {
    prop: 'password',
    col: { span: 24 },
    props: { type: 'password', showPassword: true },
    hide: () => isEdit.value
  },
  { prop: 'phone', col },
  {
    prop: 'userRoles',
    col,
    type: 'system-role-select'
  },
  {
    prop: 'userDepts',
    col,
    render: () =>
      h(SystemDeptTreeSelectMultiple, {
        modelValue: form.value.userDepts,
        'onUpdate:modelValue': (val: string[]) => {
          form.value.userDepts = val
        },
        showRoot: false,
        multiple: true,
        style: 'width: 100%'
      })
  },
  { prop: 'nickname', col },
  { prop: 'realName', col },
  { prop: 'userType', col, type: 'dict-select', props: { dictCode: 'user-type' } },
  { prop: 'gender', col, type: 'dict-select', props: { dictCode: 'system-gender' } },
  { prop: 'email', col },
  {
    prop: 'status',
    col,
    type: 'dict-radio',
    props: { dictCode: 'system-status', radioProps: { border: true } }
  }
])

const { isFieldDirty, resetToInitial, updateInitial } = useFormDirtyTracker(form)

const [currentUserDept, { reloadList: reloadUserDept }] = useLoadList(() =>
  loadDeptUser(form.value.id).then(({ data }) => data.map((item) => item.deptId))
)

const [currentUserRoles, { reloadList: reloadUserRole }] = useLoadList(() =>
  User.userRoleList(form.value.id).then(({ data }) => data.map((item) => item.roleId))
)

const [, { load: loadMoreInfo }] = useLoadMap(() =>
  User.moreInfo(form.value.id).then(({ data }) => data)
)

const init = () => {
  visible.value = true
}

const initEdit = async (row: UserTableModel) => {
  setVisible(true)

  setForm({
    id: row.id,
    username: row.username,
    userType: row.userType,
    nickname: row.nickname,
    gender: row.gender,
    email: row.email,
    status: row.status
  })
  Promise.all([
    loadMoreInfo().then((data) => setForm({ phone: data.phone, realName: data.realName })),
    reloadUserRole().then(() => setForm({ userRoles: currentUserRoles.value })),
    reloadUserDept().then(() => setForm({ userDepts: currentUserDept.value }))
  ]).then(() => {
    updateInitial()
  })
}

const handleSubmit = async () => {
  try {
    await FormRef.value?.validate()
    loading.value = true

    const { data, message } = await (isEdit.value ? User.update : User.add)({
      ...form.value,
      password: form.value.password ? await useEncrypt().encrypt(form.value.password) : undefined
    })

    const userId = form.value.id || data.id

    if (isFieldDirty('userRoles')) {
      await User.userRoleBatch(form.value.userRoles.map((item) => ({ roleId: item, userId })))
    }

    if (isFieldDirty('userDepts')) {
      await loadDeptUserSetting(form.value.userDepts.map((item) => ({ deptId: item, userId })))
    }

    ElMessage.success(message)
    visible.value = false
    emit('submitted')
  } catch (error) {
    console.error('handleSubmit => error', error)
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  resetToInitial()
}

const close = () => {
  resetForm()
}

defineExpose({
  init,
  initEdit
})
</script>

<template>
  <GxDialog v-model="visible" :title="dialogTitle" width="700px" @closed="close">
    <GxForm
      ref="FormRef"
      v-model="form"
      v-loading="loading"
      :items="formItems"
      :rules="rules"
      :row="{ gutter: 20 }"
      label-width="90px"
      show-reset
      @cancel="setVisible(false)"
      @reset="handleReset"
      @submit="handleSubmit"
    />
  </GxDialog>
</template>

<style lang="scss" scoped></style>
