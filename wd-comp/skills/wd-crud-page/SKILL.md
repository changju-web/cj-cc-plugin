---
name: wd-crud-page
description: "Compatibility/orchestration entry for mini-program Wot UI complete business page scaffolds from Swagger, Knife4j, OpenAPI JSON, request/response examples, or existing module code. Use when the user explicitly asks for 小程序完整CRUD、CURD、增删改查、一整套小程序页面、列表+新增+编辑+详情, or wants wd-comp all-in-one behavior. Routes to wd-list-page, wd-form-page, and wd-detail-page instead of maintaining its own templates."
---

# wd-comp CRUD 编排入口

## 定位

这个 skill 是兼容完整业务模块诉求的编排入口，不直接维护完整代码模板。

具体代码生成职责由以下 skill 承担：

- `wd-list-page`：生成小程序列表页 / 查询页 / 滚动分页底座
- `wd-form-page`：生成新增、编辑、提交型独立页面
- `wd-detail-page`：生成查看详情、只读详情独立页面

## 路由规则

| 用户意图 | 执行链路 |
| --- | --- |
| 只要列表页、查询页、分页列表、页面骨架 | 使用 `wd-list-page` |
| 要新增 / 编辑 / 表单 / 提交页面 | 先使用 `wd-list-page`，再使用 `wd-form-page` |
| 要详情 / 查看详情 / 只读详情 | 先使用 `wd-list-page`，再使用 `wd-detail-page` |
| 要完整 CRUD / CURD / 增删改查 / 一整套页面 | 使用 `wd-list-page + wd-form-page + wd-detail-page` |
| 已有列表页，只追加提交页面 | 只使用 `wd-form-page` |
| 已有列表页，只追加详情页 | 只使用 `wd-detail-page` |

如果用户只说“根据接口生成小程序列表页”，不要在 `wd-crud-page` 内生成代码，应路由到 `wd-list-page`。

## 执行步骤

1. 判断输入来源：Swagger / Knife4j / OpenAPI JSON / 请求响应示例 / 现有模块代码。
2. 判断目标是否属于 `apps/mini-program + Wot UI` 体系；无法判断时先确认。
3. 根据路由规则选择目标 skill。
4. 读取目标 skill 的 `SKILL.md`，并按目标 skill 要求读取公共 reference 和本地 `reference.md`。
5. 按目标 skill 的输出约束生成或修改代码。
6. 如果执行链路包含多个 skill，必须按顺序执行：
   - 先生成或确认 `wd-list-page` 的列表底座
   - 再执行 `wd-form-page` / `wd-detail-page` 的增量注入
7. 输出中说明当前使用的链路，例如：

```text
执行链路：wd-list-page -> wd-form-page
```

## 组合约束

- `wd-list-page` 是列表页结构 owner。
- `wd-form-page` 和 `wd-detail-page` 只能做增量入口注入，不能重写列表页。
- 不要在 `wd-crud-page` 内复制三个执行 skill 的模板。
- 如果执行链路中存在冲突，以目标执行 skill 的规则为准。

## 降级策略

当输入信息不足以完整生成页面时：

- 优先输出目标 skill 允许的最小结构草稿。
- 不猜测接口分页结构、响应解包层级、枚举字典、权限控制。
- 所有不确定内容进入“待确认项”，并使用“需人工确认”措辞。

## 成功标准

一次成功的 `wd-crud-page` 编排至少满足：

- 正确识别用户是要纯列表、提交页面、详情页面，还是完整 CRUD。
- 输出明确的执行链路。
- 只加载并遵循实际需要的执行 skill。
- 不产生与执行 skill 冲突的一体化旧模板。
- 不引入 uView、Vuex、Vue 2 class component 或旧全局 `$xxx` 方法。

