---
name: spec-to-api
description: 从 api-spec 切片生成项目约定的 api 封装（share 层工厂 createXxxApi + app 层薄壳），消费 spec-to-model 生成的 model class。当用户提供 api-spec/output 下同实体的多个切片路径、要求"根据接口生成 api"、"生成接口封装"、"生成 api 工厂"、"spec 转 api"、或在 spec-to-model 完成后要求继续生成 api 时触发。按实体聚合输入（同 URL 前缀多切片 → 一个工厂文件）；方法名从 path 尾段 + HTTP 动词映射推导（operationId 有数字后缀污染，不作命名源）；schema 自动回链已生成 model（角色 × 字段指纹匹配，无匹配时引导先跑 spec-to-model）；三层增量合并保旧手改；不编造 spec 外的默认值（pageOrder/countTotal 等）。明确不生成 model（走 spec-to-model）、不写 vue 页面。
---

# api-spec 切片 → share 层 api 工厂 + app 层薄壳

把一组同实体的 OpenAPI path 切片（来自 `api-spec/output/`）转换成**项目约定的 api 封装**：share 层的工厂函数（`createXxxApi(request) => ({ ...methods })`）+ 各 app 层的实例化薄壳。入参/出参类型引用 **spec-to-model 生成的 model class**——本 skill 是它的直接下游，共享 `docs/api-spec.md` 约定记忆。

本 skill 不生 model、不碰页面、不绑定任何具体 axios 实例（工厂只依赖 request 的函数形状）。

## 何时触发

- 用户给一个或多个 `api-spec/output/.../paths/*.json` 切片路径，要生成对应 api
- 用户说"根据接口生成 api / 接口封装 / api 工厂"
- spec-to-model 刚跑完（同会话），用户要求继续生成 api——此时 model class 名直接可用（来源连续性，见 `references/type-binding.md`）
- 后端接口变更后（spec-pull 重切片），要增量同步 api

## 何时**不**触发

- 要生成 model / class / 类型 → 走 `spec-to-model`（本 skill 的上游，先有 model 再有 api）
- 要生成完整页面（列表/详情/表单）→ 走 `wd-comp`（小程序）或 `ep-comp`（web），它们消费本 skill 的产物
- 要改 axios 拦截器 / request 实例配置 → app 基础设施，本 skill 只消费注入点不实现

## 输入：按实体聚合（不是一次一个切片）

一个实体（如 enterprise-info）对应多个 path 切片文件（一个文件可含 get/post/put/delete 多个 operation），产出**一个** api 工厂文件。聚合键是切片 path 的公共 URL 前缀——它正是工厂文件里的 `const URL` 值（如 `/investment/enterprise/info`）。

```text
输入 19 个切片（enterprise-info-*.json + enterprise-info.json + enterprise-info-id.json）
  → 公共前缀 /investment/enterprise/info → const URL
  → 实体名 EnterpriseInfo（按项目约定的实体名规则，与 model 命名同源）
  → 产出 api/investment/enterprise-info.ts 一个工厂文件（19 个方法）
  → 产出 apps/<app>/src/api/investment/enterprise-info.ts 薄壳（每个 app 一份）
```

用户给单个切片也接受（单方法增量追加进已有工厂文件）；给一组切片按公共前缀归组，**前缀不一致时分组询问**，不强行合并。聚合细节与排序（`x-order` 粗排 + 文件名字典序稳定兜底）：见 `references/input-aggregation.md`。

## 前置：读项目约定（每次运行最先做）

与 spec-to-model 共用 `docs/api-spec.md` 记忆文件。**api 目录、api 形态、服务前缀、app 层 request 注入点、批量 id 工具**是每项目不同的工程约定，不能写死。

1. 读 `docs/api-spec.md`：存在 → 用其中的约定（目录/命名/http 类型/api 形态/服务前缀/app 注入/批量工具）；缺 api 侧条目 → 只探测补缺项
2. 不存在 → 探测项目现有结构归纳约定；探测不到的点用 AskUserQuestion 问
3. 把探测/询问结果增量写入 `docs/api-spec.md`
4. 按约定执行生成

探测点清单（api 侧 7 项）：见 `references/project-conventions.md`。

## 方法名推导（operationId 不可用）

**operationId 不作命名源**——springdoc 重名消歧产生 `queryById_19`、`add_15`、`deleteById_15` 这类数字后缀污染，且动词前缀风格不统一（`querySimplePage` vs `saveEnterpriseApply`）。方法名只从 **path 尾段 + HTTP 动词**推导：

| spec 路径形态 | 方法名 | 依据 |
|---|---|---|
| 尾段有动作语义（`saveEnterpriseApply`、`simplePage`、`tree`、`association`） | 尾段 camelCase **原样** | 现有手写多数派的既有事实 |
| GET `/{id}`（尾段是路径参数） | `byId` | RESTful 详情 |
| POST `/`（尾段空或等于实体资源段） | `insert` | RESTful 新增 |
| PUT `/` | `update` | RESTful 修改 |
| DELETE `/`（批量 id query） | `delete` | RESTful 删除 |

- 方法注释取 operation 的 `summary` 全文；无 summary → 退化用 operationId（此时只做注释不做命名）
- 同一工厂内推导出重名方法 → 停下询问消歧，不自行加后缀
- 边界判定（尾段"有没有动作语义"）与更多案例：见 `references/method-naming.md`

## 请求形态（一个方法怎么发请求）

通用规则（跨项目一致的部分）：

- **映射唯一依据参数位置**：`in: query` → `params`、`requestBody` → `data`、`in: path` → 拼 url，不猜后端兼容行为
- **query 参数平铺合并**：多个 `in: query` 对象型参数（业务查询 + sqlPageParams）合并进**同一个 params**，绝不保留对象名嵌套（`params: { query: {...} }` 会序列化成 `query[field]=x`，Spring 绑定失败）
- **淘汰模板字符串拼 query**：`` `${URL}/xxx?id=${id}` `` 是存量坏风格，新生成一律 `params: { id }`（透传已序列化 query 串的特例除外）
- **DELETE 批量 id**：后端 Spring 需要 `id=1&id=2` 重复 key 格式，axios 数组序列化不符合 → 用项目批量工具拼接（如 `groupBatchIds`），`url: `${URL}?${groupBatchIds(ids as string[], 'id')}``
- **响应壳**：`data` 含 `records` → `ResPage<T>`；`data` 是数组 → `Res<T[]>`；对象 → `Res<T>`；基本类型 → `Res<boolean>` / `Res<string>`

分页查询的 **4 种 spec 组合**（判定顺序 C → A → B → D）：

| 组合 | spec 特征 | 生成结构 |
|---|---|---|
| **A 拆解式** | `in:query` sqlPageParams + requestBody 业务 | `pageNum`/`pageSize` 进 params，业务进 data（方法体解构） |
| **B 双 query 合并** | 两个 `in:query` 对象 | `PageQuery<SearchModel>` 平铺 `params: { ...params }` 一个对象 |
| **C 嵌套 DTO 包装** | body 是 `{ page, queryParams }`（Page 全展开） | 重组嵌套：`page: { current: pageNum, size: pageSize }, queryParams`；Page 噪音字段零生成；`queryParams` 空洞 → `AnyObject` 弱类型 |
| **D spec 零定义** | 响应分页但查询参数没定义 | `PageQuery<AnyObject>` 弱类型 + 报告缺口，不编造查询字段 |

**不编造原则（硬规则）**：`pageOrder: 'update_time desc'`、`countTotal: true` 这类分页辅助默认值在 spec 里只有字段定义、没有业务取值语义——**不生成**，留人工补。生成的方法体只含 spec 能推导的结构。存量方法里已有的手写默认值，增量合并时原样保留。

各形态方法体模板与真机对照：见 `references/request-shaping.md`。

## 类型回链（schema → model class）

方法签名的入参/出参类型**引用 model 目录的 class**，不内联重复结构。匹配策略（按优先级）：

1. **来源连续性**：同会话刚跑过 spec-to-model → 直接用其产出的 class 名
2. **角色 × 字段指纹**：按接口形态锁定候选角色（分页查询 → `*SearchModel`、requestBody → `*FormModel`、records 项 → `*TableModel`、详情响应 → `*Model`/`*DetailModel`），再用 schema 字段名集合对 class 字段集（含 extends 链）算覆盖率，**≥ 0.8 且该角色下最高分** → 匹配
3. **无匹配 → 停下引导先跑 spec-to-model**（补齐对应切片的 model）；用户明确跳过才降级内联 `Res<{ ... }>` 匿名类型，且类型映射对齐 model 约定（int64 → string 等）

id 类参数写法沿用现有惯例：`XxxFormModel['id']`（索引访问类型）。匹配细节与降级流程：见 `references/type-binding.md`。

## 三层增量合并，冲突保旧

目标 api 文件已存在时（后端加接口、spec-pull 后同步），按 **文件 → 方法 → import** 三层检测：

- **文件层**：工厂文件不存在 → 新建全量；存在 → 进入方法层
- **方法层**：方法名已存在 → **整方法保留不动**（含手写的 `pageOrder` 默认值、模板拼接等历史风格，不"顺手规范化"）；不存在 → 按 x-order 排序位置追加
- **import 层**：只追加缺失的 import，不重排已有顺序
- **spec 已删接口**（工厂有方法但本次切片没出现）→ 报告差异清单提示核对，**不自动删**

**app 层薄壳**：已存在同名薄壳文件 → 跳过；不存在 → 生成（内容见下）。

## app 层薄壳（可选尾步，探测到 app 才做）

每个 app 一份，与 share 工厂同相对路径（镜像服务域子目录）：

```ts
import { createVehicleFocusApi } from '@gx-web/biz'

import request from '@/service'

export const VehicleFocusApi = createVehicleFocusApi(request)
```

- 工厂 import 来源：api 产出所在共享包（项目约定探测，如 `@gx-web/share` / `@gx-web/biz`）
- `request` 注入点：**每 app 不同**（web 可能是 `@/plugins/axios`，小程序可能是 `@/service`），从各 app 现有薄壳/请求层探测，记入 `docs/api-spec.md`；app 无既有注入点可探测 → 询问，不猜
- **导出形式是约定项**：by-investment 惯例 `const XxxApi = ...; export default`（default 导出）；xbwisdom 用户拍板命名导出 `export const XxxApi = ...`（且实例名 Api 结尾）。探测存量薄壳先例；无先例默认命名导出（`export *` barrel 可转发），首例后记入约定
- app 无 api 目录 → 询问是否新建该 app 的目录结构，不擅自创建

## 工作流

0. **读项目约定**：读 `docs/api-spec.md`；api 侧条目缺失则探测补缺（见 `references/project-conventions.md`）
1. **聚合输入**：识别切片文件组，算公共 URL 前缀 → `const URL` + 实体名 + 目标文件路径（api 目录按约定）
2. **回链 model**：对每个 operation 的入参/出参 schema 跑类型回链（见 `references/type-binding.md`）；缺 model 的接口先收集
3. **缺 model 引导**：有接口匹配不到 model → 报告清单，引导先跑 spec-to-model（给出缺的切片路径与建议 class 名）；用户明确跳过才对缺口内联匿名类型
4. **推导方法集**：每个 operation → 方法名（尾段 + 动词映射表）+ 注释（summary）+ 请求形态 + 签名类型，按 x-order 排序
5. **写入 share 工厂**：目标文件存在则三层保旧合并；不存在则新建；确保对应 `index.ts` 有 `export *`
6. **写 app 薄壳**：每个约定内的 app，无同名薄壳则生成（注入点按约定）
7. **报告**：
   - 产出路径（share 工厂 + 各 app 薄壳）、方法数、使用的项目约定来源
   - 方法名推导表（切片 → 方法名 → 依据），标注 RESTful 映射命中的方法
   - 类型回链结果（每个方法引用的 model class、匹配方式：连续性/指纹/内联降级）
   - 增量合并跳过了哪些已有方法、报告 spec 已删接口的差异清单
   - 提醒人工补的分页默认值（pageOrder/countTotal 等 spec 无语义的字段）
   - 任何歧义点（重名消歧、前缀分组、匹配同分）

## Success Criteria

一次成功输出至少满足：

- **约定已读取/补缺**：运行前已读 `docs/api-spec.md` 或本次完成 api 侧探测 + 记忆
- **按实体聚合**：一组同前缀切片产出**一个**工厂文件，`const URL` = 公共前缀
- **方法名零 operationId 依赖**：全部来自尾段或动词映射表；RESTful 端点（`/{id}`、空尾段）正确映射 byId/insert/update/delete
- **每个方法有 JSDoc 注释**（summary 全文）
- **query 全部 `params` 对象**，无模板字符串拼接 query
- **分页 4 组合判定正确**：A 拆解式（分页进 params、业务进 data）/ B 双 query 平铺合并为一个 params（无对象名嵌套）/ C 嵌套 DTO 重组（`pageNum→page.current`、`pageSize→page.size`，Page 噪音零生成，`queryParams` 空洞用 `AnyObject`）/ D 零定义弱类型 + 缺口报告
- **类型全部回链 model**：无凭空内联（内联仅出现在用户明确跳过 spec-to-model 的缺口上，且类型映射对齐 model 约定）
- **没有编造 spec 外默认值**：无 pageOrder/countTotal/sort 取值
- **三层保旧**：已存在方法整方法不动、import 不重排、spec 已删接口只报告不删
- app 薄壳的 request 注入点来自约定（探测/询问），非臆测

## 不做的事

- 不生成 model / class / 类型定义 → 走 `spec-to-model`
- 不实现 request 实例 / 拦截器 → app 基础设施职责
- 不生成 `index.vue` / 任何页面
- 不跑构建（产物是类型声明的消费方，风险低；如需验证用户另行 ts-check）
- 不改已有方法体（哪怕风格不佳——pageOrder 手写值、模板拼接等历史风格一律保旧）

## 配套 skill

- **spec-to-model**（本插件）：直接上游。本 skill 消费其产出的 model class；缺 model 时引导用户先跑它（同批切片、同会话时有来源连续性加成）
- **spec-pull**（本插件）：后端更新切片后，先重切片，再用本 skill 增量同步 api（三层保旧）
- **wd-comp / ep-comp**（本市场插件）：页面生成 skill，消费本 skill 产出的 api 工厂 + model
- **api-spec 识别纪律**：见项目 `AGENTS.md` 的 api-spec 识别纪律段（由 spec-init skill 初始化时注入）。本 skill 默认输入就是 `api-spec/output/` 切片

## 反馈捕获（生成会话收尾，不阻塞交付）

本会话中用户对产物**显式纠偏**（指出不对 + 给改法）、**主动要求**（期望效果，非纠错）或**要求重生成**时，交付前完成落账：

1. 可泛化的纠偏/要求 → 提炼成一行规则，增量写入本项目 `docs/api-spec.md` 对应条目（只写规则语句，不记原话；机制同上文「读项目约定」）
2. 往 `docs/codegen-ledger.md`（无则创建，进 git）追加一行：

   ```text
   - [YYYY-MM-DD] api-spec:spec-to-api | <纠偏|要求|重生成> | <用户原话摘录> | <当时的处理> | <涉及产物路径>
   ```

3. 主动要求类**双写**（约定文件 + 台账各一条）；纯纠偏至少记台账

只记本会话内显式信号，闲聊与推测不入账。台账供市场蒸馏巡检（skill-evolution:inspect）消费，原文不改写，行尾处理标记由巡检追加。
