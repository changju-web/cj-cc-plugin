# cj-cc-marketplace

面向团队业务场景的插件市场，分发代码生成与工作流编排类插件。本文件是术语表，只收录各插件语境里的专有概念。

## Language

### api-spec 插件

**contextPath（网关上下文路径）**:

网关暴露一个后端微服务时使用的路径前缀，来源于 swagger-config 服务清单的同名字段，如 `/investment`。

_Avoid_: 前缀、basePath、baseUrl

**服务内路径（service path）**:

后端服务自己产出的 OpenAPI json 中 paths 的原始形态，不含 contextPath，如 `/enterprise/info/page`。

_Avoid_: 相对路径、裸路径

**全路径（full path）**:

contextPath 拼接服务内路径的结果，即前端发起请求时使用的真实 URL 路径，如 `/investment/enterprise/info/page`。

_Avoid_: 完整地址（含 host 时才叫地址）

**api 工厂（api factory）**:

share 层的 `createXxxApi(request)` 工厂函数，接收注入的 request 实例、返回该实体的方法集，使 api 定义与各 app 的 axios 配置解耦。是 spec-to-api 的 share 层产物。

_Avoid_: api 类、api 服务（没有实例化语义）

**app 层薄壳（app shell）**:

app 内约 6 行的实例化文件：从 share 包导入 api 工厂、注入本 app 的 request、默认导出实例。每个 app 一份，request 注入点各不相同。

_Avoid_: 包装器（它是纯实例化，无包装逻辑）

### skill-evolution 插件

**生成信号台账（codegen ledger）**:

消费项目 `docs/codegen-ledger.md`，生成会话中用户显式纠偏 / 主动要求 / 要求重生成时逐条追加的信号记录（点名插件与 skill、类型、原话摘录、处理方式、涉及产物）；进项目 git，纯追加，原文不可改写，行尾处理标记由巡检追加。

_Avoid_: 日志（它是证据台账，不是运行日志）、反馈文件（丢了逐条可追踪的含义）

**巡检（inspect）**:

skill-evolution 插件的手动蒸馏动作：读注册表内各项目台账的未处理信号 → 归因分层 → 同规则点复现 ≥2 才升格市场行动项 → 在途进化分支改 skill 并 commit（不 push）。merge / push / bump 属于人工。

_Avoid_: 自动巡检（v1 无自动化）、扫描（不考古会话，台账是唯一输入）

**行动项（action item）**:

巡检产出的最小改动单元，四分类：冲突改 / 缺失增 / 冗余删 / 样本进 examples；每个行动项必须带归因层与 ≥2 条证据。

_Avoid_: 待办（它是蒸馏结论，不是任务清单）

**在途进化分支（in-flight evolution branch）**:

市场仓库 `skill-evolution/<日期>` 分支，巡检改动的落点；最多同时存在一个，人工审合 merge 后消失，merge 时 bump 涉事插件版本。

_Avoid_: 进化分支（丢了"未审合"的状态语义）

### gx-conventions 插件

**指针调用（pointer invocation）**:

AGENTS.md 以指令形式引用 skill 短名（如「涉及 @gx-web/* 先调 gx-conventions」）的加载方式，触发可靠性接近无条件注入，用于约定型 skill；区别于 description 语义触发。

_Avoid_: 自动加载（无自动含义）、注入（易与上下文注入混淆）

**库官方规范（library conventions）**:

gx-web 库层面跨项目通用的约定，唯一权威源在 gx-conventions 插件，跟插件版本分发、不向消费项目落副本；区别于装项目个性的约定记忆文件。

_Avoid_: 全局规范（无版本语义）、团队规范（丢失"跟库走"的归属）

### 跨插件

**约定型知识（convention knowledge）**:

无任务意图、写相关代码任何时候都须遵守的用法规范（hooks 选择、装饰器写法、声明式优先），载体为 gx-conventions 插件，靠指针调用；语义触发不可靠是其与生成型知识的分界。

_Avoid_: 规范类 skill（易误解为生成器）

**生成型知识（generation knowledge）**:

特定任务（表格页、表单弹窗、model / api 生成）的组合链路知识，内嵌于各生成 skill 的 reference 与流程，靠 description 语义触发。

_Avoid_: 无

**项目个性约定（project-specific conventions）**:

单个消费项目特有的封装与规则（字典组件族、注册表、校验命令），装在该项目约定记忆文件内，由快环探测与回写维护；禁止升格进市场 skill。

_Avoid_: 项目规范（与库官方规范混淆）

**约定记忆文件（conventions memory file）**:

生成 skill 在目标项目里生成并维护的记忆文件——api/model 层 `docs/api-spec.md`、UI 生成层 `docs/ui-codegen.md`（内分共通 / PC / 小程序三节）；记录该项目各生成层的目录、命名、形态等约定，由探测 + 询问产出，允许人工编辑，下次运行以文件内容为准，删除即触发重新探测。

_Avoid_: 配置文件（它是记忆不是配置）、缓存（进版本库、团队共享）
