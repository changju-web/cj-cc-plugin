# Enum Extraction · 内联枚举抽取规则书

`SKILL.md` 原则 4 的详细规则书。本文件解决"description 里出现 `(0、待处理 1、上架 2、下架)` 这类内联枚举怎么处理"的所有边界情况。

## 形态约定

默认形态是「JSDoc 注释 + `as const` 对象 + 具名 type」。若项目已有枚举字典文件（如 `src/dict/value.ts`）定义了前端硬编码枚举的固定形态，则对齐其风格：

```ts
/** 系统状态 */
export const SystemStatusValue = {
  /** 启用 */
  enabled: '1',
  /** 禁用 */
  disabled: '0'
} as const
```

本 skill 抽内联枚举时**对齐这个形态**，但有两点差异：

1. **就近放 model 文件顶部**，不写入项目的枚举字典文件（如 `src/dict/`；避免侵入全局字典体系，用户后续可手工迁移）
2. **同时生具名 type**（项目字典文件通常没生 type，但生 type 让字段类型更安全）：

```ts
/** 发布状态 */
export const ReleaseStatus = {
  /** 待处理 */ pending: 0,
  /** 上架 */   listing: 1,
  /** 下架 */   offline: 2
} as const
export type ReleaseStatus = ValueOf<typeof ReleaseStatus>
```

字段引用具名 type：

```ts
@FieldName('发布状态')
releaseStatus!: ReleaseStatus
```

## ValueOf 工具类型

每个用了枚举的 model 文件顶部内嵌一份（不抽公共）：

```ts
type ValueOf<T> = T[keyof T]
```

理由：探测（`grep -rn "type ValueOf"`）项目没有现成 `ValueOf` 公共定义时，抽到公共包是越界改动；每个文件 5 行开销可接受。归属是约定项——项目已有公共定义则改 import（见 `project-conventions.md` 探测点 8）。

如果未来项目抽了公共 `ValueOf`，删 model 内的本地定义、改 import 即可。

## 枚举识别规则

### 强信号：description 尾部括号内有"值-含义"对

匹配正则（近似）：`[（(]\s*(?:\d+|'[^']+'|"[^"]+"|[A-Za-z_]+)[、,]?\s*[^)）]*[)）]\s*$`

具体形态：

```
（0、待处理 1、上架 2、下架）              ← 数字值 + 中文含义
（0：待审核，1:已通过，2：不通过）         ← 分隔符混用
（Y/N）                                     ← 字符串值缩写
（'true'/'false'）                          ← 字符串值
（male/female/unknown）                     ← 英文标识符
```

抽取流程：

1. 解析括号内的"值-含义"对
2. 为每个值生成一个 key（英文标识符，从含义翻译或音译）
3. 生 const 对象 + type
4. 字段类型从 `number`/`string` 改为具名 type

### 真实示例

`enterprise-info` 接口的两个枚举字段：

```text
releaseStatus | 发布状态（0、待处理 1、上架 2、下架）     | integer(int32)
reviewStatus  | 审核状态(0：待审核，1:已通过，2：不通过)  | integer(int32)
```

抽取后：

```ts
type ValueOf<T> = T[keyof T]

/** 发布状态 */
export const ReleaseStatus = {
  /** 待处理 */ pending: 0,
  /** 上架 */   listing: 1,
  /** 下架 */   offline: 2
} as const
export type ReleaseStatus = ValueOf<typeof ReleaseStatus>

/** 审核状态 */
export const ReviewStatus = {
  /** 待审核 */ pending: 0,
  /** 已通过 */ approved: 1,
  /** 不通过 */ rejected: 2
} as const
export type ReviewStatus = ValueOf<typeof ReviewStatus>

@ClassName('企业信息')
export class EnterpriseInfoModel {
  /** 发布状态（0、待处理 1、上架 2、下架）	integer(int32)	*/
  @FieldName('发布状态')
  releaseStatus!: ReleaseStatus

  /** 审核状态(0：待审核，1:已通过，2：不通过)	integer(int32)	*/
  @FieldName('审核状态')
  reviewStatus!: ReviewStatus

  ...
}
```

## 命名规则

### const / type 名

`<字段 PascalCase>` —— 直接用字段名转 PascalCase，不加 `Value` / `Enum` / `Type` 后缀：

```
releaseStatus   → ReleaseStatus
reviewStatus    → ReviewStatus
userType        → UserType
gender          → Gender
```

**例外**：与项目已有命名冲突时（如 `src/dict/value.ts` 里已有 `SystemStatusValue`）→ 加业务前缀避免歧义。但本 skill 就近放 model 内，作用域隔离，一般不冲突。

### key 名

为每个枚举值生一个英文 key：

| 中文含义 | key 策略 |
|---|---|
| 有标准英文对应（待处理=pending、上架=listing、启用=enabled） | 直接用英文 |
| 业务专有词（如"已驳回"、"已挂起"） | 音译或拼音，注释保留中文 |
| 纯数字状态码无明确含义 | 用 `status0`/`status1` 兜底，注释标"未知含义" |

key 用 camelCase，不用 SCREAMING_SNAKE_CASE（若项目枚举字典文件另有风格，对齐项目）。

### 注释

每个枚举项保留中文注释：

```ts
/** 发布状态 */
export const ReleaseStatus = {
  /** 待处理 */ pending: 0,
  ...
}
```

## 不抽的情况

### 1. 括号内是技术参数，不是枚举

```
所属行业(sys_industry表code字段)   ← 字典表引用，不是内联枚举
注册资本(万元)                      ← 单位，不是枚举
```

→ 不抽，按 `field-name-rules.md` 规则 2 剥掉括号即可。

### 2. 括号内是描述性说明，没值对应

```
状态(1 有效 0 无效)                 ← 严格说也是枚举，但只有两个值且含义直白
```

→ 可抽可不抽。两个值的 0/1 状态建议**不抽**，直接 `status!: 0 | 1` 或 `status!: number` 加 JSDoc 注释。理由：为两个值生一套 const+type 是过度工程。

阈值：**值 ≥ 3 个**才抽具名 const；2 个及以下用 inline union 注释。

```ts
// 2 个值：inline
@FieldName('状态')
status!: 0 | 1  // 1 有效 0 无效

// 3+ 个值：抽具名
@FieldName('发布状态')
releaseStatus!: ReleaseStatus
```

### 3. 括号内是字典引用（强信号但应走 @Dict）

```
性别(sys_gender 字典)              ← 字典表引用
所属行业(sys_industry表code字段)   ← 字典表引用
```

→ **不抽**，也不套 `@Dict`（用户设计中）。字段按基础类型生成（`string`/`number`），description 全文保留在 `@FieldName` 里（按 `field-name-rules.md` 规则 2 剥技术括号，但保留字典提示）。

等用户的 `@Dict` 体系设计完，再回头补这块。

### 4. 括号内解析不出对应关系

```
某字段(分类)                       ← 纯描述，没值
某字段(参考格式：xxx)               ← 没值
```

→ 不抽，按 `field-name-rules.md` 处理。

## 字段引用

枚举抽完后，字段类型从 `number`/`string` 改为具名 type：

```ts
// 抽之前（registration 风格）
@FieldName('发布状态')
releaseStatus!: number

// 抽之后
@FieldName('发布状态')
releaseStatus!: ReleaseStatus
```

JSDoc 注释保留原文 description（含括号枚举值），让用户在 IDE hover 时看到完整说明。

## 增量合并的边界

按 `SKILL.md` 原则 5，字段级颗粒度 + 冲突保旧：

- 字段已存在 → 整字段保留不动（即使原类型是 `number`，新 spec 加了枚举也不改）
- 字段不存在 → 追加字段 + 顶部追加对应 const/type

例外：const/type 顶部声明已存在（同名）→ 保留旧的，不覆盖。同名字段在不同接口间复用枚举是常见场景，覆盖会破坏已有引用。
