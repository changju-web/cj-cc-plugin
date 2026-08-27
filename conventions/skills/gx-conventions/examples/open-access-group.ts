import { ClassName, FieldName } from '@gx-web/core'
import { ValueOf } from '../..'

/** 门类型 */
export const OpenAccessGroupDoorLevel = {
  /** 单元门禁 */
  unit: 1,
  /** 小区门禁 */
  residential: 2,
  /** 楼栋门禁 */
  building: 5,
  /** 房屋套间门禁 */
  room: 6
} as const
export type OpenAccessGroupDoorLevel = ValueOf<typeof OpenAccessGroupDoorLevel>

@ClassName('门禁设备子节点')
export class OpenAccessGroupEquipmentChildModel {
  /** 门牌主键 */
  @FieldName('门牌主键')
  addressId!: string

  /** 楼栋主键 */
  @FieldName('楼栋主键')
  buildingId!: string

  /** 是否有子节点 */
  @FieldName('是否有子节点')
  hasChildren!: boolean

  /** 地址ID */
  @FieldName('地址ID')
  id!: string

  /** 门类型 */
  @FieldName('门类型')
  level!: number

  /** 地址父级ID */
  @FieldName('地址父级ID')
  parentId!: string

  /** 单元主键 */
  @FieldName('单元主键')
  unitId!: string
}

@ClassName('门禁设备')
export class OpenAccessGroupEquipmentModel {
  /** 门牌主键 */
  @FieldName('门牌主键')
  addressId!: string

  /** 楼栋主键 */
  @FieldName('楼栋主键')
  buildingId!: string

  /** 子列表 */
  @FieldName('子列表')
  children!: OpenAccessGroupEquipmentChildModel[]

  /** 门名称 */
  @FieldName('门名称')
  doorName!: string

  /** 设备ID */
  @FieldName('设备ID')
  equipmentId!: string

  /** 是否有子节点 */
  @FieldName('是否有子节点')
  hasChildren!: boolean

  /** 地址ID */
  @FieldName('地址ID')
  id!: string

  /** 门类型（1单元门禁；2小区门禁；5楼栋门禁 6房屋套间门禁 ） */
  @FieldName('门类型')
  level!: OpenAccessGroupDoorLevel

  /** 安装位置 */
  @FieldName('安装位置')
  location!: string

  /** 地址父级ID */
  @FieldName('地址父级ID')
  parentId!: string

  /** 房屋主键 */
  @FieldName('房屋主键')
  roomId!: string

  /** 设备SN */
  @FieldName('设备SN')
  sn!: string

  /** 单元主键 */
  @FieldName('单元主键')
  unitId!: string
}

@ClassName('门禁设备树设备')
export class OpenAccessGroupTreeEquipmentModel {
  /** 门名称 */
  @FieldName('门名称')
  doorName!: string

  /** 设备ID */
  @FieldName('设备ID')
  equipmentId!: string

  /** 门类型（1单元门禁；2小区门禁；5楼栋门禁 6房屋套间门禁 ） */
  @FieldName('门类型')
  level!: OpenAccessGroupDoorLevel

  /** 设备SN */
  @FieldName('设备SN')
  sn!: string
}

@ClassName('门禁设备树')
export class OpenAccessGroupTreeModel {
  /** 门牌主键 */
  @FieldName('门牌主键')
  addressId!: string

  /** 门牌名称 */
  @FieldName('门牌名称')
  addressName!: string

  /** 楼栋主键 */
  @FieldName('楼栋主键')
  buildingId!: string

  /** 楼栋名称 */
  @FieldName('楼栋名称')
  buildingName!: string

  /** 子列表 */
  @FieldName('子列表')
  children!: OpenAccessGroupEquipmentChildModel[]

  /** 门禁设备列表 */
  @FieldName('门禁设备列表')
  equipmentList!: OpenAccessGroupTreeEquipmentModel[]

  /** 是否有子节点 */
  @FieldName('是否有子节点')
  hasChildren!: boolean

  /** 地址ID */
  @FieldName('地址ID')
  id!: string

  /** 门类型 */
  @FieldName('门类型')
  level!: number

  /** 地址父级ID */
  @FieldName('地址父级ID')
  parentId!: string

  /** 小区名称 */
  @FieldName('小区名称')
  residentialName!: string

  /** 房间名称 */
  @FieldName('房间名称')
  room!: string

  /** 房屋主键 */
  @FieldName('房屋主键')
  roomId!: string

  /** 单元主键 */
  @FieldName('单元主键')
  unitId!: string

  /** 单元名称 */
  @FieldName('单元名称')
  unitName!: string
}

@ClassName('门禁设备分组')
export class OpenAccessGroupEquipmentGroupModel {
  /** 门禁设备列表 */
  @FieldName('门禁设备列表')
  list!: OpenAccessGroupEquipmentModel[]

  /** 小区id */
  @FieldName('小区id')
  residentialId!: string

  /** 小区名称 */
  @FieldName('小区名称')
  residentialName!: string
}

@ClassName('开门权限组')
export class OpenAccessGroupEntity {
  /** 企业id */
  @FieldName('企业id')
  businessId!: string

  /** 创建人 */
  @FieldName('创建人')
  createdBy!: string

  /** 创建时间 */
  @FieldName('创建时间')
  createdTime!: string

  /** 主键id */
  @FieldName('主键id')
  id!: string

  /** 是否为企业访客门禁组(1是 0否) */
  @FieldName('是否为企业访客门禁组')
  isVisitor!: 1 | 0 | ''

  /** 上次下发时间 */
  @FieldName('上次下发时间')
  lastIssuedTime!: string

  /** 开门权限组名称 */
  @FieldName('开门权限组名称')
  name!: string

  /** 状态(1 有效 0 无效) */
  @FieldName('状态')
  status!: 1 | 0 | ''

  /** 更新人 */
  @FieldName('更新人')
  updatedBy!: string

  /** 更新时间 */
  @FieldName('更新时间')
  updatedTime!: string
}

/** 开门权限组查询条件 */
export class OpenAccessGroupSearchModel {
  /** 开门权限组名称 */
  @FieldName('开门权限组名称')
  name?: string

  /** 状态(1 有效 0 无效) */
  @FieldName('状态')
  status?: number
}

/** 开门权限组新增表单 */
export class OpenAccessGroupSaveFormModel {
  /** 企业ID */
  @FieldName('企业ID')
  businessId?: string

  /** 权限组门禁设备（地址ID → 设备ID） */
  @FieldName('权限组门禁设备')
  equipmentIdMap!: Record<string, string>

  /** 权限组ID */
  @FieldName('权限组ID')
  id?: string

  /** 是否为企业访客门禁组(1是 0否) */
  @FieldName('是否为企业访客门禁组')
  isVisitor?: 1 | 0 | ''

  /** 权限组名称 */
  @FieldName('权限组名称')
  name?: string

  /** 权限组状态 */
  @FieldName('权限组状态')
  status?: number
}

/** 开门权限组更新表单 */
export class OpenAccessGroupFormModel {
  /** 企业id */
  @FieldName('企业id')
  businessId?: string

  /** 创建人 */
  @FieldName('创建人')
  createdBy?: string

  /** 创建时间 */
  @FieldName('创建时间')
  createdTime?: string

  /** 主键id */
  @FieldName('主键id')
  id?: string

  /** 是否为企业访客门禁组(1是 0否) */
  @FieldName('是否为企业访客门禁组')
  isVisitor?: 1 | 0 | ''

  /** 上次下发时间 */
  @FieldName('上次下发时间')
  lastIssuedTime?: string

  /** 开门权限组名称 */
  @FieldName('开门权限组名称')
  name?: string

  /** 状态(1 有效 0 无效) */
  @FieldName('状态')
  status?: 1 | 0 | ''

  /** 更新人 */
  @FieldName('更新人')
  updatedBy?: string

  /** 更新时间 */
  @FieldName('更新时间')
  updatedTime?: string
}
