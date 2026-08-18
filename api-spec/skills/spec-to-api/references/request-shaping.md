# Request Shaping · 请求形态规则

`SKILL.md`「请求形态」的关键补充。解决"每个 operation 的方法体怎么写——参数进 params 还是 data、分页怎么拆、批量删除怎么拼、响应类型怎么判"。

## 总规则：spec 结构直接映射 axios config

OpenAPI 的参数位置与 axios 的配置项天然对应：

| OpenAPI | axios | 说明 |
|---|---|---|
| `parameters[].in === 'query'` | `params: { ... }` | **一律 params 对象** |
| `requestBody.content['application/json']` | `data: { ... }` | |
| `parameters[].in === 'path'`（`{id}`） | 拼进 `url` | RESTful 路径参数 |
| HTTP method | `method` | 小写字符串原样（`'get'`/`'post'`/`'put'`/`'delete'`） |

**淘汰存量坏风格**：`` url: `${URL}/getEnterpriseInfo?id=${id}` `` 模板字符串拼 query——新生成一律 `params: { id }`。存量已有不重写（三层保旧）。

## 7 种方法形态（含模板）

### 形态 1：GET 无参

```ts
/** 查询当前登录用户的企业及企业所属楼栋信息 */
currentUser: () =>
  request<Res<EnterpriseAndBuildingModel>>({
    method: 'get',
    url: `${URL}/currentUser`
  }),
```

### 形态 2：GET 单参数（query）

```ts
/** 查询企业认证审核结果 */
getEnterpriseReview: (id: EnterpriseApplyFormModel['id']) =>
  request<Res<EnterpriseApplyReviewInfoModel>>({
    method: 'get',
    url: `${URL}/getEnterpriseReview`,
    params: {
      id
    }
    }),
```

参数名 = spec `parameters[].name`；类型按 schema 还原（int64 → string，走 model 索引访问 `XxxFormModel['id']`，见 `type-binding.md`）。

**透传特例**：参数类型本身是 `string` 且语义是"已序列化的 query 串"（如二维码解析出的多参数平铺透传，spec 表现为无结构 string 参数）→ 保留模板拼接 `` url: `${URL}/getEnterpriseCardQrCode?${q}` ``——它不是结构化参数，转 `params: { q }` 反而改错语义。判定依据看 summary/描述里有"透传""平铺"字样；拿不准就问。

### 形态 3：GET 路径参数（`/{id}`）

```ts
byId: (id: EnterpriseApplyFormModel['id']) =>
  request<Res<EnterpriseAndBuildingModel>>({
    method: 'get',
    url: `${URL}/${id}`
  }),
```

spec `parameters[].in === 'path'` → 模板插值进 url，**不进 params**。

### 形态 4：GET 查询对象 / GET 分页

spec 特征：query 参数里有业务查询对象 schema（+ 可能的 sqlPageParams）。

```ts
/** 简单分页查询企业管理-企业信息列表 */
simplePage: (params: PageQuery<EnterpriseSimplePageSearchModel>) =>
  request<ResPage<EnterpriseAndBuildingModel>>({
    method: 'get',
    url: `${URL}/simplePage`,
    params: {
      ...params
    }
  }),
```

- 入参签名 `PageQuery<XxxSearchModel>`（分页场景）或 `XxxSearchModel`（非分页的 `list`）——`PageQuery<T>` 是 `{ pageNum, pageSize, ...T }` 平铺形态，发起时 `params: { ...params }` 一把展开
- sqlPageParams 的字段（pageNum/pageSize/pageOrder 等）**不进方法签名结构**——由 `PageQuery` 泛型承载，业务查询字段由 SearchModel 承载（与 spec-to-model 的 SearchModel 生成规则呼应：它也不含分页字段）
- **不生成 `pageOrder: 'update_time desc'` 等默认值**（见下文「不编造原则」）

### 形态 5：POST/PUT body 驱动

```ts
/** 申请企业认证 */
saveEnterpriseApply: (data: EnterpriseApplyFormModel) =>
  request<Res<boolean>>({
    method: 'post',
    url: `${URL}/saveEnterpriseApply`,
    data
  }),
```

### 形态 6：POST 分页拆解（query 分页参数 + body 业务条件）

spec 特征：`in: query` 的 sqlPageParams **加上** `requestBody` 业务对象——两个位置都有料。拆解：

```ts
/** 园区审核企业认证-分页 */
getEnterpriseApplyPage: (params: PageQuery<EnterpriseSearchModel>) => {
  const { pageNum, pageSize, ...data } = params

  return request<ResPage<EnterpriseApplyReviewInfoModel>>({
    method: 'post',
    url: `${URL}/getEnterpriseApplyPage`,
    data,
    params: {
      pageNum,
      pageSize
    }
  })
},
```

- 解构把 `PageQuery` 拆回两半：分页字段进 `params`（对应 spec 的 `in: query`），业务字段进 `data`（对应 spec 的 requestBody）
- 注意这是**唯一需要方法体解构**的形态（其他形态都是箭头直接返回表达式）
- `countTotal: true` / `pageOrder: '...'` 等取值不生成（不编造原则），存量已有则保旧

### 形态 7：DELETE 批量 id

后端 Spring `List<Long> ids` 绑定需要 `id=1&id=2` **重复 key** 格式；axios 对数组的默认序列化是 `id[]=1&id[]=2`，不匹配 → 用项目批量工具拼 query 串：

```ts
delete: (ids: EnterpriseEditorFormModel['id'][]) =>
  request<Res<boolean>>({
    method: 'delete',
    url: `${URL}?${groupBatchIds(ids as string[], 'id')}`
  }),
```

- `groupBatchIds`（或等价工具）是**项目约定探测点**（见 `project-conventions.md` 探测点 6）：有 → import 使用；没有 → 询问用户，附标准实现建议落位，不擅自创建
- `ids as string[]` 的断言保留（int64 id 是 string 类型，FormModel['id'] 索引出的可能是 string 字面量联合）

## 响应类型判定（方法的泛型参数）

读 `responses[200].content["*/*"].schema`（已是剥好壳的 `R<T>` 内联形态），看 `data`：

| data 形态 | 泛型 | 真机示例 |
|---|---|---|
| 对象含 `records`（IPage） | `ResPage<TableModel>` | simplePage → `ResPage<EnterpriseAndBuildingModel>` |
| 对象 | `Res<Model>` | getEnterpriseInfo → `Res<EnterpriseModel>` |
| 数组 | `Res<Model[]>` | list → `Res<EnterpriseAndBuildingModel[]>` |
| `boolean` | `Res<boolean>` | saveEnterpriseApply |
| `string` / 无结构 | `Res<string>` | 导出类接口 |

`data` 内部的具体 class 引用走 `type-binding.md` 的回链。分页元字段（total/size/current 等）已被切片折叠标注（`$simplified`），不需要也不应该出现在泛型里——`ResPage` 已含。

## 不编造原则（详述）

**生成的每个字面量都必须能指到 spec 的某个字段定义或结构事实。**三类高危编造：

1. **分页辅助默认值**：`pageOrder: 'update_time desc'`（排序字段是业务决策）、`countTotal: true`（计不计总数是性能决策）、`sort: [...]`——spec 只定义了字段存在与类型，没有业务取值。**不生成，报告里提醒人工补。**
2. **查询条件默认值**：如给 `status: 1` 之类的筛选初值——同理不生成。
3. **魔法 URL 改写**：不改写 spec 的 path（除网关 contextPath 已在切片完成）。发现存量方法 URL 与切片不一致 → 报告偏差，不动。

原则的另一半是**保旧**：存量方法体里的手写默认值（pageOrder 等）是用户领地，增量合并整方法保留，报告不反复唠叨。

## http 类型是项目约定

`Res` / `ResPage` / `PageQuery` 的名字与位置（全局 .d.ts 还是显式 import）是约定项，从 `docs/api-spec.md` 读。项目若用 `ApiResponse`/`PageResult` 等别名，按约定名生成（见 `project-conventions.md` 探测点 5）。
