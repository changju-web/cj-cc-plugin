<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance } from '@wot-ui/ui/components/wd-form/types'
import { zodAdapter } from '@wot-ui/ui'
import z from 'zod'
import { getModelFromJson } from '@gx-web/core'
import { useStateRef, useToggle } from '@gx-web/tool'
import { useNotify } from '@/hooks/use-notify'
import { addPerson } from './api'
import { PersonFormModel } from './model'
import { eventKey } from './event'

definePage({
  style: {
    navigationBarTitleText: '新增人员'
  }
})

const FormRef = ref<FormInstance>()
const [form] = useStateRef(() => getModelFromJson(PersonFormModel))
const [submitting, setSubmitting] = useToggle(false)

const schema = zodAdapter(
  z.object({
    name: z.string('请输入姓名'),
    phone: z.string('请输入手机号')
  })
)

const submit = async () => {
  const { valid } = (await FormRef.value?.validate()) || {}
  if (!valid) {
    return
  }

  try {
    setSubmitting(true)
    await addPerson(form.value)
    useNotify().success({
      message: '新增成功',
      onClose: () => uni.navigateBack()
    })
    uni.$emit(eventKey)
  } catch (error) {
    console.error('新增失败', error)
    useNotify().reqError(error)
  } finally {
    setSubmitting(false)
  }
}
</script>

<template>
  <view class="person-add-page">
    <wd-form ref="FormRef" :model="form" :schema="schema" :title-width="100">
      <wd-cell-group title="基础信息" custom-class="person-add-page__card">
        <wd-form-item title="姓名" prop="name" required>
          <wd-input v-model="form.name" placeholder="请输入姓名" clearable />
        </wd-form-item>
        <wd-form-item title="手机号" prop="phone" required>
          <wd-input v-model="form.phone" type="number" placeholder="请输入手机号" clearable />
        </wd-form-item>
      </wd-cell-group>
    </wd-form>

    <view class="person-add-page__footer">
      <wd-button :loading="submitting" type="primary" block @click="submit">确定</wd-button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.person-add-page {
  min-height: 100vh;
  padding-top: 20rpx;
  background: #f6f7fb;
}

.person-add-page__card {
  margin: 0 24rpx;
  overflow: hidden;
  border-radius: 12rpx;
}

.person-add-page__footer {
  padding: 28rpx 24rpx 40rpx;
}
</style>
