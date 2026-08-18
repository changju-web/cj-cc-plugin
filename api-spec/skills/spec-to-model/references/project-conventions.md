# Project Conventions · 项目约定探测与读取

**两个 skill（spec-to-model + spec-to-api）共用的前置机制。** 解决"目录/命名/http 类型/api 形态/服务前缀这些每项目不同的约定怎么获取"。

## 核心矛盾

OpenAPI → `@gx-web/core` class 的转换逻辑（类型还原、FieldName 清洗、枚举抽取、形态识别）是**跨项目通用的**。但"model 放哪个目录""class 怎么命名""分页类型叫 PageQuery 还是 PageParams"这些是**每项目不同的工程约定**。

写死项目约定 = 绑死单项目。本机制把项目约定做成**可适配**：启动时探测项目现有结构归纳约定，探测不到的问用户，问过记忆下来下次复用。

## 通用核心 vs 项目可适配（边界）

| 层 | 内容 | 处理方式 |
|---|---|---|
| **通用核心（固定）** | `@gx-web/core` 装饰器体系；类型语义还原；FieldName/ClassName 值的清洗；内联枚举抽取；接口形态识别；增量合并；格式约定（空行/JSDoc/修饰符逻辑） | 写死在 skill 规则里，所有 `@gx-web/core` 项目都适用 |
| **项目可适配** | model/api 目录位置；实体命名规则；class 角色命名；http 类型（Res/PageQuery）；api 形态（工厂/静态类/裸函数）；服务前缀映射；工具类型（ValueOf）归属 | 走本机制：探测 → 询问 → 记忆 |

## 工作流：探测 + 交互 + 记忆

```text
Step 0：读记忆文件 docs/api-spec.md
  ├─ 存在且完整 → 直接用，跳过探测
  ├─ 存在但缺某项 → 探测补该项，更新文件
  └─ 不存在 → 进入 Step 1 全量探测

Step 1：探测项目现有结构（扫信号源，归纳约定）
  ├─ 探测成功 → 记录到约定草稿
  └─ 探测不到/歧义 → Step 2 问用户

Step 2：交互询问（仅探测不到的点）
  └─ 用户答 → 记录到约定草稿

Step 3：写记忆文件 docs/api-spec.md
  └─ 把约定草稿落盘（首次全量 / 后续增量补缺项）

Step 4：按约定执行生成（model/api 的通用转换逻辑）
```

## 记忆文件：docs/api-spec.md

**位置**：项目根 `docs/api-spec.md`。放 `docs/` 下作为"spec 生成代码的项目约定说明"，与根目录的 `api-spec/`（OpenAPI 切片输入源）通过路径区分：`api-spec/` 是后端切片输入，`docs/api-spec.md` 是前端生成约定。

**进版本库**：团队共享，换机器/同事 clone 后无需重探。

**格式**：Markdown（人可读、可手改）。结构固定，机器生成但允许人工编辑；下次运行时以文件内容为准（人工改过会被尊重）。

### 模板

```markdown
# 项目约定（spec-to-model / spec-to-api 自动生成维护）

> 本文件由 skill 自动探测生成，可手工编辑。下次运行时以本文件为准。
> 删除本文件可触发重新探测。

## 装饰器来源
- core 包：@gx-web/core（装饰器：ClassName, FieldName, Dict, Default）

## 目录结构
- model 目录：packages/share/src/model
- api 目录：packages/share/src/api
- 服务域子目录：按业务域分（如 investment/, system/）

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

## 探测点与信号源

每个适配点的探测方法。**只读不写**——探测就是扫描归纳，不修改任何文件。

### 1. model/api 目录位置

**信号**：含 `@gx-web/core` import 的 `.ts` 文件聚类。

```text
扫 **/*.ts，找 import { ClassName, FieldName } from '@gx-web/core'
  → 这些文件所在的最高公共父目录 = model 目录根
  → 同法扫 export const create.*Api = 找 api 目录根
```

探测不到（新项目、空目录）→ 问用户"model 和 api 放哪个目录"。

### 2. 服务域子目录

**信号**：model/api 目录下的二级目录名。

```text
列 <model根>/* 的目录名
  → 如 investment/, system/ → 服务域子目录机制存在
  → 按服务名归入对应子目录
```

子目录不存在（model 根直接平铺 .ts）→ 约定"不分服务域子目录，直接平铺"。

### 3. 命名规则

**信号**：现有 class 命名 vs 推测实体名对照。

```text
读 2-3 个现有 model 文件的 class 名 + 它们处理的业务路径（从注释/文件名推断）
  → EnterpriseModel 处理 /enterprise/info/* → 去冗余中段（去掉 info）
  → ParkActivityModel 处理 /park/activity/* → 原样拼接
  → 归纳：多数去冗余 vs 多数原样拼接 → 定规则
```

信号冲突（有的去冗余有的原样拼接）→ 问用户"实体名按哪种规则"。这是最易歧义的点，宁可问。

### 4. class 角色命名

**信号**：现有 model 文件里的 class 后缀分布。

```text
grep现有 class 名的后缀
  → *Model / *TableModel / *SearchModel / *FormModel / *DetailModel
  → 归纳角色词汇集
```

后缀多样 → 记录全部角色；后缀单一（只有 Model）→ 约定"不区分角色，统一 Model"。

### 5. http 类型

**信号**：`types/*.d.ts` 里的类型定义。

```text
grep '^type Res\b\|^interface Res\b' types/*.d.ts → 普通响应类型名 + 定义位置
grep '^type ResPage\b\|^type PageQuery\b' → 分页类型名 + 定义位置
```

类型名非标准（如 `ApiResponse` 而非 `Res`）→ 记录实际名。找不到定义 → 问用户"响应/分页类型叫什么"。

### 6. api 形态

**信号**：现有 api 文件的导出形式。

```text
扫 api 目录 *.ts：
  export const create.*Api = (request) => ({...})  → 工厂形态
  export const load.* = (...) => request(...)       → 裸函数形态
  class.*Api { static method = ... }                → 静态类形态
```

多种形态并存 → 问用户"新 api 按哪种形态生成"。

### 7. 服务前缀映射

**信号**：现有 api 文件的 `const URL` + 对应的 api-spec 服务名。

```text
读现有 api 文件的 const URL = '/xxx/...'
  → 提取前缀（如 /investment）
  → 对照该文件处理的 api-spec 服务（从路径/注释推断）
  → 建立 服务名 ↔ 前缀 映射
```

新服务（已有映射里没有）→ 问用户"这个服务的 URL 前缀是什么"。

### 8. 装饰器来源与工具类型

**信号**：现有 model 的 import 行。

```text
grep 'from .*core' 现有 model → 装饰器包名（@gx-web/core）
grep 'type ValueOf\|ValueOf<' 全项目 → 工具类型是否已公共定义
  → 找到 → 记录位置，model 内嵌改 import
  → 没找到 → 约定"内嵌每个 model 文件顶部"
```

## 探测的可靠性原则

1. **样本要够**：每个适配点至少读 2-3 个现有文件再归纳，单个样本不立规则（可能特例）
2. **多数派胜出**：现有代码不一致时（如命名有的去冗余有的原样），按多数派定规则，少数派视为历史欠债
3. **歧义必问**：探测结果矛盾或样本不足时，用 AskUserQuestion 问，不强行猜
4. **只读不写**：探测阶段绝不修改任何项目文件，只到 Step 3 才写记忆文件
5. **尊重人工编辑**：记忆文件存在时以它为准，即使与重新探测结果不同（用户可能有意调整）

## 记忆文件的更新策略

- **首次**（文件不存在）：全量探测 + 询问 → 生成完整文件
- **增量补缺**（文件存在但某项空/新服务）：只探测/询问缺失项，追加到文件，不动已有项
- **永不覆盖**：已存在的约定项不因重新探测而覆盖（除非用户删除文件触发全量重建）

## 与两个 skill 的关系

- **spec-to-model**（上游）：首次探测通常在这里发生（先生成 model）。探测完写记忆文件，后续 spec-to-api 直接读
- **spec-to-api**（下游）：启动先读记忆文件。若文件不存在（用户跳过 model 直接生 api），spec-to-api 自己跑探测流程
- 两个 skill 共享同一份 `docs/api-spec.md`，约定只探测一次
