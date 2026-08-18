# Type Mapping · 类型语义还原

`SKILL.md` 原则 1 的详细规则书。本文件解决"OpenAPI schema → TS 类型"的所有边界情况。

## 为什么不照搬 registration 的"全 string"

`registration/model/index.ts` 把 `boolean`/`double`/`object`/`int32` 几乎全部退化为 `string`，这是生成器缺陷，不是有意设计。后果：

- `display3d: boolean` 变 `string` → TS 类型检查形同虚设，模板里写 `v-if="data.display3d"` 永远成立（非空字符串都 truthy）
- `latGcj02: number` 变 `string` → 经纬度计算要先 `Number(...)`，丢失编译期保护
- `releaseStatus: number` 三处状态位保留了 number、其余 int32 又退化 string → 同 class 内类型风格不一致

唯一合理保留的：**`int64 → string`**（JS Number 安全整数 2^53 < 2^63，国内 Java 后端普遍配 Jackson 把 Long 序列化成 string 防丢精度）。registration 这一处做对了，其余全错。

## 完整映射表

| OpenAPI `type` | OpenAPI `format` | TS 类型 | 备注 |
|---|---|---|---|
| `integer` | `int64` | `string` | 防丢精度（关键） |
| `integer` | `int32` | `number` | |
| `integer` | （无） | `number` | 默认按 int32 |
| `integer` | `byte` | `string` | 字节序列化通常是 base64 字符串 |
| `number` | `double` / `float` | `number` | |
| `number` | （无） | `number` | |
| `boolean` | — | `boolean` | **绝不退化** |
| `string` | `date-time` | `string` | JSON 标准就是 string |
| `string` | `date` | `string` | |
| `string` | `time` | `string` | |
| `string` | `byte` / `binary` | `string` | 通常文件 base64 |
| `string` | `uuid` | `string` | |
| `string` | （其他/无） | `string` | |
| `object` | 有 `properties` | 同文件内联 class | 见下「嵌套对象」 |
| `object` | 仅 `additionalProperties: {}` | `Record<string, any>` | 不臆造子结构 |
| `object` | 仅 `additionalProperties: { schema }` | `Record<string, T>` | T 按本表递归 |
| `array` | — | `T[]`（T 按本表对 `items` 递归） | |
| `$ref` | — | （已内联）按 properties 递归 | 切片预处理已展开 |

## 嵌套对象

`properties.foo.properties` 存在时，生成同文件内联 class：

```ts
// spec
"data": {
  "properties": {
    "meta": {
      "type": "object",
      "properties": {
        "version": { "type": "string" },
        "empty":   { "type": "boolean" }
      }
    }
  }
}

// → 生成
export class EnterpriseMetaModel {
  @FieldName('版本')
  version!: string

  @FieldName('空标记')
  empty!: boolean
}

@ClassName('企业信息')
export class EnterpriseInfoModel {
  @FieldName('元信息')
  meta!: EnterpriseMetaModel
  ...
}
```

命名规则：`<主 Model 名去 Model 后缀><字段 PascalCase>Model`。如 `EnterpriseInfoModel` + `meta` → `EnterpriseMetaModel`（不是 `EnterpriseInfoMetaModel`，避免过长）。

**剥不到底的情况**：

- 嵌套超 3 层 → 问用户，不硬展开
- 循环引用（`foo.bar` 又指回 `foo`）→ 问用户
- `additionalProperties: {}` 但疑似被折叠（spec 没给子字段）→ 生 `Record<string, any>`，不臆造

## 响应壳剥离

后端响应普遍包一层 `R<T>` / `RObject`。**只取 `data` 下业务字段**，不把壳字段生进 class。

### 判定规则（满足任一即剥）

1. 同时存在 `code` + `data` + `message` → 标准后端壳，取 `data`
2. 同时存在 `code` + `data` + `ok` → 同上
3. 同时存在 `data` + `meta` + `message` → 同上（meta 通常是分页信息，剥掉）

### 三种 `data` 形态

```text
形态 A：data 是单个对象（详情接口）
  data: { properties: { id, name, ... } }
  → 展开 data.properties 生成单个 Model

形态 B：data 是数组（列表接口）
  data: { type: 'array', items: { properties: {...} } }
  → 取 items.properties 生成 <Xxx>TableModel

形态 C：data 是分页（IPage）
  data: { properties: { records: { type: 'array', items: {...} }, total, size, current, ... } }
  → 取 records.items.properties 生成 <Xxx>TableModel
  → total/size/current 不生进 model（分页是查询参数，不是业务字段）
```

### 剥不干净时

壳字段（`code`/`message`/`ok`/`meta`）和业务字段混在 `data` 同级 → **问用户**，不臆测哪些是壳哪些是业务。

### 真实示例

`api-spec/output/招商管理/paths/enterprise-info-getEnterpriseInfo.json` 的响应：

```json
"schema": {
  "description": "请求返回结果包装类",
  "properties": {
    "code": { "type": "string" },           ← 壳字段，剥
    "data": {                                ← 取这里
      "properties": {
        "address": { "type": "string" },     ← 业务字段，生
        ...
      }
    },
    "message": { "type": "string" },         ← 壳字段，剥
    "meta": { ... },                         ← 壳字段，剥
    "ok": { "type": "boolean" }              ← 壳字段，剥
  }
}
```

剥完后只对 `data.properties.address` / `name` / 等业务字段生成 `EnterpriseInfoModel`。

## 数组字段

业务字段自身是数组（如 `tags: { type: 'array', items: { type: 'string' } }`）：

```ts
@FieldName('企业标签')
tags!: string[]
```

如果 `items` 是复杂对象，按「嵌套对象」规则生成内联 class，再 `T[]`：

```ts
export class EnterpriseTagModel {
  @FieldName('标签名')
  name!: string
}

@FieldName('企业标签')
tags!: EnterpriseTagModel[]
```
