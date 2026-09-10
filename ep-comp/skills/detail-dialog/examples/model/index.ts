// 契约实体：统一管理形态落统一层（packages/biz/src/model/<域>/alarm.ts）
import { ClassName, FieldName } from '@gx-web/core'

@ClassName('告警记录')
export class AlarmEntity {
  @FieldName('告警代码')
  alarmCode!: string

  @FieldName('告警标题')
  alarmTitle!: string

  id!: string
}

export class AlarmDetailModel extends AlarmEntity {
  @FieldName('告警详情')
  alarmDetail!: string

  @FieldName('告警时间')
  alarmTime!: string

  @FieldName('入库时间')
  createTime!: string
}

// 页面私有模型：就近落 views/<module>/model/index.ts，继承实体只补页面字段。
// 实际工程中 AlarmEntity 来自 '@gx-web/biz'，此处同文件仅为示意。
export class AlarmQueryModel {
  @FieldName('设备SN')
  deviceSn!: string
}

export class AlarmListItemModel extends AlarmEntity {
  @FieldName('入库时间')
  createTime!: string
}
