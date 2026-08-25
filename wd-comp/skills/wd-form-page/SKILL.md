---
name: wd-form-page
description: "Generate mini-program Wot UI submit form pages for apps/mini-program. Use for requests like 新增页面、编辑页面、表单页、提交页面、wd-form、zodAdapter、给小程序列表加新增入口、生成独立 add/edit 页面. Produces class FormModel with @gx-web/core, API add/update wrappers, wd-form + FormInstance + zodAdapter validation, useStateRef form state, useToggle submitting state, useNotify success/error handling, uni.navigateBack, and optional uni.$emit event refresh."
---

# wd-comp 表单页生成

## Overview

这个 skill 生成或增量追加小程序提交型表单页。小程序端默认使用独立页面，不默认生成弹窗。

负责内容：

- `model/index.ts` 中追加 `XxxFormModel`
- `api/index.ts` 中追加 `addXxx` / `updateXxx`
- `add.vue` / `edit.vue` / 指定表单页面
- 可选 `event/index.ts` 刷新列表
- 可选向列表页注入 `handleAdd` / `handleEdit`

不负责内容：

- 重写列表页主结构
- 生成详情页
- 手写 `pages.json`

## Required References

生成代码前先阅读：

1. `../../references/core-tool.md`
2. `../../references/mini-program.md`
3. `./reference.md`

## Project Conventions（docs/ui-codegen.md，每次运行最先读）

产出位置、model/api 引用形态、字典与上传组件用法偏好是每项目不同的工程约定，不能写死：

1. 读 `docs/ui-codegen.md`：存在 → 用「共通」与「小程序 (wd-comp)」小节的约定；缺项 → 只探测补缺
2. 不存在 → 探测小程序端存量页面归纳初始约定（目录 / 命名 / import 形态 / 组件用法），低置信项用 AskUserQuestion 确认，**人工确认后**才落盘
3. 人工编辑优先于探测结论；冲突以文件为准；删除文件触发重新探测

## Form Contract

- 表单 model 使用 `class + @ClassName + @FieldName`
- 表单状态使用 `useStateRef(() => getModelFromJson(XxxFormModel))`
- 提交 loading 使用 `useToggle(false)`
- 表单组件使用 `wd-form`
- 校验优先使用 `zodAdapter`
- `FormRef` 类型使用 `FormInstance`
- 成功提示优先使用 `useNotify().success`
- 提交成功后 `uni.navigateBack()`，并按需 `uni.$emit(eventKey)`

## Incremental Injection Rules

如果要给已有列表页追加入口，只允许：

1. 追加 import
2. 追加 `handleAdd` / `handleEdit`
3. 向 header 或卡片操作区追加按钮
4. 按需追加 `onLoad/onUnload` 事件刷新

不要重排 `gx-list` 主结构。

## Field Rules

- 输入框：`wd-input`
- 文本域：`wd-textarea`
- 单选：`wd-radio-group + wd-radio` 或 `gx-dict-radio`
- 字典选择：优先项目已有 `gx-dict-picker` / `gx-dict-radio` / `gx-dict-checkbox`
- 日期范围：优先 `gx-date-range-picker`
- 地址：优先 `features/standard-address`
- 上传：优先项目已有 `gx-upload`

## Success Criteria

一次成功输出至少满足：

- 项目约定已读取，或本次完成探测 + 确认落盘（`docs/ui-codegen.md`）
- 表单 model 使用 `@gx-web/core`。
- 表单状态使用 `useStateRef`。
- loading 使用 `useToggle`。
- 表单校验使用 `wd-form + zodAdapter + FormInstance`，除非已有模块采用其他稳定模式。
- 提交错误使用 `useNotify().reqError(error)` 或项目既有错误处理。
- 不引入 uView、Vuex、Vue 2 class component 或旧全局 `$xxx` 方法。

## 反馈捕获（生成会话收尾，不阻塞交付）

本会话中用户对产物**显式纠偏**（指出不对 + 给改法）、**主动要求**（期望效果，非纠错）或**要求重生成**时，交付前完成落账：

1. 可泛化的纠偏/要求 → 提炼成一行规则，增量写入本项目 `docs/ui-codegen.md` 对应小节（只写规则语句，不记原话；机制同上文「Project Conventions」）
2. 往 `docs/codegen-ledger.md`（无则创建，进 git）追加一行：

   ```text
   - [YYYY-MM-DD] wd-comp:wd-form-page | <纠偏|要求|重生成> | <用户原话摘录> | <当时的处理> | <涉及产物路径>
   ```

3. 主动要求类**双写**（约定文件 + 台账各一条）；纯纠偏至少记台账

只记本会话内显式信号，闲聊与推测不入账。台账供市场蒸馏巡检（skill-evolution:inspect）消费，原文不改写，行尾处理标记由巡检追加。

