# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 仓库定位

这是一个 **Codex 插件 Marketplace**，用于管理和分发面向团队业务场景的插件。不是一个可构建/运行的项目，没有 build、test、lint 命令。

## 仓库结构

```text
.claude-plugin/
  marketplace.json            — Marketplace 清单（注册所有插件）
ep-comp/                      — 基于 @gx-web/ep-comp 的业务代码生成插件
  .claude-plugin/
    plugin.json               — 插件元数据（名称、版本、作者）
  skills/                     — 每个 skill 一个目录
    crud-page/                — 兼容旧入口，生成完整 CRUD / CURD 页面
    table-page/               — 生成列表页 / 查询页 / 分页表格底座
    form-dialog/              — 生成新增、编辑、审核、审批等表单弹窗
    detail-dialog/            — 生成只读详情弹窗
    <skill-name>/
      SKILL.md                — skill 指令（流程规则、触发条件、输出格式）
      reference.md            — API 签名与类型参考（从 monorepo 提取的知识）
      examples/               — 可落地的代码示例
ssd-workflow/                 — Spec-Driven Development 工作流编排插件（OpenSpec × Superpowers）
  .claude-plugin/
    plugin.json               — 插件元数据
  skills/                     — 纯 SKILL.md 驱动，无 reference.md / 脚本 / 状态文件
    ssd/                      — 主入口：流程导航（用产物判阶段）
    ssd-propose/              — 阶段 1 WHAT：brainstorming → /opsx:propose
    ssd-plan/                 — 阶段 2 HOW：→ superpowers:writing-plans
    ssd-apply/                — 阶段 3 执行：按 plan 实现 + 执行纪律路由
    ssd-archive/              — 阶段 4 归档：→ /opsx:archive
api-spec/                     — OpenAPI 切片与代码生成插件（拉取 → 切片 → model → api 全链路，源：by-investment-platform-frontend）
  .claude-plugin/
    plugin.json               — 插件元数据
  scripts/                     — 插件级共享脚本，init 时复制进目标项目 api-spec/scripts/
    fetch-spec.mjs            — 网关拉取：config.json + env 自动探测（monorepo 扫 apps/*，单仓扫根目录）；contextPath 以 x-context-path 元数据随 json 落盘（缺失时从 url 推导）
    gen-spec.mjs              — 切片：tag 派生 schema 分组（不写死业务前缀）+ config 噪音前缀追加；path 拼接网关 contextPath 为全路径（优先级 x-context-path > config.contextPaths > 标注未知）
  skills/
    spec-init/                 — 一次性初始化：搭目录 → 复制脚本 → 注入 scripts → 写 AGENTS.md 纪律段
      assets/                  — 模板资产（agents-discipline.md / README.md，占位符替换后落地）
    spec-pull/                 — 后端更新后拉取/重切片引导（缺 api-spec/ 时路由回 spec-init）
    spec-to-model/             — 切片 / 粘贴 OpenAPI → @gx-web/core class model（形态识别、类型语义还原、枚举抽取、三层增量合并；项目约定经 docs/api-spec.md 记忆文件适配）
      references/              — 规则书（类型映射 / FieldName 清洗 / 枚举抽取 / 嵌套与分页 / 输入源选择 / 项目约定探测）
      examples/                — 真机样本（约定探测过程、生成结果、格式对齐前后对照）
    spec-to-api/               — 切片 → 共享包 api 工厂 + app 层薄壳（按实体聚合、方法名尾段+动词映射按存量校准、schema 回链 model、分页 4 组合、http 类型与 api 同包统一落位、用户意图优先于存量多数派、三层保旧、不编造 spec 外默认值）
      references/              — 规则书（实体聚合 / 方法命名 / 请求形态 / 类型回链 / api 侧项目约定探测）
      examples/                — 真机样本（enterprise-info 全量生成、约定探测过程、无 model 兜底降级、分页参数 4 组合对照、xbwisdom biz 工厂 + 双 app 薄壳、页面级 api 迁移改造）
skill-evolution/              — 市场自进化蒸馏插件（慢环）：手动巡检消费项目 codegen ledger，详见 docs/skill-evolution.md
  .claude-plugin/
    plugin.json               — 插件元数据
  skills/
    inspect/                  — 蒸馏巡检：读注册表内各项目 ledger → 归因分层 + 复现 ≥2 门槛 → 四分类行动项 → 在途分支改 skill（不 push）
      references/             — consumers.md 消费项目注册表 / signals-and-thresholds 信号与门槛 / modify-discipline 修改纪律与禁区
conventions/                   — gx-conventions 插件（gx-web 库约定型用法，版本化约定载体，AGENTS.md 指针调用，见 docs/adr/0001；目录名不带前缀，注册名带）
  .claude-plugin/
    plugin.json               — 插件元数据（name: gx-conventions）
  skills/
    gx-conventions/           — 约定规范薄壳：定位声明 + 索引 + 红线（skill 目录须与 frontmatter name 一致，故保留前缀）
      references/             — core.md / tool.md / ep-comp.md / common.md 四篇约定（约定唯一权威源，生成 skill 不复制）
    gx-init/                  — 一次性初始化：把 gx-conventions 指针段幂等写入业务项目 AGENTS.md（装配类，无 examples/）
```

## Skill 文件职责分离

- **SKILL.md**：只写"什么时候触发"和"生成流程/规则"，不内联 API 签名
- **reference.md / references/**：只写组件 Props、函数签名、类型定义、完整模板，不写触发逻辑。单篇用 `reference.md`，多篇规则书用 `references/` 目录（渐进披露）
- **examples/**：提供可直接参考的落地代码

## 依赖关系

skill 中引用的组件和工具来自 monorepo `gx-web-lib`（`D:\Develop\Project\gx-web-lib`），主要涉及：

- `@gx-web/core` — 装饰器（`@FieldName`）、工具函数（`getModelFromJson`）
- `@gx-web/tool` — Hooks（`useTablePage`、`useStateRef`）
- `@gx-web/ep-comp` — 组件（`GXPaginationTable`、`GXForm`、`GXSearch`）和生成函数（`generateTableColumns`、`generateFormItems`）

monorepo API 变更时，需要同步更新对应 skill 的 `reference.md`。

## 新增插件

1. 在根目录创建以插件名称命名的目录（`kebab-case`）
2. 在插件目录下创建 `.claude-plugin/plugin.json`
3. 在 `.claude-plugin/marketplace.json` 的 `plugins` 数组中注册新插件

## 新增 Skill 规范

1. 在 `<plugin>/skills/` 下创建以 skill 名称命名的目录（`kebab-case`）
2. 必须包含 `SKILL.md`（frontmatter 含 `name` 和 `description`）
3. 如果依赖外部库 API，在同级创建 `reference.md` 或 `references/` 目录并在 `SKILL.md` 中引用
4. 提供至少一组 `examples/`；基础设施装配类 skill（无代码生成输出）不适用 examples/，模板资产放 `assets/`（占位符替换后落地）

## Agent skills

### Issue tracker

工单以本地 markdown 文件存放在 `.scratch/<feature>/` 下，详见 `docs/agents/issue-tracker.md`。

### Triage labels

沿用默认五个 triage 标签（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix），详见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局：根目录 `CONTEXT.md` + `docs/adr/`（懒创建），详见 `docs/agents/domain.md`。
