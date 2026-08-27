---
name: gx-conventions
description: "gx-web library usage conventions (convention-type knowledge, not a generator). Read before writing, reviewing, or refactoring any code that imports from the gx-web library (@gx-web/core, @gx-web/tool, @gx-web/ep-comp). Covers model classes (@FieldName, getModelFromJson, DetailModel), hooks selection (useStateRef, useToggle, useTablePage), declarative schema components (generateFormItems / generateTableColumns type-first, ComponentMap registration via declare module), and team Vue 3 conventions. Invoked via AGENTS.md pointer; generation tasks still go to ep-comp / wd-comp / api-spec skills."
---

# gx-web 库约定规范

## 定位

本 skill 是**约定型知识载体**：装跨项目通用的 gx-web 库官方用法规范，跟插件版本分发，主要经 AGENTS.md 指针调用，也响应"用 @gx-web 写 xx / 这样写 gx-web 对不对"类语义触发。

不是生成器。页面 / 弹窗 / model / api 生成任务仍走对应生成 skill（ep-comp、wd-comp、api-spec），生成 skill 内嵌的链路知识优先。

## 读取时机

- 编写、修改、评审、重构任何 import 自 `@gx-web/core` / `@gx-web/tool` / `@gx-web/ep-comp` 的代码
- 不确定某用法是否为库推荐姿势时，先查本 skill 再动手

## 索引（按知识域读对应篇）

| 篇 | 覆盖 |
| --- | --- |
| [references/core.md](references/core.md) | model class 手写规范：`@FieldName`、`getModelFromJson`、`DetailModel` |
| [references/tool.md](references/tool.md) | hooks 场景选择：`useStateRef` / `useToggle` / `useTablePage` |
| [references/ep-comp.md](references/ep-comp.md) | 声明式优先链、统一 v-model、ComponentMap 扩充注册 |
| [references/common.md](references/common.md) | 跨端共通 + 团队 Vue 3 约定（props / emits / slots / Pinia store） |

小程序端（wd-comp）特有约定暂未立篇，端内知识见 wd-comp 各 skill；慢环蒸馏出跨项目复用内容后增设 `wd-comp.md`。

## 红线（高频纠正项，全文细则见对应篇）

1. **声明式优先**：schema 能用 `type` 表达的不写 `render: h()`，更不落原生模式（ep-comp.md）
2. **业务组件先查注册表**：下结论"组件不存在"前，先看 `src/config/ep-comp.ts` 的 ComponentMap 注入（ep-comp.md）
3. **v-model 不手写**：GX 系组件的 modelValue 挂接由组件统一处理，禁止手写 `modelValue` + `onUpdate:modelValue`（ep-comp.md）
4. **响应式状态用 hooks**：组件状态对象用 `useStateRef`、布尔开关用 `useToggle`，不裸用 `ref({})` 再手写 reset（tool.md）
5. **`@FieldName` 是 UI 文案唯一来源**：表头 / label / placeholder 从装饰器取，同 class 内不得重复（core.md）
6. **model 纯字段**：model class 只写字段 + 装饰器（`@FieldName` / `@ClassName` / `@Default`），不放方法 / getter，派生逻辑归组件层；`BaseModel` / `BaseEntity` 为旧版遗弃，不继承（core.md）
7. **插槽名 kebab-case**：字段 `parkId` 的插槽是 `#form-item-park-id`，写 `#form-item-parkId` 无效；`#form-item-*` 仅在 type 无法解决（多字段绑定 / 组件 ref）时使用（ep-comp.md）
8. **旧版 hooks 遗弃**：`useState` / `useList` / `useMap` 为旧版，新代码一律用 `useStateRef` / `useLoadList` / `useLoadMap`；旧代码中见到不要沿用（tool.md）

## 与其他载体的边界

- **范围边界**：gx-web 库 = `../gx-web-lib`（@gx-web/core、@gx-web/tool、@gx-web/ep-comp + 配置类包）；消费项目内 `@gx-web/biz`、`@gx-web/share` 等私有包不属于本库，其用法约定归项目个性（ui-codegen.md）
- **项目个性约定**（如各项目的字典组件封装、全局注册表、校验命令）在消费项目 `docs/ui-codegen.md`，不在本 skill
- **约定唯一归属**：本 skill 是库级约定唯一权威源，生成 skill 的 reference 只保留链路必需部分，不复制本文约定
- 约定更新 = 市场修改 + bump 版本 + 消费端升级插件，不向消费项目落副本
