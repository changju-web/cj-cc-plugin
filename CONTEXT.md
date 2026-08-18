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

**约定记忆文件（conventions memory file）**:

spec-to-model 在目标项目里生成并维护的 `docs/api-spec.md`，记录该项目的 model/api 目录、命名、http 类型等生成约定；由探测 + 询问产出，允许人工编辑，下次运行以文件内容为准，删除即触发重新探测。

_Avoid_: 配置文件（它是记忆不是配置）、缓存（进版本库、团队共享）
