# contextPath 以 x-context-path 元数据随 input json 落盘

网关（Knife4j/springdoc 聚合）下载的 OpenAPI json 里 paths 不含网关前缀（`contextPath`，如 `/investment`），只存在 swagger-config 服务清单里——切片若直接使用会丢前缀，agent 据此生成的接口调用会 404。决定：fetch-spec 下载时把 contextPath（缺失时从 `url` 剥 `/v3/api-docs` 推导）以顶层扩展字段 `x-context-path` 写进 input json，gen-spec 切片时按「spec 元数据 > config.json 的 `contextPaths` 映射 > 无（index 显式标注未知）」拼出全路径。选元数据字段而非改写 paths 或 sidecar，是为了让 input 尽量保持后端原样（后端改前缀时 diff 只动一行）、单文件自包含不失同步、gen-spec 保持零网络依赖。

## Considered Options

- **改写 input 的 paths 加前缀**：input 不再是后端原样，手动下载丢进 input 的路径与之不一致，且后端改前缀会让全部 paths diff。
- **sidecar 映射文件（如 `input/context-paths.json`）**：json 与映射可能不同步（单独删/改任一边），多一个文件多一种漂移。
- **`x-context-path` 元数据字段（选定）**：OpenAPI `x-` 扩展惯例，自包含；代价是该字段非后端产出——正是本 ADR 记录的点。

## Consequences

- input json 含一个后端不产出的字段；「无变化跳过写入」的比较在注入该字段之后进行，旧版无字段的 input 会自动重写补齐。
- 切片 `paths/*.json` 的 `path` 是全路径，但文件名保持服务内路径（产物目录已按服务分组，逐文件重复前缀是冗余）。
- 手动下载的 json 无该字段，靠 config.json 的 `contextPaths` 兜底；两者皆无时 index.md 标注「未知」而非静默当作无前缀。
