# core 篇 · @gx-web/core 日常用法约定

覆盖 `@gx-web/core` 的 model class 手写规范。OpenAPI 批量生成 model 的场景走 `api-spec:spec-to-model`（其 FieldName 清洗规则书更细），本篇只管日常手写与修改。

规范真机样本（随插件分发，提炼自 xbwisdom equipment.ts）：[../examples/equipment.ts](../examples/equipment.ts)。

## model class 形态

- 业务实体用 `class` 而非 `interface`：装饰器元数据与方法依赖 class 才能保留
- class 上方写中文注释 + `@ClassName('中文名')` 装饰器；**每个字段上方必写 `/** 中文说明 */` 注释**
- 字段断言 `!:` / `?:` 逐字段按契约语义判定（见「断言语义」），不按层一刀切
- **model 只写字段 + 装饰器**：不放方法 / getter / 行为；派生展示逻辑（合并字段、派生布尔）放组件层
- `BaseModel` / `BaseEntity` 为旧版遗弃基类，新 model 不继承（其实例化能力由独立函数 `getModelFromJson` 承担）

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

## 断言语义（`!:` / `?:`）

统一规则：**`!:` = 必有键，`?:` = 可整体省略**。判定准绳：消费者拿到实例后能否不判空直接用（Entity 对后端响应），或提交时是否必带该键（FormModel / SearchModel 对请求契约）。

- **Entity**：`!:` = 后端必返；条件性返回的字段（扩展字段、依赖状态的字段）用 `?:`
- **FormModel**：`!:` = 提交必传；`?:` = 可不传（"仅新增请求"、"编辑不传不修改"）
- **SearchModel**：`?:` = 不传即不过滤；必填查询条件（如分页参数）用 `!:`

**空值显式类型化，不用 `?:` 表达空**：字段"存在但为空"用显式空值纳入联合类型（`bindingState!: 1 | 0 | ''`），而不是标 `?:`。这样"不传"（键省略）与"传空"（显式空值）语义可区分——SearchModel 区分「不过滤」与「筛选空」，FormModel 区分「不改字段」与「清空字段」。

## 复杂类型默认值

数组 / Record / 字典 / 嵌套 model 集合字段：**类属性初始化器给空容器默认值，取代 `!:`**：

```ts
/** 子列表 */
@FieldName('子列表')
children: OpenAccessGroupEquipmentChildModel[] = []

/** 权限组门禁设备（地址ID → 设备ID） */
@FieldName('权限组门禁设备')
equipmentIdMap: Record<string, string> = {}
```

- 比断言语义更强的保证：`!:` 是「相信我必有值」，初始化器是「构造时必有值」，编译器与运行时双重认可，类型不含 undefined，消费端免判空
- `getModelFromJson` 内建默认值机制（`Object.assign(instance, defaultFieldMap, json)`）：后端有值覆盖、缺字段保默认值，`row.children.map()` 永不崩；初始化器每次实例化独立求值，`= []` 无引用共享
- 前端初始态免手工拼装：`useStateRef(() => getModelFromJson(XxxFormModel))`（见「getModelFromJson」用法 2）
- 范围：仅复杂类型；标量维持断言语义（复杂类型方法调用会崩，标量读到 undefined 不崩）

**单值嵌套对象（字段类型为另一 model class，非集合）**两种写法皆可：

```ts
// 1. 类字段初始化器（推荐：每次构造重新求值，引用安全，纯 new 也生效）
subForm: SubFormModel = getModelFromJson(SubFormModel)

// 2. @Default 工厂形态（默认值元数据化，仅 fromJson / getModelFromJson 路径生效）
@Default(() => getModelFromJson(SubFormModel))
subForm!: SubFormModel
```

**`@Default` 装饰器（默认值元数据机制）**：

- `@Default(value | factory)`：factory 形态在每次 fromJson / getModelFromJson 实例化时独立执行；**禁止立即执行写法 `@Default(getModelFromJson(X))`**——求值一次、所有实例共享同一引用
- 优先级：`@Default` > 类字段初始化器 > 无默认值

真机样本：[../examples/open-access-group.ts](../examples/open-access-group.ts) 的 `children` / `equipmentList` / `equipmentIdMap`（存量未带默认值，渐进改造）。

## model 分层

同一实体按用途分四层，同文件内从上到下：枚举三件套 → Entity → TableModel → FormModel → SearchModel。

| 层 | 形态 | 断言常见分布（规则见「断言语义」） |
| --- | --- | --- |
| `XxxEntity` | 后端实体全字段，`@ClassName` 标注 | 多为 `!:`（必返） |
| `XxxTableModel` | `extends XxxEntity {}` 空继承，列表项 | 随 Entity |
| `XxxFormModel` | 新增 / 编辑表单字段 | 必传 `!:`、可省 `?:` |
| `XxxSearchModel` | 查询条件字段 | 多为 `?:`（可选筛选） |

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

签名 `getModelFromJson(Model, 覆盖数据?)`：第一参数是 model 构造器，第二参数**可选**，为默认值覆盖（通常传接口 json，有值覆盖、缺字段保 class 默认值）。两个用法：

```ts
import { getModelFromJson } from '@gx-web/core'

// 1. 接口数据 → class 实例（反序列化）
const detail = getModelFromJson(EquipmentTableModel, res.data)

// 2. 不传第二参 = 带默认值的实例工厂（表单 / 查询初始态）
const [form, setForm, resetForm] = useStateRef(() => getModelFromJson(EquipmentFormModel))
```

- 禁止 `Object.assign(new Model(), json)` / 展开复制——丢装饰器元数据，UI 文案链路失效
- 与「复杂类型默认值」配合：初始态工厂自动带上 `= []` / `= {}` 默认值，免手工拼容器

## 详情 model（命名模式，非库基类）

- 只读详情弹窗的 model 命名 `XxxDetailModel`（如 `AlarmDetailModel`），就是普通 model class + `@FieldName`，配合 ep-comp 的 `generateDescriptionsItems` 使用——库内**没有**名为 DetailModel 的导出基类
- 细则与生成流程见 `ep-comp:detail-dialog`
