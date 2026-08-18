# Method Naming · 方法名推导

`SKILL.md`「方法名推导」的关键补充。解决"spec 的 operationId 为什么不能用、path 尾段怎么判定有没有动作语义、RESTful 端点怎么命名"。

## 为什么 operationId 不可用（真机证据）

springdoc 生成 operationId 用「Java 方法名 + 重名消歧数字后缀」，同一批切片里：

```text
queryById_19        ← GET /{id}      详情
queryList_17        ← GET /list      列表
queryByPage_19      ← GET /page      分页
add_15              ← POST /         新增
edit_16             ← PUT /          修改
deleteById_15       ← DELETE /       删除
updateReleaseStatus_4 ← POST /updateReleaseStatus
querySimplePage     ← GET /simplePage
queryCurrentUserEnterpriseInfo ← GET /currentUser
```

三类污染：

1. **数字后缀**（`_19`、`_15`）——后端方法重载消歧产物，语义为零
2. **动词前缀不统一**——`query*`、`add*`、`edit*`、`deleteById*` 各成一派
3. **语义冗长**——`queryCurrentUserEnterpriseInfo` 远差于 path 已表达的 `currentUser`

operationId **只降级用作方法注释**（无 summary 时），永不参与命名。

## 命名主源：path 尾段 + HTTP 动词映射表

### 规则 1：尾段有动作语义 → 尾段 camelCase 原样

判定"有动作语义"：尾段不是路径参数（`{id}`）、不是空、**不等于实体资源段**。

实体资源段 = 公共前缀的最后一段（`/investment/enterprise/info` 的 `info`）。path 尾段等于它意味着这是资源根路径，无动作信息。

```text
POST /saveEnterpriseApply   → saveEnterpriseApply
GET  /simplePage            → simplePage
POST /association           → association
GET  /currentUser           → currentUser
POST /tree                  → tree
POST /login                 → login
```

尾段含连字符（kebab）→ 转 camelCase：`/cancel-association` → `cancelAssociation`。

### 规则 2：尾段无动作语义 → HTTP 动词缺省映射

| HTTP 方法 | 路径形态 | 方法名 | 语义 |
|---|---|---|---|
| GET | `/{id}`（尾段是路径参数） | `byId` | 按 id 查详情 |
| POST | `/`（尾段空） | `insert` | 新增 |
| POST | `/info`（尾段 = 实体资源段） | `insert` | 新增（资源根路径） |
| PUT | `/` 或 `/{id}` | `update` | 修改 |
| DELETE | `/` 或 `/{id}` | `delete` | 删除（批量 id 走 query） |

映射名（byId/insert/update/delete）来自**存量手写代码的既有事实**，不是臆造——生成结果与存量一致，增量合并才不会撞出"同一端点两个方法名"。

⚠️ **映射表是默认值，按项目存量校准**（xbwisdom 真跑验证）：动词命名存在项目方言——by-investment 用 `delete`（DELETE 批量），xbwisdom 用 `remove`（DELETE `/{id}`，user/permission-group 多数派）。首次为项目生成 RESTful 方法时，先 grep 存量 api 的 DELETE 方法名：有统一惯例（如 remove）→ 按惯例并记入 `docs/api-spec.md` 的「RESTful 动词映射（本项目校准）」段；无存量样本 → 按默认映射表，首例生成后补记忆。

### 规则 3：重名消歧 → 停下询问

同一工厂内推导出重名（如 `GET /list` 与 `GET /queryList` 都想叫 `list`，或两个不同端点尾段相同）→ 列出冲突端点，问用户各叫什么。**不自行加数字后缀**（`list2` 是垃圾名），不擅自改尾段（那是 spec 的事实）。

## 方法注释

- 首选 operation 的 `summary` 全文：`/** 简单分页查询企业管理-企业信息列表 */`
- 无 summary → 退化用 operationId 原文（含数字后缀也照用，它是此时唯一线索）
- 都没有 → 用方法名（保持有注释，块内每个方法统一有 JSDoc）

## 完整推导表（enterprise-info 真机 19 端点）

| path | method | x-order | 方法名 | 命中规则 |
|---|---|---|---|---|
| /page | get | 10 | `page` | 尾段原样 |
| /{id} | get | 12 | `byId` | 动词映射 |
| /getEnterpriseInfo | get | 12 | `getEnterpriseInfo` | 尾段原样 |
| / | post | 14 | `insert` | 动词映射（资源根） |
| / | put | 15 | `update` | 动词映射 |
| / | delete | 16 | `delete` | 动词映射 |
| /updateReleaseStatus | post | 17 | `updateReleaseStatus` | 尾段原样 |
| /association | post | 18 | `association` | 尾段原样 |
| /cancelAssociation | post | 19 | `cancelAssociation` | 尾段原样 |
| /saveEnterpriseApply | post | 20 | `saveEnterpriseApply` | 尾段原样 |
| /editEnterpriseApply | post | 21 | `editEnterpriseApply` | 尾段原样 |
| /checkEnterpriseApply | get | 21 | `checkEnterpriseApply` | 尾段原样 |
| /getEnterpriseReview | get | 23 | `getEnterpriseReview` | 尾段原样 |
| /getEnterpriseApplyPage | post | 30 | `getEnterpriseApplyPage` | 尾段原样 |
| /enterpriseReview | post | 31 | `enterpriseReview` | 尾段原样 |
| /simplePage | get | 32 | `simplePage` | 尾段原样 |
| /currentUser | get | 13 | `currentUser` | 尾段原样 |
| /getEnterpriseCardMyself | get | 40 | `getEnterpriseCardMyself` | 尾段原样 |
| /getEnterpriseCardQrCode | get | 41 | `getEnterpriseCardQrCode` | 尾段原样 |

存量手写代码里有 `list`（GET /list，x-order 11）——本表未列因切片清单里它属同批，规则同为尾段原样。

## 存量命名偏差的处理（增量合并语义）

存量方法名与本规则推导不一致时（如 `insert` 的 url 实际指向 `/common` 尾段——旧版后端路径，新版切片已变为资源根 `/`）：

- **方法已存在 → 名字保旧**，不按新规则改名（改名会破坏所有调用方）
- 在报告里标注偏差："方法 `insert` 的 URL 指向 `/{URL}/common`，最新切片该端点已是 `POST {URL}`，请核对后端是否迁移；本 skill 未改动"
- 只有**新方法**才严格按本文件规则命名
