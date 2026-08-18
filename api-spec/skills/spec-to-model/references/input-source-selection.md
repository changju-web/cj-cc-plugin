# Input Source Selection · 取数起点选择

`SKILL.md` 的关键补充。本文件解决"OpenAPI operation 的 model 字段从哪里取"——实际接口形态远不止"GET 响应里取 data"。

## 为什么需要这份补充

`SKILL.md` 默认假设"从 `responses[200].content["*/*"].schema` 里剥 R 壳取 `data`"。但真实后端接口有 4 种典型形态，**取数起点不同**，不识别会生错 model：

| 接口类型 | HTTP 方法 | 业务 model 在哪 | 典型场景 |
|---|---|---|---|
| 详情查询 | GET | response.data | 详情页、编辑页回填 |
| 列表分页 | GET/POST | response.data.records[i] | 列表页 |
| 新增/修改/审核 | POST/PUT/PATCH | **requestBody** | 表单提交、审核操作 |
| 操作型 | POST/PUT | response.data 通常是 `string`/`boolean`，无业务结构 | 删除、状态切换 |

## 4 种形态识别规则

### 形态 A：详情查询（默认）

GET + 响应 `data` 是对象 → 取 `data.properties` 生成 `<Xxx>Model`。

```json
"responses": {
  "200": {
    "content": {
      "*/*": {
        "schema": {
          "properties": {
            "code": ...,
            "data": { "properties": { ...业务字段... } },
            ...
          }
        }
      }
    }
  }
}
```

→ 取 `data.properties`，class 名来自 `tags` 或 schema 名。

### 形态 B：列表分页

GET/POST + 响应 `data` 含 `records`/`total`/`size`/`current`（MyBatis-Plus IPage 标志）→ **可能生成两个 model**：

1. **Search Model**（来自 `parameters` 里的业务查询条件 schema，如果有结构化查询对象）
2. **Table Model**（来自 `data.records[i]`）

```text
data.records.items.properties   → <Xxx>TableModel（业务字段）
data.total/size/current         → 剥掉（分页元信息，不生进 model）
parameters.<业务查询>.schema     → <Xxx>SearchModel（查询条件）
parameters.sqlPageParams.schema → 跳过（分页参数，由 share api 的 PageQuery<T> 承载，不生 model）
```

**Search Model 也走 skill 规则**（`@ClassName` + `@FieldName` + 类型还原 + 枚举抽取），但要注意：

- Query 字段常成对出现（`createTimeStart`/`createTimeEnd`、`entryDateStart`/`entryDateEnd`），`@FieldName` 各自命名（`创建时间-开始` / `创建时间-结束`），不要合并
- Query 的 `id`/`xxxId` 多为 int64 → `string`（同主响应规则）
- Query 的 boolean（如 `unassociated`）→ `boolean`

### 形态 C：新增/修改/审核（POST/PUT body 驱动）

POST/PUT/PATCH + 有 `requestBody.content.application/json.schema` → **从 requestBody 取 model**，不从响应取。

判定：

```text
if (method in ['post', 'put', 'patch'] && requestBody?.content?.['application/json']?.schema?.properties) {
  source = 'requestBody'  // 业务 model 在请求体
  // 响应 data 通常是 string/boolean/id，不生 model
}
```

```json
"requestBody": {
  "content": {
    "application/json": {
      "schema": {
        "properties": { ...业务字段... },
        "required": ["enterpriseId", "reviewCode"]
      }
    }
  }
}
```

→ 取 `requestBody.content.application/json.schema.properties`，class 名从 `tags` + 操作语义推断（如 `enterpriseReview` → `EnterpriseReviewModel`）。

**`required` 字段**：保留为 TS 必填（`!:`），其余字段仍是 `!:`（项目统一风格，不区分可空）。但 `required` 信息不丢弃——生成时在 class 上方 JSDoc 注释列出 required 字段，让用户后续按需改 `?:`。

### 形态 D：操作型（无业务结构）

POST/PUT + requestBody 是基本类型（string/number）或响应 data 无结构 → **不生 model**，跳过。

```json
"requestBody": {
  "content": {
    "application/json": {
      "schema": {
        "type": "string"  // 或 { "type": "integer" }
      }
    }
  }
}
```

→ 报告："此接口为操作型，无业务 model 可生（requestBody 是 `<type>`）"。

## 自动识别决策流

```text
1. 读 operation.method 与响应结构
2. 若响应 data 含 records（分页）→ 形态 B（无论 GET/POST/PUT）：
   a. 查询条件优先从 parameters 的 query 业务对象收（平铺单字段也收）
   b. POST/PUT 无 query 业务对象但有 requestBody → 查询条件从 requestBody 收（生查询角色
      SearchModel，不是 FormModel——POST 分页的 body 是查询条件不是表单；
      真机：/enterprise/product/page、/module-wechat/visitInfo/list）
   c. requestBody 是 { page, queryParams } 嵌套 DTO（MyBatis-Plus Page 全展开）→
      查询条件看 queryParams；queryParams 空 schema（swagger 泛型缺陷）→ 不生查询角色，
      由 spec-to-api 以 AnyObject 弱类型兜底
   d. records.items → 列表项角色
3. 否则若是 POST/PUT/PATCH 且 requestBody.content[application/json].schema.properties 存在
   → 形态 C（body 驱动），取 requestBody
4. 否则取 response.data：
   a. 若 data 是对象 → 形态 A（详情）
   b. 若 data 是基本类型 → 形态 D（无 model）
5. 同时存在多种解读且顺序判定后仍歧义 → 问用户（少见）
```

## 一个接口生成多个 model 的命名

形态 B/C 可能一次生成多个 class，命名遵循 share 领域角色体系（详见 SKILL.md「产出位置与命名」）：

| 来源 | 角色 | 命名 | 示例 |
|---|---|---|---|
| 详情响应 / 主响应 | 基础实体 | `<Domain>Model` | `EnterpriseInfoModel` |
| 列表响应 records | 列表项 | `<Domain>TableModel` | `EnterpriseInfoTableModel` |
| 列表查询参数 | 查询条件 | `<Domain>SearchModel` | `EnterpriseInfoSearchModel` |
| POST/PUT body（新增/编辑/审核） | 表单 | `<Domain>FormModel` 或 `<Domain><操作>FormModel` | `EnterpriseInfoFormModel` / `EnterpriseInfoReviewFormModel` |

**实体名来源**：path 业务段原样拼接（见 SKILL.md「实体名：原样拼接」）。`<Domain>` 即实体名，如 `/enterprise/info/*` → `EnterpriseInfo`。

**继承复用**：TableModel / FormModel / DetailModel 优先 `extends <Domain>Model`，只声明增量字段。

**新增 vs 编辑 vs 审核**：share 层不区分 AddModel/UpdateModel，统一用 FormModel。若同一实体有多个不同表单（如新增 + 审核），用操作语义区分：`EnterpriseInfoFormModel`（常规表单）、`EnterpriseInfoReviewFormModel`（审核表单）。判定操作语义从 path + operationId 推断（`save`/`create`/`add` → FormModel，`edit`/`update` → FormModel，`review`/`audit` → ReviewFormModel）。

## 真实示例

### 示例 1：`enterprise-info-enterpriseReview`（形态 C）

```text
POST /enterprise/info/enterpriseReview
  requestBody.content[application/json].schema.properties:
    enterpriseId, reviewCode (枚举 0/1/2), reviewResult, dataSnapshot, ...
  responses[200].data: 无类型（description: 返回的数据）

→ 形态 C，取 requestBody
→ 生成：
  - 枚举 const ReviewCode（0=待审核 1=已通过 2=已拒绝）
  - class EnterpriseReviewModel（10 字段）
  - 不生响应 model
```

### 示例 2：`enterprise-info-simplePage`（形态 B）

```text
GET /enterprise/info/simplePage
  parameters:
    query.schema.properties: buildingId, companyScale, status(枚举), ...（17 字段）
    sqlPageParams.schema: 跳过（分页参数，由 share api 的 PageQuery<T> 承载）
  responses[200].data:
    records.items.properties: 完整企业字段（50+）
    records.items.buildingFloorMappingList.items.properties: 楼栋楼层映射（嵌套数组）
    total/size/current: 剥掉

→ 形态 B，生成（聚合到 packages/share/src/model/investment/enterprise-info.ts）：
  - class EnterpriseInfoTableModel（主列表项）
  - 嵌套 class EnterpriseInfoBuildingFloorMapping（数组项嵌套，不加 Model 后缀）
  - class EnterpriseInfoSearchModel（查询条件）
  - 枚举 ReleaseStatus / ReviewStatus（若同文件已存在则复用）
```

### 示例 3：`enterprise-info-getEnterpriseInfo`（形态 A）

```text
GET /enterprise/info/getEnterpriseInfo
  responses[200].data: 企业详情对象（50 字段）

→ 形态 A，生成：
  - class EnterpriseInfoModel（详见 assets/sample-enterprise-info.md）
```
