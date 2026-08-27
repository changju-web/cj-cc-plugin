# core 篇 · @gx-web/core 日常用法约定

覆盖 `@gx-web/core` 的 model class 手写规范。OpenAPI 批量生成 model 的场景走 `api-spec:spec-to-model`（其 FieldName 清洗规则书更细），本篇只管日常手写与修改。

## model class 形态

- 业务实体用 `class` 而非 `interface`：装饰器元数据与方法依赖 class 才能保留
- 字段用确定性断言 `!:`，不用 `?:`（后端语义可选时仍写 `!:`，类型上用 `| undefined` 表达）

```ts
import { FieldName } from '@gx-web/core'

export class EnterpriseModel {
  @FieldName('企业名称')
  name!: string

  @FieldName('联系电话')
  contactNumber!: string
}
```

## @FieldName 装饰器

- `@FieldName('中文')` 是该字段 UI 文案（表头 / label / placeholder）的唯一来源，展示字段必标
- 同一 class 内不得重复——重复等同于装饰器失效（多字段撞名时加限定词消歧）
- 文案是给人看的中文名词短语，不臆翻译文字段名；无中文可写时保留原字段名待补
- 尾部技术参数括号（表名 / code / 单位 / 枚举值）剥掉，业务语义括号保留

## getModelFromJson

- 接口数据 → class 实例一律走 `getModelFromJson(json, Model)`，保装饰器元数据与 class 方法
- 禁止 `Object.assign(new Model(), json)` / 展开复制——丢装饰器元数据，UI 文案链路失效

```ts
import { getModelFromJson } from '@gx-web/core'

const detail = getModelFromJson(res.data, EnterpriseModel)
```

## DetailModel

- 只读详情展示的 model 继承库内 `DetailModel` 基类，配合 `GXDescriptions` / 详情弹窗使用
- 展示字段必须有 `@FieldName`，否则需在配置中手动提供 `label`

## 待库作者补充

- [ ] class 内方法 / getter 的推荐写法与禁忌
- [ ] 嵌套 model（字段类型为另一 model class）的手写规范
- [ ] 枚举字段（值 + label 映射）在 model 层的存放约定
