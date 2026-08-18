# 真机样本 · 分页参数 4 组合转换对照（by-investment + xbwisdom）

同一类「业务查询 + 分页」需求，spec 里参数位置组合不同，生成结构不同。4 个真机接口逐一对照。

## 组合 A：拆解式（query 分页 + body 业务）

**接口**：`POST /investment/enterprise/product/page`（by-investment 招商管理）

```text
spec 参数位置：
  in=query  sqlPageParams → SqlPageParams（pageNum/pageSize/pageOrder/countTotal/sort/allowedSortFields）
  requestBody → EnterpriseProductQuery（classify/enterpriseId/name/parkId/releaseStatus/status/tags/tagsList）
```

生成（分页进 params，业务进 data）：

```ts
page: (params: PageQuery<EnterpriseProductSearchModel>) => {
  const { pageNum, pageSize, ...data } = params

  return request<ResPage<EnterpriseProductTableModel>>({
    method: 'post',
    url: `${URL}/page`,
    data,
    params: {
      pageNum,
      pageSize
    }
  })
}
```

存量漂移标注：by-investment 现有手写是 `data: params`（整个 PageQuery 进 body，仅 pageOrder 进 query）——pageNum/pageSize 实际未到达 spec 定义的 query 位。增量场景保旧，报告标注；新生成按 spec 拆解。

## 组合 B：双 query 合并（两个 in:query 对象平铺成一个 params）

**接口**：`GET /investment/enterprise/promotional/material/page`（by-investment 招商管理）

```text
spec 参数位置：
  in=query  query         → EnterprisePromotionalMaterialQuery（fileName/enterpriseId/fileExt/...16 字段）
  in=query  sqlPageParams → SqlPageParams（...6 字段）
```

生成（PageQuery 本身就是平铺形态，一把展开）：

```ts
page: (params: PageQuery<EnterprisePromotionalMaterialSearchModel>) =>
  request<ResPage<EnterprisePromotionalMaterialTableModel>>({
    method: 'get',
    url: `${URL}/page`,
    params: {
      ...params
    }
  })
```

✗ **反例（绝不生成）**：`params: { query: {...}, sqlPageParams: {...} }`——保留对象名嵌套会序列化成 `query[field1]=x`，Spring 平铺绑定失败。两个 query 对象必须合并展开。

## 组合 C：嵌套 DTO 包装（body 是 `{ page, queryParams }`）

**接口**：`POST /module-wechat/visitInfo/list`（xbwisdom 微信模块，同族 24 个）

```text
spec requestBody：
  page: MyBatis-Plus Page<T> 全展开（11 字段：current/size/countId/maxLimit/optimizeCountSql/
        optimizeJoinOfCountSql/orders/pages/records/searchCount/total）
  queryParams: 空 schema（swagger 对 Page<T> 泛型作 DTO 字段的序列化缺陷，查询 DTO 未体现）
```

生成（重组嵌套 + 噪音零生成 + 空洞弱类型）：

```ts
/** 分页查询全部来访记录 */
static list = ({ pageNum, pageSize, ...queryParams }: PageQuery<AnyObject>) =>
  request<ResPage<VisitInfoTableModel>>({
    method: 'post',
    url: `${URL}/list`,
    data: {
      page: {
        current: pageNum,
        size: pageSize
      },
      queryParams
    }
  })
```

要点：

- `pageNum → page.current`、`pageSize → page.size`（字段名映射表）
- page 的 9 个框架噪音字段（countId/orders/records/...）一个不生成
- `queryParams` 空洞 → `AnyObject`：文档没体现就不拓展匹配、不从 `page.records` 泛型泄漏位猜字段，报告标注「spec 泛型序列化缺陷，建议后端修 swagger 注解后重跑」
- 视图侧消费与其他组合同构（入参都是平铺 `PageQuery<T>`）

## 组合 D：spec 零定义（分页查询参数完全缺失）

**接口**：`GET /system/{version}/user/page`（xbwisdom 系统管理，同族 16 个）

```text
spec：无 parameters、无 requestBody，只有分页响应定义
（存量手写 ...form.value 平铺传参证明后端实际支持查询——spec 外运行时事实，不编造）
```

生成（弱类型 + 缺口报告）：

```ts
/** 用户管理列表 */
static page = (params: PageQuery<AnyObject>) =>
  request<ResPage<UserTableModel>>({
    method: 'get',
    url: `${URL}/page`,
    params: {
      ...params
    }
  })
```

报告话术：「spec 未定义查询参数，入参为 `PageQuery<AnyObject>` 弱类型；建议后端补 swagger 注解后重跑，替换为 `PageQuery<UserSearchModel>`」。

## 判定速查

| 检查（按序） | 命中 → 组合 |
|---|---|
| body 顶层含 `page` 且子字段含 `current`/`size` | C 嵌套 DTO |
| 有 `in:query` 分页对象 + requestBody 业务 | A 拆解式 |
| 业务查询在 `in:query`（对象或平铺单字段） | B 双 query 合并 |
| 响应分页但参数零定义 | D 零定义兜底 |

组合 B 的 query 业务字段由 spec-to-model 聚合成 SearchModel（平铺单字段也收，见其 input-source-selection.md 决策流 2a）；组合 A/C 的 body 查询条件生查询角色不是 FormModel（决策流 2b）；组合 D 不生查询角色（AnyObject 兜底）。
