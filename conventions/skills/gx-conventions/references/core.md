# core 篇 · @gx-web/core 日常用法约定

覆盖 `@gx-web/core` 的 model class 手写规范。OpenAPI 批量生成 model 的场景走 `api-spec:spec-to-model`（其 FieldName 清洗规则书更细），本篇只管日常手写与修改。

规范真机样本：`xbwisdom-web-monorepo/packages/biz/src/model/enterprise/equipment.ts`。

## model class 形态

- 业务实体用 `class` 而非 `interface`：装饰器元数据与方法依赖 class 才能保留
- class 上方写中文注释 + `@ClassName('中文名')` 装饰器；**每个字段上方必写 `/** 中文说明 */` 注释**
- 字段断言按层分（见「model 分层」）：Entity 响应层全 `!:`；FormModel / SearchModel 按请求语义，必传 `!:`、可选 `?:`

```ts
import { ClassName, FieldName } from '@gx-web/core'

/** 企业门禁设备 */
@ClassName('企业门禁设备')
export class EquipmentEntity {
  /** 门名称 */
  @FieldName('门名称')
  doorName!: string

  /** 门禁状态（1常开，0常闭，2正常） */
  @FieldName('门禁状态')
  doorState!: EquipmentDoorState
}
```

## 注释规范

注释给开发者、`@FieldName` 给 UI，二者并存不可互相替代：

- **字段注释**：每字段上方 `/** 中文说明 */`，内容在字段名基础上补充开发者需要的信息：
  - 枚举 / 状态类：带值域映射，如 `/** 绑定状态（1已绑定，0已解绑） */`
  - 坐标 / 单位类：带坐标系或单位，如 `/** 纬度（WGS-84） */`
  - 特殊请求语义：注明行为，如 `/** 设备管理密码（仅新增请求） */`、`/** 关联权限组主键列表（编辑不传不修改，传空列表清空关联） */`
- **类注释**：每层 model class 上方注明中文用途，如 `/** 企业门禁设备新增/修改表单 */`
- **枚举项注释**：枚举对象每个 key 上方 `/** 中文 */`（见下节）
- `@FieldName` 保持 UI 短文案（枚举值域、坐标后缀等放注释不放 FieldName）

## 枚举三件套

枚举以 `as const` 对象 + 同名类型导出，三件缺一不可：

```ts
/** 门禁状态 */
export const EquipmentDoorState = {
  /** 常闭 */
  normallyClosed: 0,
  /** 常开 */
  normallyOpen: 1,
  /** 正常 */
  normal: 2
} as const
export type EquipmentDoorState = ValueOf<typeof EquipmentDoorState>
```

- 对象与类型同名，字段直接引用该类型（`doorState!: EquipmentDoorState`）
- 数字枚举直接写值；字符串枚举 key 与 value 同词（`local: 'local'`）
- 不用 TS `enum`

## model 分层

同一实体按用途分四层，同文件内从上到下：枚举三件套 → Entity → TableModel → FormModel → SearchModel。

| 层 | 形态 | 断言语义 |
| --- | --- | --- |
| `XxxEntity` | 后端实体全字段，`@ClassName` 标注 | 全 `!:` |
| `XxxTableModel` | `extends XxxEntity {}` 空继承，列表项 | 随 Entity |
| `XxxFormModel` | 新增 / 编辑表单字段 | 必传 `!:`、可选 `?:` 按请求语义 |
| `XxxSearchModel` | 查询条件字段 | 通常 `?:` |

```ts
/** 企业门禁设备列表项 */
export class EquipmentTableModel extends EquipmentEntity {}

/** 企业门禁设备新增/修改表单 */
export class EquipmentFormModel {
  /** 设备管理密码（仅新增请求） */
  @FieldName('设备管理密码')
  adminPassword?: string

  /** 厂商类型（1守望门禁，2大华门禁，3科升） */
  @FieldName('厂商类型')
  producerType!: EquipmentProducerType
}

/** 企业门禁设备查询条件 */
export class EquipmentSearchModel {
  /** 门名称 */
  @FieldName('门名称')
  doorName?: string
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

const detail = getModelFromJson(res.data, EquipmentTableModel)
```

## DetailModel

- 只读详情展示的 model 继承库内 `DetailModel` 基类，配合 `GXDescriptions` / 详情弹窗使用
- 展示字段必须有 `@FieldName`，否则需在配置中手动提供 `label`

## 待库作者补充

- [ ] class 内方法 / getter 的推荐写法与禁忌
- [ ] 嵌套 model（字段类型为另一 model class）的手写规范
