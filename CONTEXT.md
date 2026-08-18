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

spec-to-model / spec-to-api 在目标项目里生成并维护的 `docs/api-spec.md`，记录该项目的 model/api 目录、命名、http 类型、app 注入点等生成约定；由探测 + 询问产出，允许人工编辑，下次运行以文件内容为准，删除即触发重新探测。

_Avoid_: 配置文件（它是记忆不是配置）、缓存（进版本库、团队共享）

**api 工厂（api factory）**:

share 层的 `createXxxApi(request)` 工厂函数，接收注入的 request 实例、返回该实体的方法集，使 api 定义与各 app 的 axios 配置解耦。是 spec-to-api 的 share 层产物。

_Avoid_: api 类、api 服务（没有实例化语义）

**app 层薄壳（app shell）**:

app 内约 6 行的实例化文件：从 share 包导入 api 工厂、注入本 app 的 request、默认导出实例。每个 app 一份，request 注入点各不相同。

_Avoid_: 包装器（它是纯实例化，无包装逻辑）
