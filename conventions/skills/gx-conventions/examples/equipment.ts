import { ClassName, FieldName } from '@gx-web/core'
import { ValueOf } from '../..'

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

/** 厂商类型 */
export const EquipmentProducerType = {
  /** 守望门禁 */
  shouwang: 1,
  /** 大华门禁 */
  dahua: 2,
  /** 科升 */
  kesheng: 3
} as const
export type EquipmentProducerType = ValueOf<typeof EquipmentProducerType>

/** 核验模式 */
export const EquipmentVerificationMode = {
  /** 本地核验 */
  local: 'local',
  /** 在线核验 */
  online: 'online'
} as const
export type EquipmentVerificationMode = ValueOf<typeof EquipmentVerificationMode>

@ClassName('企业门禁设备')
export class EquipmentEntity {
  /** 绑定状态（1已绑定，0已解绑） */
  @FieldName('绑定状态')
  bindingState!: 1 | 0 | ''

  /** 品牌ID */
  @FieldName('品牌ID')
  brandId!: string

  /** 创建人 */
  @FieldName('创建人')
  createdBy!: string

  /** 创建时间 */
  @FieldName('创建时间')
  createdTime!: string

  /** 门别名 */
  @FieldName('门别名')
  doorAlias!: string

  /** 门名称 */
  @FieldName('门名称')
  doorName!: string

  /** 门禁状态（1常开，0常闭，2正常） */
  @FieldName('门禁状态')
  doorState!: EquipmentDoorState

  /** 企业主键 */
  @FieldName('企业主键')
  enterpriseId!: string

  /** 主键 */
  @FieldName('主键')
  id!: string

  /** 纬度（WGS-84） */
  @FieldName('纬度（WGS-84）')
  lat84!: number

  /** 纬度（BD09） */
  @FieldName('纬度（BD09）')
  latBd09!: number

  /** 纬度（GZ） */
  @FieldName('纬度（GZ）')
  latGz!: number

  /** 纬度（GCJ-02） */
  @FieldName('纬度（GCJ-02）')
  latitudes!: number

  /** 经度（WGS-84） */
  @FieldName('经度（WGS-84）')
  lon84!: number

  /** 经度（BD09） */
  @FieldName('经度（BD09）')
  lonBd09!: number

  /** 经度（GZ） */
  @FieldName('经度（GZ）')
  lonGz!: number

  /** 经度（GCJ-02） */
  @FieldName('经度（GCJ-02）')
  longitudes!: number

  /** 型号ID */
  @FieldName('型号ID')
  modelId!: string

  /** 在线状态（1在线，0离线） */
  @FieldName('在线状态')
  onlineStatus!: 1 | 0 | ''

  /** 厂商类型（1守望门禁，2大华门禁，3科升） */
  @FieldName('厂商类型')
  producerType!: EquipmentProducerType

  /** 设备SN */
  @FieldName('设备SN')
  sn!: string

  /** 有效状态（1启用，0禁用） */
  @FieldName('有效状态')
  status!: 1 | 0 | ''

  /** 更新人 */
  @FieldName('更新人')
  updatedBy!: string

  /** 更新时间 */
  @FieldName('更新时间')
  updatedTime!: string

  /** 核验模式：local本地核验，online在线核验 */
  @FieldName('核验模式')
  verificationMode!: EquipmentVerificationMode
}

/** 企业门禁设备列表项 */
export class EquipmentTableModel extends EquipmentEntity {}

/** 企业门禁设备新增/修改表单 */
export class EquipmentFormModel {
  /** 设备管理密码（仅新增请求） */
  @FieldName('设备管理密码')
  adminPassword?: string

  /** 品牌ID */
  @FieldName('品牌ID')
  brandId?: string

  /** 门别名 */
  @FieldName('门别名')
  doorAlias?: string

  /** 门名称 */
  @FieldName('门名称')
  doorName!: string

  /** 企业主键 */
  @FieldName('企业主键')
  enterpriseId!: string

  /** 关联权限组主键列表（编辑不传不修改，传空列表清空关联） */
  @FieldName('关联权限组')
  groupIds?: string[]

  /** 主键 */
  @FieldName('主键')
  id?: string

  /** 纬度（WGS-84） */
  @FieldName('纬度（WGS-84）')
  lat84?: number

  /** 纬度（BD09） */
  @FieldName('纬度（BD09）')
  latBd09?: number

  /** 纬度（GZ） */
  @FieldName('纬度（GZ）')
  latGz?: number

  /** 纬度（GCJ-02） */
  @FieldName('纬度（GCJ-02）')
  latitudes?: number

  /** 经度（WGS-84） */
  @FieldName('经度（WGS-84）')
  lon84?: number

  /** 经度（BD09） */
  @FieldName('经度（BD09）')
  lonBd09?: number

  /** 经度（GZ） */
  @FieldName('经度（GZ）')
  lonGz?: number

  /** 经度（GCJ-02） */
  @FieldName('经度（GCJ-02）')
  longitudes?: number

  /** 型号ID */
  @FieldName('型号ID')
  modelId?: string

  /** 厂商类型（1守望门禁，2大华门禁，3科升） */
  @FieldName('厂商类型')
  producerType!: EquipmentProducerType

  /** 设备SN */
  @FieldName('设备SN')
  sn!: string

  /** 核验模式：local本地核验，online在线核验 */
  @FieldName('核验模式')
  verificationMode?: EquipmentVerificationMode
}

/** 企业门禁设备查询条件 */
export class EquipmentSearchModel {
  /** 绑定状态（1已绑定，0已解绑） */
  @FieldName('绑定状态')
  bindingState?: 1 | 0 | ''

  /** 门名称 */
  @FieldName('门名称')
  doorName?: string

  /** 在线状态（1在线，0离线） */
  @FieldName('在线状态')
  onlineStatus?: 1 | 0 | ''

  /** 厂商类型（1守望门禁，2大华门禁，3科升） */
  @FieldName('厂商类型')
  producerType?: EquipmentProducerType

  /** 设备SN */
  @FieldName('设备SN')
  sn?: string

  /** 有效状态（1启用，0禁用） */
  @FieldName('有效状态')
  status?: 1 | 0 | ''
}
