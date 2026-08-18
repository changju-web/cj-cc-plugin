# Project Conventions · api 侧约定探测与读取

**与 `spec-to-model/references/project-conventions.md` 是姊妹篇**：共享同一份记忆文件 `docs/api-spec.md`、同一套「读 → 探测 → 询问 → 写入」流程与可靠性原则（样本要够 / 多数派胜出 / 歧义必问 / 只读不写 / 尊重人工编辑）。本篇只写 **api 侧的探测点**。记忆文件已存在时，model 侧条目（model 目录/命名/class 角色）直接复用，不重探。

## api 侧的通用核心 vs 项目可适配

| 层 | 内容 | 处理方式 |
|---|---|---|
| **通用核心（固定）** | 工厂形态的生成逻辑（方法名推导、请求形态、类型回链、三层合并）；query→params / body→data 映射；不编造原则 | 写死在 skill 规则里 |
| **项目可适配** | api 目录；api 形态；服务前缀映射；http 类型名与位置；app 清单与 request 注入点；app api 目录；批量 id 工具；share 包名 | 走探测 → 询问 → 记忆 |

## 探测点（api 侧 7 项）

### 1. api 目录

**信号**：`export const create.*Api = (request` 聚类。

```text
扫 **/*.ts 找 export const create.*Api → 文件所在最高公共父目录 = api 目录根
  → 如 packages/share/src/api
探测不到（新项目无任何 api 文件）→ 问用户"api 工厂放哪个目录"
```

### 2. api 形态

**信号**：api 目录现有文件的导出形式。

```text
export const create.*Api = (request) => ({...})   → 工厂形态（本 skill 的原生形态）
export const load.* = (...) => request(...)        → 裸函数形态
class .*Api { static ... }                        → 静态类形态
```

- 工厂形态 → 直接生成
- 其他形态并存/唯一 → 问用户"新 api 按哪种形态生成"（本 skill 的 app 薄壳、request 注入配套只对工厂形态成立；其他形态时薄壳步骤跳过，如实报告能力边界）

### 3. 服务前缀映射

**信号**：现有 api 文件的 `const URL` 首段 ↔ api-spec 服务名对照（如 `/investment` ↔ 招商管理）。新服务无映射 → 问用户该服务的 URL 前缀。

### 4. http 类型名与位置

**信号**：`types/*.d.ts` 里的 `Res`/`ResPage`/`PageQuery` 定义（grep `^type Res\b|^interface Res\b` 等）。项目用别名（`ApiResponse`/`PageResult`）→ 按实际名生成。类型是全局声明（无 import）→ api 文件不 import；是模块导出 → 生成对应 import。

### 5. app 清单与 request 注入点（新增，api 侧特有）

**信号**：各 app 现有 api/请求层文件的 request import。

```text
扫 apps/*/src（monorepo）或 src/（单仓）：
  apps/web/src/api/**           存在 → web 是目标 app
    读其现有文件 import request from '@/plugins/axios' → 注入点记录
  apps/mini-program/src/api/**  存在 → mini-program 是目标 app
    读其现有文件 import request from '@/service'     → 注入点记录

app 无既有 api 文件 → 注入点不可探测 → 问用户"该 app 的 request 从哪 import"
  （顺带问是否要为该 app 建 api 目录）
```

- 注入点**每 app 独立记录**，互不推断（web 的 `@/plugins/axios` 不适用于小程序）
- app 未装请求层基础设施 → 该 app 跳过薄壳生成，报告说明

### 6. 批量 id 工具（新增，api 侧特有）

**信号**：utils 里生成 `id=1&id=2` 重复 key 格式的工具。

```text
grep 'id=.*&.*id=' 或函数名模式 groupBatchIds / buildBatchQuery / joinIds
  → 找到 → 记录函数名与位置，DELETE 批量方法 import 使用
  → 没找到 → 问用户"批量删除的 id 拼接用哪个工具"
     用户说没有 → 给出标准实现建议（约 5 行），用户确认落位后记入约定
```

标准实现（询问时附给用户）：

```ts
/**
 * groupBatchIds(['1', '2']) => 'id=1&id=2'
 * groupBatchIds(['1', '2'], 'key') => 'key=1&key=2'
 */
export const groupBatchIds = (ids: string[], key = 'id') =>
  ids.map((id) => `${key}=${id}`).join('&')
```

### 7. share 包名

**信号**：app 薄壳里工厂的 import 来源（如 `from '@gx-web/share'`）。app 无既有薄壳可读 → 从 `package.json` dependencies 里找含 model/api 的 workspace 包 → 还定不下来问用户。薄壳的工厂 import 用它。

## 记忆文件的 api 侧段落（模板）

以下段落在首次运行时补进 `docs/api-spec.md`（已有的 `api 形态` 段是 spec-to-model 侧预写的，保留不动）：

```markdown
## app 层注入
- app 清单与 request 注入点：apps/web → @/plugins/axios；apps/mini-program → @/service
- app api 目录：apps/<app>/src/api（镜像 share 的服务域子目录）
- share 包名：@gx-web/share

## 批量 id 工具
- groupBatchIds：packages/share/src/utils（'id=1&id=2' 重复 key 格式，DELETE 批量用）
```

更新策略与 model 侧一致：**首次全量、增量补缺、永不覆盖**（用户手改过的条目尊重原样）。

## 探测时机

- 记忆文件不存在（用户跳过 model 直接生 api）→ 本 skill 跑全量探测（model 侧条目一并探，便于下次 spec-to-model 复用）
- 记忆文件存在但缺 api 侧段（先跑过 spec-to-model 的常态）→ **只探缺的 api 侧条目**，补进文件
- 条目都在 → 直接用，零探测
