// 统一管理形态：契约 API 落统一层（packages/biz/src/api/<域>/alarm.ts），
// app 侧只留一行消费文件（apps/<app>/src/api/<域>/alarm.ts）：
//   import { createAlarmApi } from '@gx-web/biz'
//   import request from '@/plugins/axios'
//   export const AlarmApi = createAlarmApi(request)
import type { ApiRequest, Res, ResPage } from '../../../types'
import type { AlarmDetailModel, AlarmEntity, AlarmQueryModel } from '../../model'

/** 告警记录 */
export const createAlarmApi = (request: ApiRequest) => ({
  /** 获取分页 */
  page: (params: AlarmQueryModel & { pageNum: number; pageSize: number }) =>
    request<ResPage<AlarmEntity>>({
      method: 'get',
      url: `/zl-business/alarm/record/page`,
      params
    }),

  /** 根据 id 查看详情 */
  byId: (id: string) =>
    request<Res<AlarmDetailModel>>({
      method: 'get',
      url: `/zl-business/alarm/record/${id}`
    })
})
