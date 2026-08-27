import { Status, YseNo } from '@gx-web/biz'
import { ClassName, FieldName } from '@gx-web/core'

@ClassName('用户')
export class UserEntity {
  /** 头像 */
  @FieldName('头像')
  avatar!: string

  /** 登录IP */
  @FieldName('登录IP')
  loginIp!: string

  /** 邮箱 */
  @FieldName('邮箱')
  email!: string

  /** 性别 */
  @FieldName('性别')
  gender!: string

  /** 昵称 */
  @FieldName('昵称')
  nickname!: string

  /** 密码 */
  @FieldName('密码')
  password!: string

  /** 手机号码 */
  @FieldName('手机号码')
  phone!: string

  /** 真实姓名 */
  @FieldName('真实姓名')
  realName!: string

  /** 用户类型 */
  @FieldName('用户类型')
  userType!: string

  /** 用户名 */
  @FieldName('用户名')
  username!: string

  /** 状态 */
  @FieldName('状态')
  status!: Status

  /** 是否删除 */
  @FieldName('是否删除')
  isDelete!: YseNo
}

/** 用户查询参数模型 */
export class UserSearchModel extends UserEntity {
  @FieldName('由当前用户创建')
  isCreateByLoginUser!: string
}

/** 用户列表展示模型 */
export class UserTableModel extends UserEntity {
  /** 主键 */
  @FieldName('主键')
  id!: string

  @FieldName('由当前用户创建')
  createUser!: string

  @FieldName('创建时间')
  createTime!: string

  @FieldName('更新时间')
  updateTime!: string
}

/** 用户新增/编辑表单模型 */
export class UserFormModel {
  /** 主键 */
  @FieldName('主键')
  id!: string

  /** 用户名 */
  @FieldName('用户名')
  username!: string

  /** 密码 */
  @FieldName('密码')
  password!: string

  /** 手机号码 */
  @FieldName('手机号码')
  phone!: string

  /** 关联角色ID列表 */
  @FieldName('角色')
  userRoles!: string[]

  /** 昵称 */
  @FieldName('昵称')
  nickname!: string

  /** 真实姓名 */
  @FieldName('真实姓名')
  realName!: string

  /** 用户类型 */
  @FieldName('用户类型')
  userType!: string

  /** 性别 */
  @FieldName('性别')
  gender!: string

  /** 关联部门ID列表 */
  @FieldName('部门')
  userDepts!: string[]

  /** 邮箱 */
  @FieldName('邮箱')
  email!: string

  /** 状态 */
  @FieldName('状态')
  status!: Status
}

export class UserAreaModel {
  /** 主键 */
  @FieldName('主键')
  id!: string

  /** 用户名 */
  @FieldName('用户名')
  username!: string

  /** 密码 */
  @FieldName('密码')
  password!: string

  /** 手机号码 */
  @FieldName('手机号码')
  phone!: string

  /** 关联角色ID列表 */
  @FieldName('角色')
  userRoles!: string[]

  /** 昵称 */
  @FieldName('昵称')
  nickname!: string

  /** 真实姓名 */
  @FieldName('真实姓名')
  realName!: string

  /** 用户类型 */
  @FieldName('用户类型')
  userType!: string

  /** 性别 */
  @FieldName('性别')
  gender!: string

  /** 关联部门ID列表 */
  @FieldName('部门')
  userDepts!: string[]

  /** 邮箱 */
  @FieldName('邮箱')
  email!: string

  /** 状态 */
  @FieldName('状态')
  status!: Status
}
