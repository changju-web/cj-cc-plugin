# 黄金样本 · enterprise-info-getEnterpriseInfo

按 skill 规则，对 `api-spec/output/招商管理/paths/enterprise-info-getEnterpriseInfo.json` 跑一遍生成，对照 `apps/mini-program/src/pages-enterprise/registration/model/index.ts`（registration 现有产物）验证 skill 修了哪些 bug。

## 输入特征

- **路径**：`api-spec/output/招商管理/paths/enterprise-info-getEnterpriseInfo.json` → 切片模式
- **响应壳**：`code` / `data` / `message` / `meta` / `ok` → 剥掉，只取 `data.properties`
- **class 名来源**：`tags: ["企业管理-企业信息API"]` → `企业管理-企业信息` → `EnterpriseInfoModel`
- **业务字段**：50 个（剥壳后）

## 按 skill 规则生成的 model/index.ts

```ts
import { ClassName, FieldName } from '@gx-web/core'

type ValueOf<T> = T[keyof T]

/** 发布状态 */
export const ReleaseStatus = {
  /** 待处理 */
  pending: 0,
  /** 上架 */
  listing: 1,
  /** 下架 */
  offline: 2
} as const
export type ReleaseStatus = ValueOf<typeof ReleaseStatus>

/** 审核状态 */
export const ReviewStatus = {
  /** 待审核 */
  pending: 0,
  /** 已通过 */
  approved: 1,
  /** 不通过 */
  rejected: 2
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

  /** 认证时的企业名片id（spec 原文保留，不截断） */
  @FieldName('认证时的企业名片id')
  certificationCardId!: string

  /** 公司规模 */
  @FieldName('公司规模')
  companyScale!: number

  /** 企业默认-联系人 → 取业务主体"联系人" */
  @FieldName('联系人')
  contact!: string

  /** 企业默认-联系人邮箱 → 取业务主体"联系人邮箱" */
  @FieldName('联系人邮箱')
  contactEmail!: string

  /** 企业默认-联系人电话 → 取业务主体"联系人电话" */
  @FieldName('联系人电话')
  contactNumber!: string

  /** 企业默认-微信号 → 取业务主体"微信号" */
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

  /** 展示3D展厅（registration 误退化为 string，本 skill 还原 boolean） */
  @FieldName('展示3D展厅')
  display3d!: boolean

  /** 展示宣传图片（同上） */
  @FieldName('展示宣传图片')
  displayPictures!: boolean

  /** 展示宣传视频（同上） */
  @FieldName('展示宣传视频')
  displayVideo!: boolean

  /** 入驻日期 */
  @FieldName('入驻日期')
  entryDate!: string

  /** 成立日期 */
  @FieldName('成立日期')
  establishDate!: string

  /** 扩展字段（spec 仅 additionalProperties: {}，生 Record 不臆造子结构） */
  @FieldName('扩展字段')
  expansion!: Record<string, any>

  /** 主键 */
  @FieldName('主键')
  id!: string

  /** 所属行业（spec description: 所属行业(sys_industry表code字段)，剥技术括号） */
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

  /** gcj02纬度（registration 误退化为 string，本 skill 还原 number） */
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

  /** 发布状态（0、待处理 1、上架 2、下架）→ 抽具名 const + type */
  @FieldName('发布状态')
  releaseStatus!: ReleaseStatus

  /** 备注 */
  @FieldName('备注')
  remark!: string

  /** 审核状态（0：待审核，1:已通过，2：不通过）→ 抽具名 const + type */
  @FieldName('审核状态')
  reviewStatus!: ReviewStatus

  /** 房号 */
  @FieldName('房号')
  roomNumber!: string

  /** 状态(1 有效 0 无效) → 仅 2 个值，inline union 不抽 */
  @FieldName('状态')
  status!: 0 | 1  // 1 有效 0 无效

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

## Bug 修复对照

| 类别 | 字段 | registration 生成 | 本 skill 生成 | 修复 |
|---|---|---|---|---|
| **类型还原** | `display3d` / `displayPictures` / `displayVideo` | `string` ❌ | `boolean` | ✅ 原则 1 |
| **类型还原** | `latGcj02` / `latGz2000` / `latWgs84` / `lonGcj02` / `lonGz2000` / `lonWgs84`（6 个经纬度） | `string` ❌ | `number` | ✅ 原则 1 |
| **类型还原** | `area`（租赁面积） | `string` ❌ | `number` | ✅ 原则 1 |
| **类型还原** | `expansion`（扩展字段） | `string` ❌ | `Record<string, any>` | ✅ 原则 1 |
| **类型还原** | `certificationCardId` / `createUser` / `id` / `updateUser`（int64） | `string` ✅ | `string` | 保留（registration 唯一做对的） |
| **类型还原** | `companyScale`（int32） | `string` ❌（不一致） | `number` | ✅ 原则 1 |
| **FieldName 撞名** | `contact` / `contactEmail` / `contactNumber` / `contactWechatNo` | 4 个全 `'企业默认'` ❌ | `联系人` / `联系人邮箱` / `联系人电话` / `微信号` | ✅ 原则 2 规则 3 |
| **FieldName 截断** | `certificationCardId` | `'认证时的企业名片'` ❌（丢 id） | `'认证时的企业名片id'` | ✅ 原则 2 规则 1（不截断） |
| **枚举抽取** | `releaseStatus` | `number`（与同 class 其他 int32 退化为 string 不一致） | `ReleaseStatus` 具名 type | ✅ 原则 4 |
| **枚举抽取** | `reviewStatus` | `number` | `ReviewStatus` 具名 type | ✅ 原则 4 |
| **2 值状态** | `status`（1 有效 0 无效） | `number` | `0 \| 1` inline union | ✅ enum-extraction.md「不抽的情况」 |
| **装饰器** | class 头 | 无 `@ClassName` | `@ClassName('企业信息')` | ✅ 原则 3 |

## 统计

- **字段总数**：50（剥壳后业务字段）
- **修复类型 bug**：12 个字段（3 个 boolean + 6 个 double + 1 个 area + 1 个 int32 + 1 个 object + 1 个不一致）
- **修复 FieldName 撞名**：4 个字段
- **修复 FieldName 截断**：1 个字段
- **新增枚举**：2 个具名 const + type（`ReleaseStatus` / `ReviewStatus`）
- **保留 int64 → string**：4 个字段（registration 做对的，不动）
- **响应壳剥离**：剥掉 `code` / `data` / `message` / `meta` / `ok` 5 个非业务字段

## 跑 skill 时预期报告

```
已生成：apps/mini-program/src/pages-enterprise/registration/model/index.ts
  - 1 个 class：EnterpriseInfoModel（50 字段）
  - 2 个枚举：ReleaseStatus / ReviewStatus
  - 剥响应壳：code / message / meta / ok（非业务字段，未生进 class）

字段级增量合并（若目标已存在）：
  - 此处为新建，无已存在字段跳过

歧义点：无
```
