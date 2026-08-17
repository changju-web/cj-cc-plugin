---
name: spec-pull
description: "后端接口更新后刷新 api-spec 切片：从开发环境网关拉最新 OpenAPI json（spec:pull，支持 --all / --only / --list）或把手头的 json 放进 input/ 后重跑切片（gen:spec）。当用户说 后端更新了接口、拉取最新 spec、刷新 api-spec、重新切片、接口定义跟后端对不上、output 过期/不存在 时使用。项目还没有 api-spec/ 目录时路由回 spec-init。"
---

# spec-pull — api-spec 拉取与重切片引导

## 前置

目标项目根目录没有 `api-spec/` → 不要手工搭，改用 spec-init skill 完整初始化。

## 模式判断

二选一，依据 json 从哪来：

### A. 后端是 Knife4j / springdoc 网关，要拉最新

优先跑 package.json 里注册的脚本（按 lockfile 探测包管理器：`pnpm` / `npm run` / `yarn` / `bun run`），
没有注册时直跑 `node api-spec/scripts/fetch-spec.mjs`：

1. **看网关上有什么**（拿不准时先跑）：`spec:pull --list`
2. **参数选择**：
   - 默认：只刷新 `input/` 里已存在的服务（忠实手动流程，不会静默引入新服务）
   - `--all`：拉网关上全部服务（**首次拉取**或后端上新服务时用这个）
   - `--only=服务A,服务B`：指定服务（可拉 `input/` 里没有的）
   - `--no-gen`：只下载不重切片（一般用不上）
3. 拉取成功会**自动重跑切片**，一条龙完成。

网关地址找不到时脚本会 FATAL 并列出解析链（`--base` > `OPENAPI_BASE` > `config.json` 的 `base` > env 探测）——
按提示补 `api-spec/config.json` 的 `base`（或临时 `--base=http://host:port`）后重跑。

### B. 手头已有 json（非该网关导出，如后端直接发的文件）

1. 放进 `api-spec/input/`，命名 `<服务名>_OpenAPI.json`（服务名决定 `output/` 子目录名）
2. 跑 `gen:spec`（`pnpm gen:spec` / `npm run gen:spec` / `node api-spec/scripts/gen-spec.mjs`）

## 汇报

转述脚本输出的**变更明细**：哪个服务有变化/无变化、各服务 paths 与 schemas 数量、
新引入的服务（`output/` 会多一个子目录）。最后提醒一句：切片使用纪律不变（按需 Read，禁止整份灌入），
新切片生效后业务代码以当前 spec 为准。
