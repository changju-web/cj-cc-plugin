// 统一管理形态：契约 API 落统一层（packages/biz/src/api/<域>/alarm.ts），
// app 侧只留一行消费文件（apps/<app>/src/api/<域>/alarm.ts）：
//   import { createAlarmApi } from '@gx-web/biz'
//   import request from '@/plugins/axios'
//   export const AlarmApi = createAlarmApi(request)
import type { ApiRequest, Res, ResPage } from '../../../types'
import type { AlarmAuditModel, AlarmEntity, AlarmFormModel, AlarmQueryModel } from '../../model'

/** 告警记录 */
export const createAlarmApi = (request: ApiRequest) => ({
  /** 获取分页 */
  page: (params: AlarmQueryModel & { pageNum: number; pageSize: number }) =>
    request<ResPage<AlarmEntity>>({
      method: 'get',
      url: `/zl-business/alarm/record/page`,
      params
    }),

  /** 新增 */
  add: (data: AlarmFormModel) =>
    request<Res<AlarmEntity>>({
      method: 'post',
      url: `/zl-business/alarm/record`,
      data
    }),

  /** 编辑 */
  update: (data: AlarmFormModel) =>
    request<Res<AlarmEntity>>({
      method: 'put',
      url: `/zl-business/alarm/record`,
      data
    }),

  /** 审核 */
  audit: (data: AlarmAuditModel) =>
    request<Res<unknown>>({
      method: 'put',
      url: `/zl-business/alarm/record/audit`,
      data
    })
})
