# 格式对齐样本 · enterprise-info-getEnterpriseInfo

按 SKILL.md 全部规则（含 3 条格式约定）跑 `enterprise-info-getEnterpriseInfo.json`，产出完整的 `EnterpriseInfoModel`。**不省略字段**，展示真实规模下的空行 + JSDoc + 修饰符 + 枚举实际形态。

## 输入

- 切片：`api-spec/output/招商管理/paths/enterprise-info-getEnterpriseInfo.json`
- 形态：A（详情查询，GET，响应 data 是对象）
- 角色：基础实体 → `EnterpriseInfoModel`
- 修饰符：Model 角色 → 全 `!:`

## 产出：packages/share/src/model/investment/enterprise-info.ts（本接口部分）

```ts
import { ClassName, FieldName } from '@gx-web/core'

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
  /** 企业地址 */
  @FieldName('企业地址')
  address!: string

  /** 详细地址 */
  @FieldName('详细地址')
  addressDetail!: string

  /** 公司地址前往指引 */
  @FieldName('公司地址前往指引')
  addressGuidelines!: string

  /** 租赁面积 */
  @FieldName('租赁面积')
  area!: number

  /** 营业时间 */
  @FieldName('营业时间')
  businessHours!: string

  /** 营业执照 */
  @FieldName('营业执照')
  businessLicense!: string

  /** 认证时的企业名片id */
  @FieldName('认证时的企业名片id')
  certificationCardId!: string

  /** 公司规模 */
  @FieldName('公司规模')
  companyScale!: number

  /** 企业默认-联系人 */
  @FieldName('联系人')
  contact!: string

  /** 企业默认-联系人邮箱 */
  @FieldName('联系人邮箱')
  contactEmail!: string

  /** 企业默认-联系人电话 */
  @FieldName('联系人电话')
  contactNumber!: string

  /** 企业默认-微信号 */
  @FieldName('微信号')
  contactWechatNo!: string

  /** 封面 */
  @FieldName('封面')
  cover!: string

  /** 创建时间 */
  @FieldName('创建时间')
  createTime!: string

  /** 创建人 */
  @FieldName('创建人')
  createUser!: string

  /** 展示3D展厅 */
  @FieldName('展示3D展厅')
  display3d!: boolean

  /** 展示宣传图片 */
  @FieldName('展示宣传图片')
  displayPictures!: boolean

  /** 展示宣传视频 */
  @FieldName('展示宣传视频')
  displayVideo!: boolean

  /** 入驻日期 */
  @FieldName('入驻日期')
  entryDate!: string

  /** 成立日期 */
  @FieldName('成立日期')
  establishDate!: string

  /** 扩展字段 */
  @FieldName('扩展字段')
  expansion!: Record<string, any>

  /** 主键 */
  @FieldName('主键')
  id!: string

  /** 所属行业(sys_industry表code字段) */
  @FieldName('所属行业')
  industryCode!: string

  /** 所属行业名称 */
  @FieldName('所属行业名称')
  industryName!: string

  /** 企业简介 */
  @FieldName('企业简介')
  introduction!: string

  /** 是否已删除 */
  @FieldName('是否已删除')
  isDeleted!: string

  /** gcj02纬度 */
  @FieldName('gcj02纬度')
  latGcj02!: number

  /** GZ2000纬度 */
  @FieldName('GZ2000纬度')
  latGz2000!: number

  /** WGS84纬度 */
  @FieldName('WGS84纬度')
  latWgs84!: number

  /** 法定代表人 */
  @FieldName('法定代表人')
  legalRepresentative!: string

  /** 企业LOGO */
  @FieldName('企业LOGO')
  logo!: string

  /** gcj02经度 */
  @FieldName('gcj02经度')
  lonGcj02!: number

  /** GZ2000经度 */
  @FieldName('GZ2000经度')
  lonGz2000!: number

  /** WGS84经度 */
  @FieldName('WGS84经度')
  lonWgs84!: number

  /** 主营业务 */
  @FieldName('主营业务')
  mainBusiness!: string

  /** 企业名称 */
  @FieldName('企业名称')
  name!: string

  /** 注册资本 */
  @FieldName('注册资本')
  registeredCapital!: string

  /** 发布状态（0、待处理 1、上架 2、下架） */
  @FieldName('发布状态')
  releaseStatus!: ReleaseStatus

  /** 备注 */
  @FieldName('备注')
  remark!: string

  /** 审核状态(0：待审核，1:已通过，2：不通过) */
  @FieldName('审核状态')
  reviewStatus!: ReviewStatus

  /** 房号 */
  @FieldName('房号')
  roomNumber!: string

  /** 状态(1 有效 0 无效) */
  @FieldName('状态')
  status!: 0 | 1

  /** 企业标签 */
  @FieldName('企业标签')
  tags!: string

  /** 统一社会信用代码 */
  @FieldName('统一社会信用代码')
  unifiedSocialCreditIdentifier!: string

  /** 更新时间 */
  @FieldName('更新时间')
  updateTime!: string

  /** 更新人 */
  @FieldName('更新人')
  updateUser!: string
}
```

## 3 条格式约定的体现

### 1. 字段间空行 ✅

每个字段块（JSDoc + `@FieldName` + 声明）之间空一行，最后一个字段（`updateUser`）后直接 `}`，不空行。

### 2. JSDoc 注释 ✅

每个字段上方都有 `/** ... */`，取自 spec description 全文。关键示例（JSDoc 与 FieldName 不同的字段）：

```ts
/** 认证时的企业名片id */              ← JSDoc 保留 spec 全文（含"id"）
@FieldName('认证时的企业名片id')        ← FieldName 也保留全文（这里没技术括号可剥）
certificationCardId!: string

/** 所属行业(sys_industry表code字段) */  ← JSDoc 保留技术参数（字典表引用）
@FieldName('所属行业')                  ← FieldName 剥掉技术括号
industryCode!: string

/** 发布状态（0、待处理 1、上架 2、下架） */ ← JSDoc 保留枚举值原文
@FieldName('发布状态')                   ← FieldName 剥掉枚举括号
releaseStatus!: ReleaseStatus            ← 字段用枚举具名类型

/** 状态(1 有效 0 无效) */               ← JSDoc 保留
@FieldName('状态')
status!: 0 | 1                           ← 2 值枚举 inline union
```

### 3. 修饰符 `!:` ✅

`EnterpriseInfoModel` 是基础实体角色（后端返回数据），全字段 `!:`。

## 对照 share 现状的差异

| 字段 | share 现状（EnterpriseModel） | 本样本（EnterpriseInfoModel） | 差异类型 |
|---|---|---|---|
| class 名 | `EnterpriseModel` | `EnterpriseInfoModel` | 命名新标准（原样拼接） |
| `releaseStatus` | `number` | `ReleaseStatus` | 枚举进 model |
| `reviewStatus` | `number` | `ReviewStatus` | 枚举进 model |
| `status` | `number` | `0 \| 1` | 2 值 inline union |
| `contact` 系列 FieldName | `'企业默认-联系人'` 等（带前缀） | `'联系人'` 等（取业务主体） | FieldName 清洗规则 |
| JSDoc | share 现状的 EnterpriseModel **没有 JSDoc**（只有 @FieldName） | 每字段有 JSDoc | 补齐注释 |
| 字段间空行 | 有 | 有 | 一致 ✅ |
| 修饰符 | `!:` | `!:` | 一致 ✅ |

## 注意：share 现状的 EnterpriseModel 缺 JSDoc

查证发现 `packages/share/src/model/investment/enterprise-info.ts` 的 `EnterpriseModel`（基础实体）字段**只有 `@FieldName`，没有 JSDoc**——但同文件的 `ClientEntity`（system 域）每个字段都有 JSDoc。share 层自身在这点上不统一。

本样本按 `ClientEntity` 的风格（有 JSDoc）生成，因为：
- JSDoc 保留 spec 全文（含技术参数），`@FieldName` 是清洗后中文名，两者职责不同，都该有
- IDE hover 时 JSDoc 提供完整说明，`@FieldName` 服务于表单/列表 label
- 缺 JSDoc 会丢失 `(sys_industry表code字段)` 这类字典引用提示

若你希望对齐 `EnterpriseModel` 的"无 JSDoc"风格（同实体文件内一致），告诉我，我调整规则为"JSDoc 可选，仅当 JSDoc 与 FieldName 不同时才加"。
