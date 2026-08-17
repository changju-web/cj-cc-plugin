---
name: spec-init
description: "为没有 api-spec 基础设施的前端项目做一次性初始化：搭建 api-spec/{input,scripts,output} 目录、复制零依赖拉取/切片脚本、注入 gen:spec 与 spec:pull 到 package.json、把「API Spec 识别纪律」段追加进 AGENTS.md/CLAUDE.md。当用户说 初始化 api-spec、引入 api-spec、搭建 OpenAPI 切片、给这个项目接上后端接口切片、接口 json 太大撑爆上下文 时使用。项目已有 api-spec/ 时不要触发（改用 spec-pull）。"
---

# spec-init — api-spec 一次性初始化

把后端 OpenAPI json 的「网关拉取 → 预处理切片 → agent 按需 Read」基础设施装进目标项目。
spec-init 只搭架子，**不自动拉取、不跑切片**——网络环境不可假设，首次拉取留给用户决定（见收尾汇报）。

## 前置检查

1. 目标项目根目录已有 `api-spec/` → **停止**，提示改用 spec-pull skill（或人工比对升级），不要覆盖。
2. 确认是 Node 前端项目（有 `package.json`）。没有也能装，但第 4 步的 scripts 注入跳过，汇报里给 `node api-spec/scripts/...` 直跑命令。

## 流程

### 1. 搭目录

创建（目标项目根下）：

```text
api-spec/
  .gitignore          # 内容一行：output/
  input/.gitkeep
  scripts/
  output/             # 空目录即可，产物 gitignore
```

### 2. 复制脚本与 README

从本 skill 所在插件目录复制（相对本 SKILL.md 的路径）：

- `../../scripts/fetch-spec.mjs` → `api-spec/scripts/fetch-spec.mjs`
- `../../scripts/gen-spec.mjs` → `api-spec/scripts/gen-spec.mjs`
- `assets/README.md` → `api-spec/README.md`

README 复制前把 `{{CMD_GEN}}` / `{{CMD_PULL}}` 占位符替换为实际命令（包管理器探测见第 4 步）。

### 3. env 探测 → config.json（分析推荐，不写死）

目的：让 `fetch-spec.mjs` 以后能自己找到开发环境网关地址。

1. 判断 monorepo：存在 `apps/` 目录或 `pnpm-workspace.yaml` → monorepo。
2. 候选 env 文件（按 Vite 优先级，`.env.development.local` 先于 `.env.development`）：
   - monorepo → 逐个扫 `apps/*/.env.development(.local)`
   - 非 monorepo → 扫根目录 `.env.development(.local)`
3. 在候选里找网关地址：读变量 `VITE_APP_BASE_API`（缺省 envKey），值形如 `http(s)://host:port`。候选 app 不止一个能读到时，列出各 app 与地址让用户选，**不要静默取第一个**。
4. 生成 `api-spec/config.json`（存在才生效，只写探测到的字段）：
   - 探测到网关地址 → `{ "base": "<地址>" }`
   - 没探测到地址但确认了 monorepo 布局 → `{ "envDirs": ["apps/<app>"] }`，后续 env 变量就位后 fetch 自动可用
   - envKey 不是 `VITE_APP_BASE_API`（如 `VITE_APP_API_URL`）→ 加 `"envKey": "<实际变量名>"`
5. 用户在对话里直接给了网关地址 → 用之写 `base`。
6. 全都没有 → 跳过 config.json，README 已有手配指引，汇报里提一句。

字段与边界情况详见 `reference.md`。

### 4. package.json 注入 scripts

按 lockfile 探测包管理器，得到命令前缀 `RUN`：

| lockfile | RUN |
| --- | --- |
| `pnpm-lock.yaml` | `pnpm` |
| `yarn.lock` | `yarn` |
| `bun.lock` / `bun.lockb` | `bun run` |
| `package-lock.json` 或都没有 | `npm run` |

在 `package.json` 的 `scripts` 里补（已有同名脚本则先报告冲突，不覆盖）：

```json
"gen:spec": "node api-spec/scripts/gen-spec.mjs",
"spec:pull": "node api-spec/scripts/fetch-spec.mjs"
```

### 5. AGENTS.md / CLAUDE.md 注入纪律段

选择目标文件：两者并存 → `AGENTS.md`；只有一个 → 那个；都没有 → 创建 `AGENTS.md`。

读 `assets/agents-discipline.md`，把 `{{CMD_GEN}}` / `{{CMD_PULL}}` 替换为 `RUN` 前缀的实际命令
（如 `pnpm gen:spec` / `npm run spec:pull`），追加到文件末尾。文件已有「API Spec 识别纪律」段则跳过并告知。

### 6. 汇报

列出：创建了什么（目录树 + 注入的 scripts + 纪律段落点 + config.json 是否生成及内容）。
下一步二选一，交给用户：

- 网关可达 → `{{RUN}} spec:pull --all` 首次拉取并自动切片
- 手头已有 json → 放进 `api-spec/input/`（命名 `<服务名>_OpenAPI.json`）后跑 `{{RUN}} gen:spec`
