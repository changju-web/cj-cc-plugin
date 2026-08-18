# 样本 · by-investment 项目约定探测

展示 skill 在 by-investment-platform 项目**首次运行**时，探测现有结构 + 询问用户后产出的 `docs/api-spec.md`。后续运行直接读此文件，不再探测。

## 探测过程（skill 实际会做的扫描）

### 探测点 1：model/api 目录位置

```text
扫 **/*.ts，找 import { ClassName, FieldName } from '@gx-web/core'
  → 命中文件聚类在 packages/share/src/model/**
  → model 目录根 = packages/share/src/model

扫 export const create.*Api =
  → 命中文件聚类在 packages/share/src/api/**
  → api 目录根 = packages/share/src/api
```

**探测结果**：model=`packages/share/src/model`，api=`packages/share/src/api`。✅ 可靠。

### 探测点 2：服务域子目录

```text
列 packages/share/src/model/* 的目录名
  → investment/, system/
  → 子目录机制存在，按业务域分
```

**探测结果**：服务域子目录机制存在（investment/system）。✅ 可靠。

### 探测点 3：命名规则（歧义点，需问）

```text
读现有 model 的 class 名 + 业务路径对照：
  EnterpriseModel      处理 /enterprise/info/*   → 去冗余（去掉 info）
  ParkActivityModel    处理 /park/activity/*      → 原样拼接
  ParkBuildingModel    处理 /park/building/*      → 原样拼接
  EnterpriseProductModel 处理 /enterprise/product/* → 原样拼接

→ 4 个样本里 3 个原样拼接，1 个去冗余（EnterpriseModel 是历史命名）
→ 多数派：原样拼接
```

**探测结果**：多数派是原样拼接。但 EnterpriseModel 的去冗余是显著反例，skill 会用 AskUserQuestion 确认：

> 检测到现有 model 多数用"path 业务段原样拼接"命名（如 ParkActivityModel），但 EnterpriseModel 是去冗余命名（/enterprise/info → Enterprise，去掉 info）。新 model 按哪种？
> - **原样拼接（推荐）**：EnterpriseInfo、ParkActivity、ParkBuilding…（多数派）
> - **去冗余中段**：Enterprise、ParkActivity、ParkBuilding…（对齐 EnterpriseModel 旧名）

用户选"原样拼接" → 记录。

### 探测点 4：class 角色

```text
grep现有 class 后缀：
  *Model（基础实体，全部文件都有）
  *SearchModel（查询，多个文件）
  *TableModel（列表项，多个文件）
  *FormModel（表单，多个文件）
  *DetailModel（详情，部分文件）
→ 归纳角色词汇集
```

**探测结果**：角色词汇 = Model / SearchModel / TableModel / FormModel / DetailModel。✅ 可靠。

### 探测点 5：http 类型

```text
grep '^type Res\b\|^interface Res\b' types/*.d.ts
  → packages/share/src/types/api/base-api.d.ts: interface Res<T>
  → packages/share/src/types/global.d.ts: type PageQuery<T>
  → ResPage 在 base-api.d.ts
```

**探测结果**：Res / ResPage / PageQuery，定义在 share types。✅ 可靠。

### 探测点 6：api 形态

```text
扫 api 目录 *.ts：
  export const create.*Api = (request) => ({...})  → 工厂形态（全部文件）
→ 形态统一
```

**探测结果**：工厂函数形态。✅ 可靠。

### 探测点 7：服务前缀映射

```text
读现有 api 的 const URL + 对应 api-spec 服务：
  enterprise-info.ts: const URL = '/investment/enterprise/info'  ← 服务「招商管理」
  park-info.ts:       const URL = '/investment/park/info'         ← 服务「招商管理」
  dept.ts:            const URL = '/system/dept'                  ← 服务「系统管理」
→ 招商管理 → /investment，系统管理 → /system
```

**探测结果**：服务前缀映射 2 项。✅ 可靠。

### 探测点 8：工具类型 ValueOf

```text
grep 'type ValueOf\|ValueOf<' 全项目
  → 无公共定义
→ 约定"内嵌每个 model 文件顶部"
```

**探测结果**：ValueOf 内嵌。✅ 可靠（没找到公共定义就是内嵌）。

## 产出的 docs/api-spec.md

```markdown
# api-spec 生成约定（spec-to-model / spec-to-api 自动维护）

> 本文件记录"从 api-spec 切片生成 model/api"所需的项目约定，由 skill 自动探测生成，可手工编辑。
> 下次运行时以本文件为准。删除本文件可触发重新探测。
> 注：与根目录 `api-spec/`（OpenAPI 切片输入源）不同——那是后端切片，这是前端生成约定。

## 装饰器来源
- core 包：@gx-web/core（装饰器：ClassName, FieldName, Dict, Default）

## 目录结构
- model 目录：packages/share/src/model
- api 目录：packages/share/src/api
- 服务域子目录：按业务域分（investment/, system/）

## 命名规则
- 实体名来源：path 业务段原样拼接
- class 角色：Model / TableModel / SearchModel / FormModel / DetailModel
- 嵌套 class 后缀：无（不加 Model）

## http 类型
- 普通响应：Res
- 分页响应：ResPage
- 分页查询入参：PageQuery
- 类型定义位置：packages/share/src/types/api/base-api.d.ts, packages/share/src/types/global.d.ts

## api 形态
- 工厂函数：createXxxApi(request) => ({ ...methods })
- app 层实例化：const XxxApi = createXxxApi(request); export default XxxApi

## 服务前缀映射
- 招商管理 → /investment
- 系统管理 → /system

## 工具类型
- ValueOf：内嵌在每个 model 文件顶部（type ValueOf<T> = T[keyof T]）
```

## 后续运行

skill 第二次运行（比如生成 enterprise-product 的 model）：

```text
Step 0：读 docs/api-spec.md
  → 存在且完整 → 直接用
  → model 目录 packages/share/src/model
  → 实体名原样拼接 → enterprise-product 处理 /enterprise/product/* → EnterpriseProduct
  → 跳过所有探测/询问

Step 1+：按约定生成
```

无需再问任何问题。只有当遇到新服务（前缀映射里没有的）时，才问一次"这个服务的 URL 前缀"，答完补进记忆文件。

## 跨项目验证（假设换个项目）

假设有个新项目 `gx-portal`，目录结构不同（model 在 `src/models`，api 用静态类，http 类型叫 `ApiResponse`）：

```text
Step 0：读 docs/api-spec.md → 不存在
Step 1：探测
  → model 在 src/models，api 用 class XxxApi { static method }
  → http 类型 ApiResponse / ApiPageResponse
  → 实体名探测样本不足 → 问用户
Step 2：询问 + 记录
Step 3：写 docs/api-spec.md（ gx-portal 项目的约定）
Step 4：按 gx-portal 约定生成（静态类形态、ApiResponse 类型、src/models 目录）
```

同一套 skill，不同项目产出不同形态——这就是"通用 skill"的目标。
