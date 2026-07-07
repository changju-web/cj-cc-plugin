import request from '@/service'
import type { PersonDetail } from '../model'

const URL = '/module-wechat/person'

export const loadPersonDetail = (id: string) => {
  return request<Res<PersonDetail>>({
    method: 'get',
    url: `${URL}/info`,
    params: { id }
  })
}
