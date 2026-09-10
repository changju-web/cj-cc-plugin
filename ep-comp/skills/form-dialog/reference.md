# form-dialog Reference

## Incremental Injection Checklist

每次注入前必须检查：

- import 是否已存在
- ref 是否已存在
- handler 是否已存在
- 按钮是否已存在
- 组件实例是否已存在

## 自动模式组件模板

标准字段直接用字符串简写，`GxForm` 内置取消/确认按钮，通过 `@cancel` / `@submit` 处理。

API/model 的 import 跟随归属决策：统一管理形态消费 app 侧 `XxxApi`（FormModel 来自统一层）；就近形态 `../api` + `../model`（下例注释给出两种形态）：

```vue
<script setup lang="ts">
import { computed, reactive, useTemplateRef } from 'vue'
import type { FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useStateRef, useToggle } from '@gx-web/tool'
import { getModelFromJson } from '@gx-web/core'
import { generateFormItems, GxDialog, GxForm } from '@gx-web/ep-comp'
import { AlarmApi } from '@/api/<域>/alarm' // 统一管理形态；就近形态: import { add, update } from '../api'
import type { AlarmListItemModel } from '../model' // 统一管理形态行模型来自 '@gx-web/biz'
import { AlarmFormModel } from '../model' // 统一管理形态: import { AlarmFormModel } from '@gx-web/biz'

const emit = defineEmits<{ submitted: [] }>()
const [visible, setVisible] = useToggle(false)
const [loading, setLoading] = useToggle(false)
const [form, , resetForm] = useStateRef(() => getModelFromJson(AlarmFormModel))
const isEdit = computed(() => !!form.value.id)
const rules = reactive<FormRules>({
  alarmCode: [{ required: true, message: '请输入告警代码', trigger: 'blur' }]
})
const formItems = generateFormItems(AlarmFormModel, ['alarmCode', 'alarmTitle'])
const FormRef = useTemplateRef('FormRef')

const handleSubmit = async () => {
  try {
    setLoading(true)
    await FormRef.value?.validate()
    isEdit.value ? await AlarmApi.update(form.value) : await AlarmApi.add(form.value)
    ElMessage.success('操作成功')
    setVisible(false)
    emit('submitted')
  }
  finally {
    setLoading(false)
  }
}
</script>

<template>
  <GxDialog v-model="visible" title="新增 / 编辑" width="500px" @closed="resetForm">
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
```

## 自动模式扩展手段

复杂字段优先用以下扩展手段，**不要因为有部分字段复杂就整体切原生模式**：

### 条件显隐

```ts
{ prop: 'approveRemark', hide: (form) => form.approveStatus !== 2 }
```

### 动态 props（响应式依赖）

```ts
{ prop: 'objectId', type: 'test-object-select', props: { appId: computed(() => form.value.appId) } }
```

### Radio 单选（内置 type）

```ts
{ prop: 'approveStatus', label: '审批状态', type: 'radio', props: { options: statusOptions } }
```

`options` 格式与 `select` 相同：`{ label, value, disabled? }[]`。

### render: h() 自定义渲染（兜底，组件无法注册时使用）

```ts
import { h } from 'vue'
import { ElRadio, ElRadioGroup } from 'element-plus'

{
  prop: 'approveStatus',
  label: '审批状态',
  render: (f) => h(
    ElRadioGroup,
    {
      modelValue: f.approveStatus,
      'onUpdate:modelValue': (v: number) => { f.approveStatus = v }
    },
    () => statusOptions.map(item => h(ElRadio, { value: item.value }, () => item.label))
  )
}
```

`render` 的 `f` 参数是响应式 form 对象，直接赋值即可触发更新。

### 业务组件注册后使用

在 `src/config/ep-comp.ts` 中注册：

```ts
compMap.registerComponents({ 'test-app-select': TestAppSelect })
```

之后直接用 `type`：

```ts
{ prop: 'appId', type: 'test-app-select', hide: (form) => form.approveStatus !== 1 }
```

## 原生模式组件模板

仅当 `hide` / `computed props` / `render: h()` / 组件注册都无法覆盖时使用。
切换前需列出原因并经用户确认。

```vue
<script setup lang="ts">
import { reactive, useTemplateRef } from 'vue'
import type { FormRules } from 'element-plus'
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage, ElRadio, ElRadioGroup } from 'element-plus'
import { useStateRef, useToggle } from '@gx-web/tool'
import { getModelFromJson } from '@gx-web/core'
import { GxDialog } from '@gx-web/ep-comp'
import { AlarmApi } from '@/api/<域>/alarm' // 统一管理形态；就近形态: import { audit } from '../api'
import { AlarmAuditModel } from '../model' // 统一管理形态: import { AlarmAuditModel } from '@gx-web/biz'

const emit = defineEmits<{ submitted: [] }>()
const [visible, setVisible] = useToggle(false)
const [loading, setLoading] = useToggle(false)
const [form, , resetForm] = useStateRef(() => getModelFromJson(AlarmAuditModel, { approveStatus: 1 }))
const rules = reactive<FormRules>({
  approveStatus: [{ required: true, message: '请选择审批状态', trigger: 'change' }],
  approveRemark: [{ required: true, message: '请输入审批备注', trigger: 'blur' }]
})
const FormRef = useTemplateRef('FormRef')
</script>
```

## Shared Contracts

### 根节点 contract

```vue
<template>
  <div class="module-kebab-case">
    <GxPaginationTable ... />
    <XxxAdd ref="XxxAddRef" @submitted="reloadList" />
  </div>
</template>
```

### 按钮注入规则

- 行级按钮：只能注入 `#action`
- 页面级按钮：只能注入 `#action-bar`
