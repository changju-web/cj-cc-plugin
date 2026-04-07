import useAxios from '@base-lib/hooks/core/useAxios'
import type { AlarmVO } from '../model'

const request = useAxios()

export const loadPage = (params) => {
  return request.get<ResPage<AlarmVO>>({
    url: `/zl-business/alarm/record/page`,
    params: {
      ...params,
      pageOrder: 'create_time desc'
    }
  })
}
