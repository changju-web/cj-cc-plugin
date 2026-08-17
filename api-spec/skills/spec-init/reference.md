# init 参考 — config.json 字段与边界情况

`api-spec/config.json` 是可选配置，**只放覆盖项**，存在才生效，不存在走脚本内置缺省（自动探测）。
这样做的好处：特殊项目不改脚本源码，插件/脚本升级不覆盖用户定制。

## 字段

```json
{
  "base": "http://10.18.80.20:9102",
  "envKey": "VITE_APP_BASE_API",
  "envDirs": ["apps/web"],
  "noisyPrefixes": ["/inner"]
}
```

| 字段 | 类型 | 缺省 | 作用 |
| --- | --- | --- | --- |
| `base` | string | 无（走 env 探测） | 开发环境网关地址。写入后 fetch-spec 不再依赖 env 文件 |
| `envKey` | string | `VITE_APP_BASE_API` | fetch-spec 在 env 文件里找的变量名。非 Vite 项目或端用不同命名时改（如 `VITE_APP_API_URL`） |
| `envDirs` | string[] | 自动探测 | env 文件查找目录（相对项目根）。缺省：monorepo（有 `apps/`）逐个扫 `apps/*`（目录名排序，先到先得），否则扫根目录 |
| `noisyPrefixes` | string[] | 见 gen-spec 内置 | **追加**噪音端点前缀（内置 `/actuator` `/v3/api-docs` `/swagger-resources` `/swagger-ui` `/doc.html` 已生效，无需重复写） |

优先级（fetch-spec 解析网关地址）：`--base` CLI > `OPENAPI_BASE` 环境变量 > `config.base` > env 文件探测。

## 何时写 config.json（spec-init 的探测产出）

| 探测结果 | 写什么 |
| --- | --- |
| env 里读到网关地址 | `{ "base": "<地址>" }`（最稳，fetch 不再依赖 env 解析） |
| 地址没读到，但 monorepo 下定位到了目标 app | `{ "envDirs": ["apps/<app>"] }`，后续 env 就位后自动可用 |
| envKey 非 `VITE_APP_BASE_API` | 追加 `"envKey": "<变量名>"` |
| 用户对话里直接给了地址 | `{ "base": "<地址>" }` |
| 全都没有 | 不写 config.json，README 指引后续手配 |

## 边界情况

- **monorepo 但没有 `apps/`**（如 `packages/*` 布局）：自动探测只认 `apps/`。定位到实际放 env 的目录后写 `envDirs` 指过去；根目录有 env 就不写（缺省扫根）。
- **多个 app 都能读到 envKey**：列出各 app 与地址让用户选，确认后写 `base`（或 `envDirs` 指向所选 app）。不要静默取第一个。
- **`.env.development.local` 不存在**：正常，优先级链会落到 `.env.development`，与 Vite 行为一致。
- **目标项目没有 package.json**：跳过 scripts 注入，汇报给直跑命令 `node api-spec/scripts/fetch-spec.mjs` / `node api-spec/scripts/gen-spec.mjs`。纪律段占位符也替换为直跑命令。
- **package.json 已有 `gen:spec` / `spec:pull` 同名脚本**：报告冲突，让用户决定覆盖与否，不静默改。
- **AGENTS.md 与 CLAUDE.md 并存**：优先 AGENTS.md（Codex/ZCode 系入口）。只有一个用那个，都没有创建 AGENTS.md。
- **目标文件已有「API Spec 识别纪律」段**：跳过追加，告知用户（可能重复 init 或手工加过）。
- **spec-init 不跑切片**：`output/` 留空。首次生成靠 spec-pull（网关拉取）或用户手放 json 后 `gen:spec`。

## 目录级 .gitignore 的原因

`api-spec/.gitignore` 写一行 `output/`，而不是写进项目根 .gitignore：规则跟着目录走，复制/删除目录时内聚，不污染根文件。`input/` 进 git（切片的源，离线可重跑）。
