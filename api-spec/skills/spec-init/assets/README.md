# api-spec

把后端 OpenAPI json 转成 **agent 友好的切片**，供业务开发时按需识别接口。

## 解决什么问题

后端一份 OpenAPI json 通常 500KB / 十几万 token。整份喂给 agent 会撑爆上下文、烧钱、且长会话后记忆衰退导致幻觉接口。本目录通过预处理把大 json 拆成小切片，agent 干活时**只按需 Read 需要的那几个文件**——精准取回，不灌满。

## 目录结构

```text
api-spec/
├── .gitignore          # 忽略 output/（目录级规则，跟着目录走）
├── config.json         # 可选覆盖项（base / envKey / envDirs / noisyPrefixes，见下）
├── input/              # 源 OpenAPI json（进 git，spec:pull 自动覆盖这里）
├── scripts/
│   ├── fetch-spec.mjs  # 从开发环境网关拉取 OpenAPI json（零依赖，Node 全局 fetch）
│   └── gen-spec.mjs    # 预处理脚本（零依赖，Node 内置 fs）
└── output/             # 切片产物（gitignore，运行时索引）
    ├── index.md             # 顶层聚合索引：服务清单 + 使用纪律
    └── <服务名>/            # 按服务名分子目录
        ├── index.md         # 该服务的 tag 分组接口 + schema 一览
        ├── paths/*.json     # 每个端点一个文件（$ref 已内联展开）
        └── schemas/*.json   # 每个 DTO 一个文件
```

## 日常用法

```bash
# 后端更新了接口 → 一条命令：拉最新 json 覆盖 input/ + 重跑切片
{{CMD_PULL}}

# 默认只刷新 input/ 里已存在的服务；拉全部服务（含网关新增的）：
{{CMD_PULL}} --all         # --only=服务A,服务B 指定服务；--list 只看网关服务清单

# 手头已有 json（非该网关导出）→ 自己丢进 input/ → 只重跑切片
{{CMD_GEN}}

# agent 干业务开发时（识别接口的纪律，详见 AGENTS.md / CLAUDE.md「API Spec 识别纪律」）
#   1. Read output/index.md           定位目标服务
#   2. Read output/<服务>/index.md     找到需要的接口
#   3. 按需 Read paths/*.json          只取需要的几个切片
```

## 可选配置 config.json

只放覆盖项，全部字段可省；不存在则脚本走内置缺省（自动探测）：

```json
{
  "base": "http://10.18.80.20:9102",
  "envKey": "VITE_APP_BASE_API",
  "envDirs": ["apps/web"],
  "noisyPrefixes": ["/inner"],
  "contextPaths": { "招商管理": "/investment" }
}
```

- `base`：网关地址。写入后 fetch-spec 不再依赖 env 文件
- `envKey`：fetch-spec 在 env 文件里找的变量名（缺省 `VITE_APP_BASE_API`）
- `envDirs`：env 文件查找目录，相对项目根（缺省自动探测：monorepo 扫 `apps/*`，单仓扫根目录）
- `noisyPrefixes`：**追加**噪音端点前缀（内置 `/actuator` 等已生效）
- `contextPaths`：手动下载的 json 的网关前缀映射（key 为服务名）。走 spec:pull 拉取的 json 自带 `x-context-path` 元数据，不需要配

## 拉取脚本做了什么（fetch-spec.mjs）

替代「手动打开 doc.html → 下载 openapi.json → 覆盖 input/」的浏览器操作：

1. **定位网关**：优先级 `--base=` 参数 > `OPENAPI_BASE` 环境变量 > config.json 的 `base` > env 文件探测（按 Vite 优先级读 `.env.development.local` → `.env.development` 的 `envKey` 变量，查找目录为 `envDirs` 或自动探测）。
2. **直连拉取**：`GET {base}/v3/api-docs/swagger-config` 拿服务清单（含每个服务的网关前缀 `contextPath`，缺失时从 `url` 推导），逐个 `GET {base}<url>` 下载——与 doc.html 页面的数据源相同，无需浏览器、无需登录。下载的 json paths 不含网关前缀，落盘前把 contextPath 以顶层扩展字段 `x-context-path` 一并写入。
3. **默认只刷新已有服务**：`input/` 里已存在 `<服务名>_OpenAPI.json` 的才覆盖；`--all` 拉全部、`--only=a,b` 指定（可拉新服务）。
4. **内容比对防误写**：规范化键序后深度比较，无变化不写盘（避免 git 噪音）；请求失败或响应不是合法 OpenAPI 时保留旧文件、非零码退出。
5. **自动重跑 gen-spec.mjs**：拉取全部成功后直接生成切片（`--no-gen` 跳过）。

## 预处理脚本做了什么（gen-spec.mjs）

对每份 input json 做这些处理（产物已简化，agent 无需重复处理）：

1. **过滤噪音端点**：`/actuator`、`/v3/api-docs`、`/swagger-resources`、`/swagger-ui`、`/doc.html` 等 Spring Boot 运维端点直接剔除（config.json 可追加）。
2. **拼接网关前缀**：切片 `path` = contextPath + 服务内路径，即前端真实调用路径。优先级：input json 的 `x-context-path` > config.json 的 `contextPaths` 映射 > 无（index.md 标注「未知」）。切片文件名保持服务内路径（产物目录已按服务分组）。
3. **`$ref` 内联展开**：`#/components/schemas/X` 全部递归展开成完整字段，agent 不用跨文件追引用。
4. **响应裁剪**：每个 operation 只保留 2xx 成功响应，4xx/5xx 失败结构砍掉，避免重复展开。
5. **折叠 MyBatis-Plus IPage 框架字段**：分页响应里的 `countId`/`maxLimit`/`optimizeCountSql`/`optimizeJoinOfCountSql`/`searchCount`/`pages`/`orders` 等框架内部字段移除，保留业务字段（`records`/`total`/`size`/`current`），并用 `$simplified` 标记注明折叠了啥。
6. **多服务支持**：扫 `input/` 下所有 `.json`；子目录形式 `input/<服务名>/openapi.json` 用目录名作服务名，平铺形式用文件名（自动去掉 `_OpenAPI`/`api-docs`/`swagger` 等后缀）。
7. **索引从数据推导**：接口按 spec 自带 `tags` 分组；Schema 一览按「引用该 schema 的接口的 tag」派生分组（引用次数最多的 tag），无接口引用的归「未在接口中引用」——不依赖任何业务知识写死。
8. **全量重跑**：每次清空 `output/` 重建，不做增量（开发辅助工具，全量也就十几秒，不值得引入状态管理）。

## 关键设计决策

| 决策点       | 选择                                                | 理由                                                                      |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------------------- |
| 取回方式     | 精准取回（非灌满）                                  | 12万 token 灌进上下文，长会话后记忆衰退，agent 幻觉接口                   |
| 取回点       | 本地落盘 + Read（非 MCP）                           | spec 是静态文件，零运行时依赖；离线可用                                   |
| 输入格式     | OpenAPI json（非 Knife4j 导出的 md）                | md 丢 `required`/`format`/`minLength` 等约束，且不可程序化解析；json 是源 |
| 切片结构     | paths + schemas 双维度 + 内联 `$ref`                | 单维度拆 path 时 schema 还是坨大的；内联消除跨文件追引用                  |
| 分组依据     | tag 派生（非硬编码业务前缀）                        | 分组从数据推导，任何项目可用；业务知识变化不需要改脚本                    |
| 网关前缀     | `x-context-path` 元数据随 input 落盘（非改写 paths / sidecar） | input 保持后端原样，后端改前缀 diff 只动一行；单文件自包含不失同步        |
| spec 变更    | 切片永远用新版（不做漂移检测）                      | 漂移检测是后续开发的事，本工具不越界                                      |
| 脚本来源     | 零依赖手写（非 redocly）                            | 探查后 0 external $ref / 0 allOf，复杂结构不存在，redocly 是过度设计      |
| 产物归属     | gitignore（output 目录级 `.gitignore`）             | 产物是运行时索引，不进库；目录级规则封装内聚                              |
| 何时跑       | 手动（`spec:pull` 拉取+切片一条龙）                 | 后端更新时机脚本无法感知；拉取动作本身已自动化                            |
| 拉取方式     | HTTP 直连 swagger-config / api-docs（非浏览器操作） | doc.html 数据源就是这两个 GET 端点，浏览器点下载是多余的人肉环节          |
| 指引机制     | AGENTS.md / CLAUDE.md（非 skill）                   | skill 靠 description 触发，可靠性是赌局；AGENTS.md 每次必读               |
| 多 json 支持 | 扫 input 目录、按服务名分产物子目录                 | schema 名跨服务可能冲突（如通用响应壳），分子目录隔离干净                 |
| 项目差异配置 | config.json 覆盖项（非改脚本源码）                  | 特殊项目不改脚本；插件/脚本升级不覆盖用户定制                             |

## 已知债务（边界，不是 bug）

1. **agent 不会主动报代码漂移**：后端改了字段，agent 改对应模块时以**当前 spec 为准**，旧代码冲突就按 spec 重写，不会主动提醒"这里跟新 spec 不一致"。漂移检测归后续开发流程。
2. **干净环境首跑靠纪律兜底**：`output/` 不在版本库，新机器/同事 clone 后必须先跑 `{{CMD_GEN}}`。兜底靠 AGENTS.md / CLAUDE.md「API Spec 识别纪律」段，不靠占位文件。
3. **复杂结构会 FATAL**：脚本对 `allOf`/`oneOf`/`anyOf` 做了断言，遇到直接退出。后端未来引入继承结构时，需改用 `@redocly/openapi-core` 或在脚本补合并逻辑。
4. **噪音过滤靠前缀列表**：内置 Spring Boot 标准运维端点；非标噪音端点加进 config.json 的 `noisyPrefixes`。

## 修改指引

| 想改什么                | 改哪里                                                                   |
| ----------------------- | ------------------------------------------------------------------------ |
| 加新的噪音端点前缀      | `config.json` 的 `noisyPrefixes`（追加，内置已生效）                     |
| 手动 json 补网关前缀    | `config.json` 的 `contextPaths`（`{ "服务名": "/前缀" }`）               |
| 改服务名提取规则        | `scripts/gen-spec.mjs` 的 `collectInputs()`                              |
| 改产物目录布局          | `scripts/gen-spec.mjs` 的 `writeServiceOutput()` / `buildServiceIndex()` |
| 改折叠的 IPage 字段     | `scripts/gen-spec.mjs` 的 `IPAGE_NOISE` 常量                             |
| 临时读非默认位置的 json | `OPENAPI_IN=路径 {{CMD_GEN}}`（不改代码）                                |
| 临时换拉取网关地址      | `{{CMD_PULL}} --base=http://host:port`（不改代码）                       |
| 改网关地址的固定来源    | `config.json` 的 `base`（或 `envKey` / `envDirs` 控制 env 探测）         |
| 改默认拉取范围          | `{{CMD_PULL}} --all` / `--only=a,b`                                      |
| 改 agent 使用纪律       | AGENTS.md / CLAUDE.md 的「API Spec 识别纪律」段（纪律和脚本必须同步）    |
