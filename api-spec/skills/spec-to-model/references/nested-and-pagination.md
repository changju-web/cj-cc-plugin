# Nested & Pagination · 嵌套对象与分页结构

`SKILL.md` 原则 6 的补充。本文件解决 `type-mapping.md` 没覆盖的**多层嵌套**与**分页壳数组嵌套**。

## 多层嵌套（超 1 层）

`type-mapping.md` 只讲"单层嵌套对象生内联 class"。实际列表接口常见**数组里套数组里套对象**：

```
data.records[].buildingFloorMappingList[].{buildingId, buildingName, floorId, floorName, ...}
```

### 规则：递归展开，命名层层追溯

```ts
// data.records.items → EnterpriseInfoTableModel
//   .buildingFloorMappingList.items → EnterpriseInfoBuildingFloorMapping
//     （命名：父实体名 + 字段 PascalCase，嵌套 class 不加 Model 后缀）

class EnterpriseInfoBuildingFloorMapping {
  @FieldName('楼栋ID')
  buildingId!: string  // int64

  @FieldName('楼栋名称')
  buildingName!: string

  @FieldName('企业ID')
  enterpriseId!: string  // int64

  @FieldName('楼层ID')
  floorId!: string  // int64

  @FieldName('楼层名称')
  floorName!: string

  @FieldName('园区ID')
  parkId!: string  // int64

  @FieldName('园区名称')
  parkName!: string
}

@ClassName('企业信息列表项')
export class EnterpriseInfoTableModel {
  // ...其他字段...

  @FieldName('企业关联的园区和楼栋楼层信息')
  buildingFloorMappingList!: EnterpriseInfoBuildingFloorMapping[]
}
```

### 命名规则（对齐 share 现状）

share 层嵌套 class **不加 `Model` 后缀**（参考现有 `EnterpriseBuildingFloor`、`EnterpriseReviewLog`），用 `<实体名><字段 PascalCase>`：

```
EnterpriseInfoTableModel + buildingFloorMappingList
→ EnterpriseInfoBuildingFloorMapping   ← 不加 Model，不加 ListItem 中缀

EnterpriseInfoModel + qrCode
→ EnterpriseInfoQrCode                 ← 嵌套子对象
```

简化原则：嵌套 class 用 `class`（非 `export class`），仅文件内引用；外层主 Model 才 `export`。但若该嵌套结构会被 api 层单独引用（如某个接口直接返回它），则 `export`。

### 嵌套深度边界

- 1 层（data → 业务字段）→ 默认形态，直接生成
- 2 层（data → 字段 → 嵌套对象）→ 内联 class
- 3 层（data → 字段 → 嵌套对象 → 嵌套对象）→ 内联 class（递归）
- 4 层+ → **问用户**（说明结构太深，可能 spec 设计有问题或需重新抽象）

## 壳字段嵌套：识别与剥离

后端响应壳里的 `meta` 字段有时是 `additionalProperties: {}` + 带 `properties.empty: boolean`：

```json
"meta": {
  "additionalProperties": {},
  "description": "额外数据",
  "properties": {
    "empty": {
      "type": "boolean"
    }
  },
  "type": "object"
}
```

`empty: boolean` 看着像业务字段，但其实是 Spring `Page`/`Map` 框架内部的 isEmpty 标记，不是业务字段。

### 判定（满足任一即视为壳字段嵌套，不生 model）

1. 字段名是 `meta` 且 description 含「额外数据」/「元数据」
2. 字段名是 `meta` 且只有 `additionalProperties: {}` + 一个 `empty: boolean`
3. 字段名是 `data` 的兄弟且属于 R 壳（`code`/`message`/`ok`/`meta`）

→ **整个字段跳过**，不生 `MetaModel`。

### 类似陷阱

- `Page<>.empty` / `Page<>.count` / `Page<>.pages` 等分页框架字段 → 已被切片预处理折叠（见 `$simplified` 标记），但万一遇到也别生进 model
- `Serializable`/`transient`/`hashCode`/`toString` 等 Java 对象序列化字段 → 跳过（极少见，但遇到过）

## 分页参数的完整处理（请求侧 + 响应侧）

分页接口的参数分两侧，**两侧的"分页框架字段"skill 都跳过，只生业务字段**。

### 请求侧：`sqlPageParams` 完全跳过

后端分页接口的 `parameters` 里常出现分页参数 schema，命名因服务而异：

| 后端服务 | 请求侧分页参数 schema | 字段 |
|---|---|---|
| 招商管理 | `sqlPageParams` | `pageNum` / `pageSize` / `countTotal` / `pageOrder` / `sort` / `allowedSortFields` |
| 其他服务 | 可能是 `page` / `pageable` / 内联 `current`+`size` | `current` / `size` / `pageNum` / `pageSize` |

**规则**：识别为分页参数 schema（字段名命中 `pageNum`/`pageSize`/`current`/`size` + 含排序控制字段）→ **整个 schema 跳过，不生 model**。只把同在 `parameters` 里的**业务查询条件 schema**（如招商管理的 `enterpriseInfoQuery` / `enterpriseAccessLogQuery`）生进 `<Domain>SearchModel`。

理由（重要）：

1. **职责边界**：分页参数由 share api 层的 `PageQuery<T>` 类型承载（`spec-to-api` 生成 api 时用），不归 model 管。
2. **字段一致**：share 层 `PageQuery<T>` = `{ pageNum, pageSize } & T`（`packages/share/src/types/global.d.ts`），与后端 spec 的 `sqlPageParams { pageNum, pageSize }` **字段名一致、页码起点一致**（均从 1 开始）。所以 spec 的分页参数 skill 跳过即可，由 `PageQuery<T>` 在 api 层统一承载，无适配冲突。
3. **hook 已托管**：`useListStream(({ current, size }) => ...)` 内部维护页码游标，app 层把 `{ current, size }` 映射成 `PageQuery` 的 `{ pageNum, pageSize }` 即可（share api 工厂的入参就是 `PageQuery<SearchModel>`）。

**判定分页参数 schema 的信号**（满足任一即跳过）：

- schema 名 / parameter 名是 `sqlPageParams` / `pageable` / `pageParams`
- schema 字段含 `pageNum` + `pageSize`（不管有没有其他字段）
- schema 字段含 `current` + `size` 且无业务字段（纯分页）
- schema description 含「分页参数」/「SQL 分页」/「Pageable」

**边界**：如果某个 parameter 看似分页但实际混了业务字段（如 `{ pageNum, pageSize, enterpriseId, status }` 分页和查询揉一起）→ 把业务字段挑出来生进 SearchModel，分页字段（`pageNum`/`pageSize`）剥掉。这种情况少见，遇到了在报告里说明。

### 响应侧：IPage 分页壳剥离

```json
"data": {
  "current": { "format": "int64", "type": "integer" },     ← 剥（分页页码）
  "size":    { "format": "int64", "type": "integer" },     ← 剥（分页大小）
  "total":   { "format": "int64", "type": "integer" },     ← 剥（总数）
  "records": {                                              ← 取
    "items": {
      "properties": { ...业务字段... }
    },
    "type": "array"
  },
  "$simplified": "MyBatis-Plus IPage 框架字段已折叠（countId/...）"
}
```

### 响应侧处理流程

1. 看到 `data.records` + `data.total` + `data.size` + `data.current` → 识别为 IPage 分页
2. **`records.items.properties`** → 生 `<Xxx>TableModel`（业务字段）
3. **`total`/`size`/`current`/`pages`** → 跳过（项目用 `useListStream` 统一管理分页，不入 model）
4. **`$simplified`** → 是切片预处理的标记，无视

### 项目分页参数契约（仅供 skill 参考，不生 api）

skill 不生 api 层，但理解项目契约有助于明白"为什么跳过分页参数"：

```ts
// apps/mini-program/types/base.d.ts（项目全局类型，skill 不生）
interface PageParams<query = AnyObject> {
  page: { current: number; size: number }
  queryParams: query
}

// @gx-web/tool（项目 lib，skill 不生）
type ResPage<T> = Res<{ records: T[]; total: number; size: number; current: number }>
```

项目实际链路（share api + app 层 + 页面，本 skill 只生 model，其余示意）：

```ts
// packages/share/src/api/<服务域>/<实体>.ts （spec-to-api 生成，本 skill 不生）
export const createXxxApi = (request) => ({
  page: (params: PageQuery<XxxSearchModel>) =>
    request<ResPage<XxxTableModel>>({ method: 'post', url: '...', params })
})

// packages/share/src/types/global.d.ts （项目全局类型）
type PageQuery<T = Record<string, any>> = { pageNum: number; pageSize: number } & T

// app 层实例化 + 页面消费（app 层职责）
const XxxApi = createXxxApi(request)
const [list, { loadList }] = useListStream<XxxTableModel>(({ current, size }) =>
  XxxApi.page({ pageNum: current, pageSize: size, ...query.value })
    .then(({ data }) => data)
)
```

**分页参数一致性**：share 层 `PageQuery<T>` 用 `{ pageNum, pageSize } & T`，与后端 spec 的 `sqlPageParams { pageNum, pageSize }` **字段名一致**（页码从 1 开始也一致）。所以 spec 里的分页参数 skill 跳过不生，由 `PageQuery<T>` 在 api 层统一承载——不存在适配冲突。

## 真实示例：simplePage 完整解析

输入 `enterprise-info-simplePage.json`，按形态 B 流程：

### Step 1：识别为分页

```
method: GET
response.data 含 records/total/size/current → 形态 B（分页）
```

### Step 2：处理响应（生成 TableModel + 嵌套 Model）

```
data.records.items.properties → EnterpriseInfoTableModel（50+ 字段）
data.records.items.buildingFloorMappingList.items → EnterpriseInfoBuildingFloorMappingModel（7 字段）
data.total/size/current → 跳过（分页响应元字段）
data.meta → 壳字段嵌套，跳过
```

### Step 3：处理查询参数（区分业务查询 vs 分页参数）

```
parameters:
  enterpriseInfoQuery.schema.properties → EnterpriseInfoQueryModel（业务查询条件，17 字段）
  sqlPageParams.schema → 完全跳过（分页参数，不入 model，理由见上「请求侧」）
```

### Step 3：处理查询参数（区分业务查询 vs 分页参数）

```
parameters:
  enterpriseInfoQuery.schema.properties → EnterpriseInfoSearchModel（业务查询条件，17 字段）
  sqlPageParams.schema → 完全跳过（分页参数，不入 model，理由见上「请求侧」）
```

### Step 4：枚举抽取

- `releaseStatus`（TableModel 内）→ 复用 `ReleaseStatus`（与 EnterpriseInfoModel 同款，不重复声明）
- `reviewStatus`（TableModel 内）→ 复用 `ReviewStatus`
- `status`（SearchModel 内，1 有效 0 无效）→ inline `0 | 1`，不抽

### 输出结构（share model，同实体多接口聚合在同一文件）

```ts
// packages/share/src/model/investment/enterprise-info.ts
import { ClassName, FieldName } from '@gx-web/core'

type ValueOf<T> = T[keyof T]

/** 发布状态（详情/列表/表单多接口共用，文件内只声明一次） */
export const ReleaseStatus = { ... } as const
export type ReleaseStatus = ValueOf<typeof ReleaseStatus>

/** 审核状态 */
export const ReviewStatus = { ... } as const
export type ReviewStatus = ValueOf<typeof ReviewStatus>

@ClassName('企业关联楼栋楼层映射')
class EnterpriseInfoBuildingFloorMapping {
  @FieldName('楼栋ID')
  buildingId!: string
  // ...7 字段
}

@ClassName('企业信息')   // ← getEnterpriseInfo 详情接口生成（已存在则保旧）
export class EnterpriseInfoModel {
  // ...50 字段（含 releaseStatus!: ReleaseStatus）
}

@ClassName('企业信息列表项')
export class EnterpriseInfoTableModel {
  // ...50+ 字段（含 releaseStatus!: ReleaseStatus，复用上方 const）
  @FieldName('企业关联的园区和楼栋楼层信息')
  buildingFloorMappingList!: EnterpriseInfoBuildingFloorMapping[]
}

@ClassName('企业信息查询条件')
export class EnterpriseInfoSearchModel {
  @FieldName('楼栋ID')
  buildingId?: string
  @FieldName('公司规模')
  companyScale?: number
  @FieldName('创建时间-开始')
  createTimeStart?: string
  @FieldName('创建时间-结束')
  createTimeEnd?: string
  // ...17 字段
}
```

## 枚举跨接口复用

share model 是**领域聚合**——同一实体的多个接口（详情/列表/表单）的 model 聚合在同一文件（如 `enterprise-info.ts`）。因此 `EnterpriseInfoModel`（详情）和 `EnterpriseInfoTableModel`（列表项）都有 `releaseStatus` 时，枚举 const **天然在同文件内复用**，只声明一次。

### 增量合并规则（补充 SKILL.md 原则 5）

- **同文件内**（同实体多接口聚合）：枚举 const 已存在 → 复用，不重复声明
- **跨文件**（不同实体，如 `enterprise-info.ts` 和 `enterprise-product.ts` 各有 releaseStatus）：视为独立枚举（业务语义可能不同），各自声明，不强行复用
- **例外**：跨文件的枚举值确实相同且业务确认共用 → 抽到 `packages/share/src/model/<服务域>/enums.ts` 或类似公共文件，但这需要人工判断，skill 不自动做
