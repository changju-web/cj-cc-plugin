import { FieldName } from '@gx-web/core'

export class AlarmVO {
  /** 告警代码 */
  @FieldName('告警代码')
  alarmCode!: string

  /** 告警详情 */
  @FieldName('告警详情')
  alarmDetail!: string

  /** 告警时间 */
  @FieldName('告警时间')
  alarmTime!: string

  /** 告警标题 */
  @FieldName('告警标题')
  alarmTitle!: string

  /** 入库时间 */
  @FieldName('入库时间')
  createTime!: string

  /** 设备SN */
  @FieldName('设备SN')
  deviceSn!: string

  /** 主键ID */
  @FieldName('主键ID')
  id!: string

  /** 场所ID */
  @FieldName('场所ID')
  placeId!: string
}
