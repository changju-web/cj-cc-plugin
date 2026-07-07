# cj-cc-marketplace

长聚科技 Claude Code 插件市场，面向团队业务场景的 skill 集合。

## 插件列表

| 插件 | 说明 |
|------|------|
| ep-comp | 基于 @gx-web/ep-comp 的业务代码生成插件 |
| wd-comp | 基于 mini-program、Wot UI、@gx-web/core 和 @gx-web/tool 的业务代码生成插件 |

## 安装

### 1. 添加 Marketplace

```bash
/plugin marketplace add changju-web/cj-cc-marketplace
```

### 2. 安装插件

```bash
/plugin install ep-comp@cj-cc-marketplace
```

## 更新

插件更新后，重新安装即可获取最新版本：

```bash
/plugin install ep-comp@cj-cc-marketplace
```

## 包含的 Skill

### table-page

从 Swagger / Knife4j / OpenAPI JSON、请求响应示例或现有模块代码生成基于 `@gx-web/ep-comp` 的列表页底座，包含 `QueryModel`、`ListItemModel`、`loadPage`、`GxSearch`、`GxPaginationTable`、`generateFormItems`、`generateTableColumns` 和稳定挂点。

适合提示词：生成列表页、查询页、分页表格、先生成页面骨架、根据接口生成查询条件和表格。

### form-dialog

在已有列表页上增量追加提交型弹窗能力，包含新增、编辑、审核、审批等表单弹窗，以及对应的 `FormModel`、API、按钮、ref、handler 和组件实例。

适合提示词：新增弹窗、编辑弹窗、审核弹窗、审批弹窗、给列表页加新增按钮、给表格行加编辑操作。

### detail-dialog

在已有列表页上增量追加只读详情弹窗能力，包含 `DetailModel`、`loadDetail`、详情按钮、ref、handler 和 `components/detail.vue`。

适合提示词：详情弹窗、查看详情、详情按钮、只读详情。

### crud-page

兼容旧的一体化入口，只负责识别完整 CRUD / CURD 诉求并编排 `table-page`、`form-dialog`、`detail-dialog`，不再维护独立的完整代码模板。

适合提示词：完整 CRUD、CURD、增删改查、一整套页面、列表 + 新增 + 编辑 + 删除。

推荐新流程：先用 `table-page` 生成列表页底座，再按需叠加 `form-dialog` 或 `detail-dialog`。旧的 `crud-page` 请求会被路由到这条组合链路。
