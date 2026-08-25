---
name: form-dialog
description: "Generate or incrementally add @gx-web/ep-comp form dialogs to a table/list page. Use for requests like 新增弹窗、编辑弹窗、表单弹窗、审核弹窗、审批弹窗、提交弹窗、action dialog、给列表页加新增/编辑/审核按钮, or add FormModel/API/buttons/refs/handlers to an existing table-page. Uses GxDialog plus generateFormItems + GxForm by default, supports automatic mode and confirmed native ElForm fallback, and preserves the existing GxPaginationTable skeleton."
---

# ep-comp 表单弹窗生成

## Overview

这个 skill 用于在已有 `table-page` 底座上，增量追加提交型弹窗能力。

负责内容：

- 追加 `FormModel` / `AuditModel`
- 追加 API：如 `add`、`update`、`audit`
- 生成 `components/*.vue`
- 向已有 `index.vue` 注入 import、ref、handler、按钮、组件实例

不负责内容：

- 重写整个 `table-page` 骨架
- 改写 `GxPaginationTable` 主结构
- 擅自重排 `columns` / `searchItems`

## Project Conventions（docs/ui-codegen.md，每次运行最先读）

产出位置、model/api 引用形态、组件注册方式偏好是每项目不同的工程约定，不能写死：

1. 读 `docs/ui-codegen.md`：存在 → 用「共通」与「PC (ep-comp)」小节的约定；缺项 → 只探测补缺
2. 不存在 → 探测 web 端存量页面归纳初始约定（目录 / 命名 / import 形态 / `ep-comp.ts` 组件注册），低置信项用 AskUserQuestion 确认，**人工确认后**才落盘
3. 人工编辑优先于探测结论；冲突以文件为准；删除文件触发重新探测

## Dialog Component Constraint

弹窗组件必须使用 `GxDialog`，不得使用 `ElDialog`。

## Expose Contract

- 新增/编辑：`init()` / `initEdit(row)`
- 审批等单操作：`init(row)` 接收整行对象，或 `init(id)` 仅接收 id，视业务而定

## Modes

### 自动模式（默认）

- 生成方式：`generateFormItems + GxForm`
- 适用于绝大多数场景，包含以下扩展手段：
  - 条件显隐：`hide: (form) => boolean`
  - 动态 props：`props: { key: computed(...) }` 传递响应式依赖
  - 自定义渲染：`render: (form) => h(Component, ...)` 处理 radio、强联动等无内置 type 的字段
  - 业务组件：在 `ep-comp.ts` 中注册后直接用 `type: 'xxx-select'`

- 判断标准：以上手段能覆盖的，都应优先用自动模式，**不能因为有一两个字段复杂就切换原生模式**

### 原生模式（降级）

- 生成方式：`ElForm + ElFormItem + 业务组件`
- 仅当自动模式的所有扩展手段（`hide` / `computed props` / `render: h()` / 组件注册）都无法覆盖时才使用
- 触发流程：**先列出哪些扩展手段已尝试、为何不适用，再经用户确认后生成**

## Incremental Injection Rules

每次注入只允许做以下五类增量修改：

1. 追加 import
2. 追加组件 ref
3. 追加 handler
4. 向 `#action` / `#action-bar` 注入按钮
5. 在根 `div` 内追加组件实例

## Idempotency Checklist

每次注入前必须检查：

- import 是否已存在
- ref 是否已存在
- handler 是否已存在
- 按钮是否已存在
- 组件实例是否已存在

## Success Criteria

一次成功输出至少应满足：

- 项目约定已读取，或本次完成探测 + 确认落盘（`docs/ui-codegen.md`）
- 弹窗使用 `GxDialog`
- 默认走自动模式，充分利用 `hide` / `computed props` / `render: h()` 覆盖复杂字段
- 切原生模式前已列出扩展手段不足的原因并经用户确认
- 生成的按钮只注入到 `#action` 或 `#action-bar`
- 组件实例只挂载在根 `div` 内部
- 不覆盖已有列表页结构

## API Reference

在生成代码前，先阅读 [API Reference](./reference.md)。

## 反馈捕获（生成会话收尾，不阻塞交付）

本会话中用户对产物**显式纠偏**（指出不对 + 给改法）、**主动要求**（期望效果，非纠错）或**要求重生成**时，交付前完成落账：

1. 可泛化的纠偏/要求 → 提炼成一行规则，增量写入本项目 `docs/ui-codegen.md` 对应小节（只写规则语句，不记原话；机制同上文「Project Conventions」）
2. 往 `docs/codegen-ledger.md`（无则创建，进 git）追加一行：

   ```text
   - [YYYY-MM-DD] ep-comp:form-dialog | <纠偏|要求|重生成> | <用户原话摘录> | <当时的处理> | <涉及产物路径>
   ```

3. 主动要求类**双写**（约定文件 + 台账各一条）；纯纠偏至少记台账

只记本会话内显式信号，闲聊与推测不入账。台账供市场蒸馏巡检（skill-evolution:inspect）消费，原文不改写，行尾处理标记由巡检追加。
