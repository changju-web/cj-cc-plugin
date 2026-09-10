---
name: crud-page
description: "Compatibility/orchestration entry for @gx-web/ep-comp complete CRUD/CURD page scaffolds from Swagger, Knife4j, OpenAPI JSON, request/response examples, or existing module code. Use when the user explicitly asks for 完整CRUD、CURD、增删改查、一整套页面、列表+新增+编辑+删除, or when they want the old all-in-one crud-page behavior. For pure list/table requests prefer table-page; for adding add/edit/audit/approval form dialogs prefer form-dialog; for read-only detail dialogs prefer detail-dialog."
---

# ep-comp CRUD 编排入口

## 定位

这个 skill 是兼容旧提示词的编排入口，不再直接维护完整 CRUD 代码模板。

具体代码生成职责由以下 skill 承担：

- `table-page`：生成列表页 / 查询页 / 分页表格底座
- `form-dialog`：生成新增、编辑、审核、审批等提交型弹窗
- `detail-dialog`：生成查看详情、只读详情弹窗

`crud-page` 只负责识别用户意图、决定调用顺序、组合输出边界。

## 路由规则

按用户真实意图选择执行链路：

| 用户意图 | 执行链路 |
| --- | --- |
| 只要列表页、查询页、分页表格、页面骨架 | 使用 `table-page` |
| 要新增、编辑、审核、审批、提交弹窗 | 先使用 `table-page`，再使用 `form-dialog` |
| 要详情、查看详情、只读弹窗 | 先使用 `table-page`，再使用 `detail-dialog` |
| 要完整 CRUD / CURD / 增删改查 / 一整套页面 | 使用 `table-page` + `form-dialog`，按需追加 `detail-dialog` |
| 已有列表页，只追加提交弹窗 | 只使用 `form-dialog` |
| 已有列表页，只追加详情弹窗 | 只使用 `detail-dialog` |

如果用户只说“根据接口生成列表页”，不要继续使用 `crud-page` 自己生成代码，应路由到 `table-page`。

如果用户说“完整 CRUD”“增删改查”“一整套页面”，再按组合链路执行。

## 执行步骤

1. 先判断输入来源：Swagger / Knife4j / OpenAPI JSON / 请求响应示例 / 现有模块代码。
2. 判断目标是否属于 `@gx-web/ep-comp` 体系；如果无法判断，先询问技术栈或组件体系。
3. 根据“路由规则”选择目标 skill。
4. 读取目标 skill 的 `SKILL.md`，并按目标 skill 要求读取其 `reference.md`。
5. 先完成目标 skill 的「API/Model 归属决策」（项目约定 / 探测 / 用户确认），再生成代码。
6. 按目标 skill 的输出约束生成或修改代码。
7. 如果执行链路包含多个 skill，必须按顺序执行：
   - 先生成或确认 `table-page` 的稳定挂点
   - 再执行 `form-dialog` / `detail-dialog` 的增量注入
8. 输出中说明当前使用的链路，例如：

```text
执行链路：table-page -> form-dialog
```

## 组合约束

- `table-page` 是列表页结构 owner。
- `form-dialog` 和 `detail-dialog` 只能做增量注入。
- 不要在 `crud-page` 内复刻 `table-page` / `form-dialog` / `detail-dialog` 的模板。
- 不要把旧的一体化模板作为优先来源。
- 如果执行链路中存在冲突，以目标执行 skill 的规则为准。

特别注意：

- 表单弹窗组件规则以 `form-dialog` 为准。
- 详情弹窗组件规则以 `detail-dialog` 为准。
- 列表页根节点、挂点和分页表格规则以 `table-page` 为准。

## 降级策略

当输入信息不足以完整生成页面时：

- 优先输出目标 skill 允许的最小结构草稿。
- 不要猜测 request 实例、分页参数、响应解包层级、枚举 options、权限控制。
- 所有不确定内容统一进入“待确认项”，并使用“需人工确认”措辞。

## 成功标准

一次成功的 `crud-page` 编排至少应满足：

- 正确识别用户是要纯列表、提交弹窗、详情弹窗，还是完整 CRUD。
- 输出明确的执行链路。
- 只加载并遵循实际需要的执行 skill。
- 不产生与执行 skill 冲突的旧模板代码。
- 完整 CRUD 场景按 `table-page -> form-dialog` 组合生成，必要时再追加 `detail-dialog`。
