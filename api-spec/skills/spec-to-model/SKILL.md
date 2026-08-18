---
name: spec-to-model
description: 从 api-spec 切片或粘贴的 OpenAPI 单接口 JSON 生成 @gx-web/core class model，产出到项目约定的 model 目录（自动探测，首次运行生成 docs/api-spec.md 记忆），作为（规划中的）spec-to-api 的上游。当用户提供 api-spec/output 下的切片文件路径、粘贴一段 OpenAPI schema/operation JSON、要求"根据接口生成 model/class/类型"、"生成数据模型"、"按接口生成 class"、"spec 转 model"、"从 swagger 生成类型"时触发。专注质量：语义还原类型、@FieldName 全文清洗修撞名、@ClassName 总生、内联枚举抽具名 const + type、三层增量合并保旧手改。跨项目通用（@gx-web/core 为核心，目录/命名等约定可适配）。明确不生 @Default（与直接赋值冗余）、不生 @Dict（运行时字典尚在设计中）、不写 api（走规划中的 spec-to-api）、不写 vue 页面。
---

# api-spec 切片 / OpenAPI → @gx-web/core class model

把一份 OpenAPI schema（优先来自本项目 `api-spec/output/` 的预处理切片）转换成符合 `@gx-web/core` 装饰器约定的 class model，**产出到项目约定的 model 目录**（由 `docs/api-spec.md` 决定，如 `packages/share/src/model`）。这些 model 是 `spec-to-api` skill（规划中，尚未提供）的上游——api 直接 import 消费它们。本 skill 不生 api、不碰页面。

## 何时触发

- 用户给一个 `api-spec/output/.../*.json` 切片文件路径，要生成对应 model
- 用户直接粘贴一段 OpenAPI schema / operation / Knife4j 响应 JSON，要求转成 class
- 用户说"根据接口生成 model / class / 类型 / 数据模型"
- 用户对已有 model 的字段质量不满（类型退化、FieldName 撞名、缺失枚举），想重生成

## 何时**不**触发

- 要生成 api 工厂（`createXxxApi`）→ 走 `spec-to-api`（规划中，暂由人工或后续 skill 承接）
- 要生成完整页面（列表/详情/表单）→ 走 `wd-comp`（小程序）或 `ep-comp`（web）
- 要给 model 套字典 `@Dict(code)` → 运行时字典体系设计中，本 skill 不越界
- 要给 model 加默认值 `@Default(...)` → 与 `xxx = []` 直接赋值语义冗余，本 skill 不生

## 输入识别（自动）

skill 不要求用户提前声明"这是切片文件还是粘贴 JSON"，自动判断：

```
if (输入是 .json 文件路径 且 存在于 api-spec/output/) → 切片模式
else if (输入是 .json 文件路径 且 fs.existsSync)        → 切片模式（按切片结构解析）
else                                                    → 粘贴模式（当 OpenAPI 片段解析）
```

- **切片模式**：文件结构是 `{ path, operations: { get/post/...: { parameters, responses } } }`。从 `responses[200].content["*/*"].schema` 拿响应结构。
- **粘贴模式**：期望 OpenAPI schema 片段或完整 operation，自行定位 `data`/`schema`/`properties` 起点。

## 前置：读项目约定（每次运行最先做）

本 skill 的转换逻辑（类型还原/FieldName 清洗/枚举抽取/形态识别）跨项目通用，但**产出位置、命名规则、http 类型**等是每项目不同的工程约定。这些约定不能写死，**每次运行先读 `docs/api-spec.md`**。

**流程**（详见 `references/project-conventions.md`）：

1. 读 `docs/api-spec.md`
   - 存在 → 直接用其中的约定（目录/命名/http 类型/api 形态/服务前缀），跳到「输入识别」
   - 不存在 → 进入探测流程
2. 探测项目现有结构（扫现有 model/api 文件、types/*.d.ts），归纳约定；探测不到的点用 AskUserQuestion 问
3. 把探测/询问结果写入 `docs/api-spec.md`（首次全量 / 后续增量补缺）
4. 按约定执行后续生成

**记忆文件一旦生成，后续运行直接读，不再重复探测/询问**。用户可手工编辑该文件调整约定，skill 尊重人工编辑。

## 产出位置与命名（按项目约定）

以下规则**来自项目约定**（`docs/api-spec.md`），不是写死的。下方给出的是"约定项的含义"，具体值由探测/询问/记忆文件决定。

### 产出目录

- model 目录：约定项 `model 目录`（探测现有 `@gx-web/core` model 聚类得出，如 `packages/share/src/model` 或 `src/model`）
- 服务域子目录：约定项 `服务域子目录`（如按业务域分 `investment/`，或平铺无子目录）
- 新增文件需确保对应 `index.ts` 有 `export *`

### 实体名

- 来源：约定项 `实体名来源`（探测现有 class 命名规律得出，常见有「path 业务段原样拼接」「去冗余中段」两种）
- 取业务段通用规则：去掉 path 首段服务前缀，剩余业务段按约定的拼接策略生成实体名

### class 角色命名

- 约定项 `class 角色`（探测现有 class 后缀得出）。常见角色词汇：`Model`（基础实体）/ `TableModel`（列表项）/ `SearchModel`（查询）/ `FormModel`（表单）/ `DetailModel`（详情）
- 角色与接口形态的对应关系是**通用的**（详情响应→基础实体、分页 records→列表项、POST body→表单），但具体后缀词按项目约定
- 继承复用：衍生角色（表单/详情/列表项）优先 `extends` 基础实体，只声明增量字段——这是通用建议，具体继承策略看项目现有 model 风格

### 嵌套 class 后缀

- 约定项（探测现有嵌套 class 得出，如「不加 Model 后缀」或「加 Model 后缀」）

## 输入源识别（先于剥壳）

实际后端接口有 **4 种典型形态**，业务 model 的位置不同，不先识别会生错：

| 形态 | 触发条件 | model 取自 | 生成的 class |
|---|---|---|---|
| **A 详情查询** | GET，响应 `data` 是对象 | `responses[200]...data.properties` | `<Domain>Model`（或 `DetailModel` 若与已有 Model 字段不同） |
| **B 列表分页** | GET/POST，响应 `data` 含 `records`/`total`/`size`/`current` | `data.records.items.properties` + `parameters.query.schema` | `<Domain>TableModel`（列表项）+ `<Domain>SearchModel`（查询条件） |
| **C POST body 驱动** | POST/PUT/PATCH，有 `requestBody.content[application/json].schema.properties` | **requestBody**（响应 data 通常是 string/id，不生 model） | `<Domain>FormModel`（新增/编辑表单） |
| **D 操作型** | POST/PUT，requestBody 是基本类型 / 响应 data 无结构 | **跳过，不生 model** | 无 |

判定顺序（先满足先生效）：**形态 C → 形态 B → 形态 A → 形态 D**。

判定歧义（同时满足多个、或结构不清晰）时，问用户，不臆测。

详细决策流与示例：见 `references/input-source-selection.md`。

## 响应壳剥离（剥到 data 后）

`R<T>` / `RObject` 壳（`code` / `data` / `message` / `ok` / `meta`）的剥离，**发生在已识别为响应驱动（形态 A/B）之后**：

- 同时存在 `code` + `data` + `message` → 取 `data`
- `data` 是对象 → 展开生成单个 Model（形态 A）
- `data` 含 `records` → 走分页处理（形态 B），见 `references/nested-and-pagination.md`
- **`meta` 是壳字段嵌套**（看似有 `properties.empty`，实为框架内部 isEmpty 标记）→ 整字段跳过，不生 `MetaModel`

剥不干净（壳字段混在业务字段里）时，问用户，不臆测。

## 6 条核心原则（违反必踩坑）

### 1. 类型语义还原，不粗暴归一化

| OpenAPI | TS 类型 | 理由 |
|---|---|---|
| `integer` + `format: int64` | `string` | JS Number 安全整数 2^53 < 2^63，后端 Long 序列化为 string 防丢精度 |
| `integer` + `format: int32` | `number` | 32 位整数 JS 安全 |
| `integer` 无 format | `number` | 默认按 int32 |
| `number` + `format: double/float` | `number` | 浮点 JS Number |
| `number` 无 format | `number` | 默认 |
| `boolean` | `boolean` | **绝不变 string**（registration 的 bug） |
| `string` + `format: date/date-time` | `string` | JSON 标准就是 string |
| `string` 其他 | `string` | |
| `object` + 有 properties | 同文件内联 class（`XxxYyyModel`） | 见原则 6 |
| `object` + 仅 `additionalProperties: {}` | `Record<string, any>` | 不臆造子结构 |
| `array` + `items` | `T[]`（T 按上面规则） | |
| `$ref` | 已被切片预处理内联，按 properties 递归 | |

详细映射表与边界：见 `references/type-mapping.md`。

### 2. `@FieldName` 全文清洗，修撞名

`registration` 取"description 中 `-` 或 `(` 前的部分"，机械截断导致 `contact/contactEmail/contactNumber/contactWechatNo` **全部撞名为 `@FieldName('企业默认')`**——撞名后表头/详情 label 全显示相同字面，等同于装饰器失效。

规则：

- 取 description **全文**，去掉尾部括号注释（如 `(sys_industry表code字段)` → 所属行业），其余保留
- 出现 `-` 分隔的"业务前缀 - 业务主体"（如 `企业默认-联系人电话`），取**业务主体**（`联系人电话`），保证四字段不撞名
- 无 description → 退化到字段名驼峰转可读名（如 `contactEmail` → `contactEmail`，留待用户补中文，不臆译）
- 同一 class 内 `@FieldName` 出现重复 → 后缀消歧

详细规则与案例：见 `references/field-name-rules.md`。

### 3. 装饰器：只生 `@ClassName` + `@FieldName`

| 装饰器 | 生不生 | 理由 |
|---|---|---|
| `@ClassName('中文名')` | **总生** | 来自 spec `tags`（取首项去后缀）或 schema 文件名 |
| `@FieldName('中文名')` | **总生** | 见原则 2 |
| `@Default(() => [])` | **不生** | 与 `tags: string[] = []` 直接赋值语义冗余；`getModelFromJson` 源码两条路径结果完全一致；直接赋值更直观、TS 友好、IDE 补全正常 |
| `@Dict(code)` | **不生** | 运行时字典体系设计中，本 skill 不越界 |

### 4. 内联枚举抽具名 const + type

spec description 里出现 `(0、待处理 1、上架 2、下架)` 这类**内联枚举**，抽具名 const + type（默认形态如下；若项目已有枚举字典文件如 `src/dict/value.ts`，参考其形态并对齐命名）：

```ts
/** 发布状态 */
export const ReleaseStatus = {
  /** 待处理 */
  pending: 0,
  /** 上架 */
  listing: 1,
  /** 下架 */
  offline: 2
} as const

export type ReleaseStatus = ValueOf<typeof ReleaseStatus>
```

字段引用：

```ts
@FieldName('发布状态')
releaseStatus!: ReleaseStatus
```

`ValueOf<T> = T[keyof T]` 工具类型在每个 model 文件顶部内嵌一份（5 行，不抽公共）。

**边界**：

- 这是**内联枚举**（spec 明写值），不是后端字典表引用（`sys_xxx表code`）—— 后者等用户 `@Dict` 体系设计完再说
- 解析不出来（括号里没数值对应关系，纯描述）→ 不抽，字段类型按原则 1 退化为 number/string
- 值是字符串枚举（`'Y'/'N'`）也照抽

详细规则：见 `references/enum-extraction.md`。

### 5. 三层增量合并，冲突保旧（含继承链检测）

目标 model 文件已存在时，按 **class 名 → 字段名 → 枚举 const 名** 三层检测：

- **class 层**：class 不存在 → 末尾追加新 class；已存在 → 进入字段层
- **字段层**：字段已存在 → **整字段保留不动**；字段不存在 → 追加
- **枚举层**：顶部枚举 const 已存在（同名）→ **复用，不重复声明**

⚠️ **字段存在性检测必须覆盖整个继承链**（真机验证踩过的坑）：

判定"字段是否存在"时，不能只看目标 class 自身的字段声明，还要扫**该 class 的父类和所有兄弟子类**。因为 share model 常用继承组织字段（`TableModel extends Model`、`DetailModel extends TableModel`），同一字段可能声明在继承链的任何一层：

```text
ParkInfoModel              ← 基础实体
  ├─ ParkInfoTableModel    ← 列表项 extends Model，声明了 createTime/id/status 等
  ├─ ParkInfoDetailModel   ← 详情 extends TableModel，声明了 area/boundaryJson 等
  └─ ParkInfoFormModel     ← 表单 extends Model，声明了 id/area 等
```

若 spec 要求给 `ParkInfoModel` 加 `createTime` 字段，但 `ParkInfoTableModel`（子类）已声明 `createTime` → **视为已存在，不追加到父类**。否则父类声明后子类同名字段会触发 TS2612（覆盖基类属性）错误。

**检测范围**（满足任一即视为字段已存在）：
1. 目标 class 自身已声明该字段
2. 目标 class 的父类（沿 `extends` 链向上）已声明该字段
3. 目标 class 的任意子类（同文件内 `extends` 它的 class）已声明该字段

**子类已声明但父类没有** → 不追加到父类（字段在子类是合理的，spec 接口形态可能对应的就是子类角色）。报告里标注"`<字段>` 已在子类 `<SubClass>` 声明，未追加到 `<ParentClass>`"。

理由：用户领地不越界 + 继承链完整性。盲目追加会破坏继承结构、触发 TS 覆盖错误。

**import 区**：增量时只追加缺失的 import，不重排已有 import 顺序。

**跨文件场景**：若 skill 被指定写到不同文件（如已存在详情 model，新列表 model 想写另一文件），枚举跨文件复用需要 import——这种情况报告"建议复用 `<路径>:<枚举名>`，是否 import？"问用户，不自行决定。

### 6. 嵌套对象：同文件内联 class，递归展开

`properties` 下还有 `properties` 的 → 同文件生成内联 class，不拆文件。多层嵌套递归处理：

- 1 层（`data.foo.properties`）→ 内联 class `XxxFooModel`
- 2 层（`data.foo.bar.properties`）→ 递归生成 `XxxFooBarModel`
- 数组嵌套对象（`records[].buildingFloorMappingList[].{...}`）→ 数组项也按对象生成内联 class，字段类型为 `XxxModel[]`
- 深度 ≤ 3 层 → 全部递归生成
- 深度 ≥ 4 层 / 循环引用 → **问用户**，不硬展开

命名规则：`<父 Model 名去 Model 后缀><字段 PascalCase>Model`，若父名含 `ListItem`/`Model` 中缀可去掉避免名字过长。详见 `references/nested-and-pagination.md`。

**壳字段嵌套陷阱**：`meta.properties.empty: boolean` 看似业务字段，实为 Spring 框架内部 isEmpty 标记 → **整字段跳过**，不生 `MetaModel`。判定与处理见 `references/nested-and-pagination.md`「壳字段嵌套」段。

## 模板骨架

> 下方装饰器来源（`@gx-web/core`）是通用核心固定。`ValueOf` 工具类型的归属是约定项（内嵌 / import 公共），按项目约定处理。

```ts
import { ClassName, FieldName } from '@gx-web/core'
// ValueOf：按约定（内嵌本文件 / 从公共位置 import）

/** <业务名>枚举（spec description 内联枚举） */
export const XxxStatus = {
  /** <中文> */
  <key>: <value>,
  ...
} as const
export type XxxStatus = ValueOf<typeof XxxStatus>

@ClassName('<来自 tags 或 schema 名>')
export class XxxModel {
  /** <description 全文> */
  @FieldName('<清洗后的中文名>')
  <fieldName>!: <TS 类型>

  /** <description 全文> */
  @FieldName('<清洗后的中文名>')
  <fieldName>!: <TS 类型>

  ...
}
```

## 格式约定（3 条硬规则）

格式约定本身跨项目通用（空行/注释/修饰符让 model 可读、类型安全），但具体风格参考**项目现有 model**（探测归纳）。下方规则是默认建议，若项目现有 model 风格不同，按项目约定。

### 1. 字段间空一行

每个字段块（JSDoc + 装饰器 + 字段声明）之间**必须空一行**。参考项目现有 model 风格。最后一个字段后与 `}` 之间不空行。

```ts
export class XxxModel {
  /** 主键 */
  @FieldName('主键')
  id!: string
                                          ← 空行
  /** 企业名称 */
  @FieldName('企业名称')
  name!: string
                                          ← 空行
  /** 发布状态（0、待处理 1、上架 2、下架） */
  @FieldName('发布状态')
  releaseStatus!: ReleaseStatus
}
```

### 2. 每个字段上方加 JSDoc 注释

每个字段上方加 `/** <注释> */`，注释内容取自 **spec description 全文**（保留括号说明、枚举值等技术信息）。`@FieldName` 用清洗后的中文名（见原则 2），两者可以不同：

```ts
/** 所属行业(sys_industry表code字段) */     ← JSDoc 保留 spec 全文（含技术参数）
@FieldName('所属行业')                      ← FieldName 清洗后（剥技术括号）
industryCode!: string
```

- spec 无 description → JSDoc 用字段名驼峰，`@FieldName` 同样退化（见 `field-name-rules.md` 规则 5）
- 字段是枚举 → JSDoc 保留含枚举值的原文（如 `/** 发布状态（0、待处理 1、上架 2、下架） */`），让 IDE hover 可见完整说明

### 3. 字段修饰符：按 Model 角色定 `!:` vs `?:`

修饰符的核心逻辑是**按数据来源方向**（这是通用的），具体角色名按项目约定：

| 数据方向 | 角色（按约定） | 默认修饰符 | 依据 |
|---|---|---|---|
| 后端 → 前端（响应数据） | 基础实体 / 列表项 / 详情 | **`!:`**（全必填） | 后端返回数据，假设齐全 |
| 前端 → 后端（查询/提交） | 查询条件 | **`?:`**（全可选） | 查询条件可空 |
| 前端 → 后端（表单提交） | 表单 | **按 spec `required` 区分** | required 字段 `!:`，其余 `?:` |

> 角色名（如 Model/TableModel/SearchModel/FormModel）是约定项。判定方向通用：从响应 data 来的 → `!:`，从 parameters/requestBody 来的查询 → `?:`，从 requestBody 来的表单 → 按 required。

**表单角色的 required 判定**：spec requestBody schema 的 `required` 数组里的字段用 `!:`，不在的用 `?:`。spec 无 `required` 信息时，表单默认全 `?:`（保守处理）。

**继承场景**：子 class 只声明增量字段，增量字段的修饰符按子 class 的数据方向定，继承自父 class 的字段修饰符不动。

## 工作流

0. **读项目约定**：读 `docs/api-spec.md`；不存在则探测 + 询问 + 生成（见上文「前置：读项目约定」与 `references/project-conventions.md`）
1. **读输入**：自动识别切片文件 vs 粘贴 JSON
2. **定产出位置与实体名**：按约定的 model 目录 + 服务域子目录 + 实体名规则定产出路径和 class 名（约定项，非写死）
3. **识别接口形态**（先于剥壳）：按"形态 C → B → A → D"顺序判定业务 model 取自 requestBody 还是 response.data，并按约定的角色词汇定 class 名（角色↔形态对应是通用的，后缀词按约定）
4. **剥壳 + 分页参数处理**（仅响应驱动）：
   - 形态 A：剥 `R<T>` 壳取 `data.properties`
   - 形态 B：剥壳 + 取 `records.items`（生列表项角色）+ 遍历 `parameters` 生查询角色（**分页参数 schema 如 `sqlPageParams` 完全跳过，只收业务查询条件**）
   - 形态 C：**不剥响应壳**，直接取 requestBody
   - 形态 D：报告"无业务 model 可生"，退出
   - 分页请求/响应参数的完整剥离规则：见 `references/nested-and-pagination.md`「分页参数的完整处理」
5. **扫字段**：每个 property 按 6 条原则处理 → 类型 + `@FieldName` + 枚举抽取 + **JSDoc（spec 全文）** + **修饰符（按角色 `!:`/`?:`）**；字段间空行；嵌套 properties 递归生成内联 class；衍生角色优先 extends 基础实体
6. **写入**：按约定的 model 目录写入；目标存在则三层增量（class 级 + 字段级 + 枚举级，保旧）；不存在则新建；确保 `index.ts` 有 `export *`
7. **报告**：
   - 产出路径（按约定的 model 目录）
   - 使用的项目约定来源（记忆文件 / 本次探测+询问）
   - 识别为哪种形态、model 取自哪里、生成的 class 角色名
   - 识别为哪种形态、model 取自哪里（requestBody / data / data.records）、生成的 class 角色名
   - 各 class 多少字段（含嵌套 class、继承关系）
   - 剥了什么壳、跳过了哪些非业务字段（含 meta 壳字段嵌套、IPage 分页元信息）
   - 抽了哪些枚举（const + type 名，标注是否复用已有）
   - 增量合并时跳过了哪些已存在 class/字段/枚举（提示用户核对是否需手改）
   - 任何歧义点（形态判定不清、剥不干净的壳、嵌套超 3 层、FieldName 无 description 退化）

## Success Criteria

一次成功输出至少满足：

- **约定已读取/生成**：运行前已读 `docs/api-spec.md` 或本次完成探测+记忆；报告标注约定来源
- **形态识别正确**：POST body 驱动的接口从 requestBody 取（不从响应 data 取）；分页接口生成列表项角色 + 查询角色；操作型直接报告跳过
- 类型按原则 1 语义还原，**没有** `boolean`/`double`/`object` 退化为 `string`
- `@FieldName` 在同一 class 内**不重复**（清洗规则见原则 2）
- 每个 class 都有 `@ClassName`
- **每个字段都有 JSDoc 注释**（取 spec description 全文）+ `@FieldName`（清洗后），两者可不同
- **字段间空一行**
- **字段修饰符按数据方向**：响应类角色（基础实体/列表项/详情）全 `!:`；查询角色全 `?:`；表单角色按 spec required 区分（无 required 信息默认 `?:`）
- 内联枚举抽成具名 const + type，字段引用具名 type；跨接口复用同名枚举不重复声明
- 没有生成 `@Default` 或 `@Dict`
- 响应壳字段（`code`/`message`/`ok`/`meta`）与 IPage 分页元字段（`total`/`size`/`current`）**没有**进 class
- **分页请求参数**（`sqlPageParams`/`pageable` 等含 `pageNum`/`pageSize`/`current`/`size` 的 schema）**没有**生进 SearchModel——SearchModel 只含业务查询条件，分页参数由 api 层 `PageQuery<T>` 承载
- 嵌套对象生成内联 class，不退化成 `Record<string, any>`（除非 spec 明确只有 `additionalProperties: {}`）
- 目标存在时三层保旧：已存在 class 不重写、已存在字段不动、已存在枚举 const 复用
- **继承链完整性**：追加字段前已扫描目标 class 的父类和所有子类，确认无同名声明（避免 TS2612 覆盖错误）

## 不做的事

- 不生成 api（走 `spec-to-api`，规划中）
- 不生成 app 层 api 实例化 → app 层职责
- 不生成 `index.vue` / 任何页面
- 不跑构建（只生类型声明，类型风险低；如需验证用户另行 ts-check）
- 不动路由/构建配置

## 配套 skill

- **spec-to-api**（规划中，尚未提供）：本 skill 的直接下游。model 生成完后，跑 spec-to-api 基于同一份 spec 切片 + 刚生成的 model，产出项目约定的 api 封装。落地前 api 层由人工承接
- **wd-comp / ep-comp**（本市场插件）：页面生成 skill。它们消费项目的 model + api
- **api-spec 识别纪律**：见项目 `AGENTS.md` 的 api-spec 识别纪律段（由 spec-init skill 初始化时注入）。本 skill 默认输入就是 `api-spec/output/` 切片
