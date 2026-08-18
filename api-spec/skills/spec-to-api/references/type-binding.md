# Type Binding · schema → model class 回链

`SKILL.md`「类型回链」的关键补充。解决"方法签名里的类型从哪来——怎么把 spec 的内联 schema 对到 model 目录已有的 class，对不上怎么办"。

## 为什么要回链（不内联结构）

api 层的价值就是**类型链路**：入参引用 `XxxSearchModel`/`XxxFormModel`，出参引用 `XxxModel`/`XxxTableModel`——`getModelFromJson`、表单回填、表格列生成都吃这些 class 的装饰器语义（`@FieldName`/`@ClassName`）。内联匿名结构 = 链路断点。

## 匹配优先级（三层）

### 1. 来源连续性（最强信号）

同会话刚跑过 spec-to-model（输入是同批切片）→ 它报告里列了生成的 class 名与来源切片，**直接对号入座**，跳过指纹计算。

```text
spec-to-model 刚生成：EnterpriseInfoTableModel（来自 simplePage 的 records）+ EnterpriseInfoSearchModel（来自 query）
→ spec-to-api 处理 simplePage 切片时：
   simplePage: (params: PageQuery<EnterpriseInfoSearchModel>) => request<ResPage<EnterpriseInfoTableModel>>(...)
```

### 2. 角色 × 字段指纹（常规信号）

先按接口形态锁定候选角色，再用字段覆盖率打分。

**第一步：角色锁定**（形态判定与 spec-to-model 的形态 A/B/C/D 同源；**分页响应优先于 body 驱动**——POST/PUT 且响应 data 含 records 时，requestBody 是查询条件不是表单）：

| schema 来源 | 锁定角色（class 后缀，按项目约定） |
|---|---|
| 分页响应 + requestBody 业务对象 | `*SearchModel`（或项目约定的查询载体，如 Entity 全量——xbwisdom 后端用全量实体作查询条件，指纹常命中 Entity） |
| 分页响应 + query 业务对象 / GET list 的 query 对象 | `*SearchModel`（或 `*Model`，按项目约定探测） |
| 非分页的 requestBody（新增/编辑/审核提交） | `*FormModel`（含 `*ReviewFormModel` 等操作变体） |
| 分页 records 项 | `*TableModel`（或基础 `*Entity`/`*Model`，按项目约定） |
| 响应 data 对象 | `*Model` / `*Entity` / `*DetailModel` |
| 响应 data 基本类型 | 无需匹配（`Res<boolean>` 等） |
| spec 零定义的分页查询（组合 D） | 不匹配，直接 `PageQuery<AnyObject>` 弱类型（见 request-shaping.md 形态 9） |

**第二步：字段覆盖率打分**：

```text
S = spec schema 的字段名集合
C = 候选 class 的字段名集合（必须含 extends 继承链上全部字段）
score = |S ∩ C| / |S|        ← schema 字段被 class 覆盖的比例

score ≥ 0.8 且是该角色下最高分 → 匹配该 class
```

- 覆盖率方向是 **S 被 C 覆盖**（class 可以比 schema 多字段——后端少给了几列不影响消费；class 少了 schema 的字段才是断链）
- **body 混入分页基类字段的摊平变体**（xbwisdom 真机）：POST body 顶层平铺业务字段 + `current`/`size`（DTO 继承了 MyBatis-Plus Page 的摊平）——这两个是框架噪音不是业务字段，算覆盖率时**从 S 中剔除**；它不是组合 C（组合 C 的 page 是嵌套对象且含完整 Page 字段族），按普通 body 驱动处理
- 同角色下多个候选同分（≥ 0.8）→ 停下询问，列出候选与各自覆盖的差集字段
- 全部 < 0.8 → 该 schema 无匹配，走兜底流程

**实体名先验**：打分前先按 path 推导实体名（`EnterpriseInfo`）筛一遍候选（`EnterpriseInfo*SearchModel` 优先于 `ParkInfo*SearchModel`），实体内无匹配再放宽到全目录——防止跨实体误配（字段名高度雷同的审计字段场景）。

### 3. 无匹配 → 引导上游（默认），跳过才内联（降级）

```text
无匹配的 schema
  → 收集进缺口清单（附：来源切片路径、建议 class 名、建议角色）
  → 报告并引导："这 N 个接口的 <入参/出参> 还没有 model，
      建议先对 <切片路径> 跑 spec-to-model（建议生成 XxxSearchModel / XxxFormModel），
      生成后回来继续本 skill"
  → 用户明确说"跳过/直接内联" → 降级内联（见下）
  → 用户去跑 spec-to-model → 回来重跑本 skill（此时走来源连续性）
```

## 降级内联的规范（用户明确跳过时）

```ts
getTemporaryToken: () =>
  request<
    Res<{
      disposable: boolean
      /** 到期时间 */
      exp: string
      token: string
    }>
  >({
    method: 'post',
    url: `/auth/temporary/token/login`
  }),
```

硬规则：

1. **类型映射对齐 model 约定**：int64 → `string`、int32 → `number`、date → `string`（存量 `temporary-token.ts` 的 `exp: number // integer(int64)` 是历史 bug，不复刻——JS Number 装不下 int64）
2. 每个字段上方 JSDoc 注释取 spec description（无则字段名）
3. 内联块上方加注释标注降级原因：`// 降级内联：未匹配到 model（用户跳过 spec-to-model），建议后续补 model 替换`
4. 内联是**技术债标记**，报告里单列清单提醒补 model

## id 类参数的写法

无独立 schema 的散参数（`in: query` 的单个 id），类型用**索引访问**引用 model 字段：

```ts
getEnterpriseReview: (id: EnterpriseApplyFormModel['id']) => ...
delete: (ids: EnterpriseEditorFormModel['id'][]) => ...
```

- 宿主 class 选该实体**最轻量**的角色（FormModel/EditorFormModel 优先于大而全的 Model）——与存量手写惯例一致
- 实体完全没有 model（连 id 都没得引）→ 基本类型退化（int64 → `string`），不为了一个 id 引导用户生成整套 model

## 参数类型映射表（散参数与内联共用）

| OpenAPI | TS |
|---|---|
| `integer` + `format: int64` | `string` |
| `integer`（int32 / 无 format） | `number` |
| `number` | `number` |
| `boolean` | `boolean` |
| `string`（含 date/date-time） | `string` |
| `array` + items | `T[]` |

与 spec-to-model 的 type-mapping 同源同表——两 skill 的类型语义必须一致，否则同一字段在 model 与 api 两层类型打架。

## 真机示例：enterprise-info 的回链结果

```text
simplePage（GET 分页）
  query 对象（17 字段：buildingId/companyScale/createTimeEnd/...）
    → 角色 SearchModel → 实体先验 EnterpriseInfo* → EnterpriseSimplePageSearchModel
      （该实体 SearchModel 变体多，指纹命中"简单版"子集——覆盖率 1.0）
  data.records（50+ 字段）
    → 角色 TableModel/Model → EnterpriseAndBuildingModel（覆盖 records 全字段 + 楼栋联查增量）

saveEnterpriseApply（POST body）
  requestBody（表单字段集）
    → 角色 FormModel → EnterpriseApplyFormModel（覆盖率 ≥ 0.9）

enterpriseReview（POST body，审核）
  → EnterpriseReviewFormModel（操作变体 FormModel，指纹含 enterpriseId/reviewCode 特征字段）

无匹配示例（假想）：
  新接口 POST /exportExcel 的 requestBody 引入了 8 个全新字段
    → 全角色覆盖率 < 0.8 → 进缺口清单 → 引导 spec-to-model（建议 EnterpriseExportFormModel）
```
