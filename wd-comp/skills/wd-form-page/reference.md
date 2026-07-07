# wd-form-page Reference

## Model Template

```ts
import { ClassName, FieldName } from '@gx-web/core'

@ClassName('人员表单')
export class PersonFormModel {
  id?: string

  @FieldName('姓名')
  name!: string

  @FieldName('手机号')
  phone!: string
}
```

## API Template

```ts
import request from '@/service'
import type { PersonFormModel } from '../model'

const URL = '/module-wechat/person'

export const addPerson = (data: PersonFormModel) => {
  return request({
    method: 'post',
    url: `${URL}/add`,
    data
  })
}

export const updatePerson = (data: PersonFormModel) => {
  return request({
    method: 'post',
    url: `${URL}/update`,
    data
  })
}
```

## Page Template

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance } from '@wot-ui/ui/components/wd-form/types'
import { zodAdapter } from '@wot-ui/ui'
import z from 'zod'
import { onLoad } from '@dcloudio/uni-app'
import { getModelFromJson } from '@gx-web/core'
import { useStateRef, useToggle } from '@gx-web/tool'
import { useNotify } from '@/hooks/use-notify'
import { addPerson, loadPersonDetail, updatePerson } from './api'
import { PersonFormModel } from './model'
import { eventKey } from './event'

definePage({
  style: {
    navigationBarTitleText: '人员编辑'
  }
})

const FormRef = ref<FormInstance>()
const [form, setForm] = useStateRef(() => getModelFromJson(PersonFormModel))
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
    form.value.id ? await updatePerson(form.value) : await addPerson(form.value)
    useNotify().success({
      message: '保存成功',
      onClose: () => uni.navigateBack()
    })
    uni.$emit(eventKey)
  } catch (error) {
    console.error('保存失败', error)
    useNotify().reqError(error)
  } finally {
    setSubmitting(false)
  }
}

const cancel = () => {
  uni.navigateBack()
}

onLoad(async (options) => {
  if (!options?.id) {
    return
  }

  const { data } = await loadPersonDetail(String(options.id))
  setForm(data)
})
</script>

<template>
  <view class="person-form-page">
    <scroll-view class="person-form-page__scroll" scroll-y>
      <wd-form ref="FormRef" :model="form" :schema="schema" :title-width="100">
        <wd-cell-group title="基础信息" custom-class="person-form-page__card">
          <wd-form-item title="姓名" prop="name" required>
            <wd-input v-model="form.name" placeholder="请输入姓名" clearable />
          </wd-form-item>
          <wd-form-item title="手机号" prop="phone" required>
            <wd-input v-model="form.phone" type="number" placeholder="请输入手机号" clearable />
          </wd-form-item>
        </wd-cell-group>
      </wd-form>

      <view class="person-form-page__footer">
        <wd-button type="info" block plain @click="cancel">取消</wd-button>
        <wd-button :loading="submitting" type="primary" block @click="submit">确定</wd-button>
      </view>
    </scroll-view>
  </view>
</template>
```

## Event Template

```ts
export const eventKey = 'person-reload'
```

列表页监听：

```ts
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { eventKey } from './event'

onLoad(() => uni.$on(eventKey, reloadList))
onUnload(() => uni.$off(eventKey))
```

