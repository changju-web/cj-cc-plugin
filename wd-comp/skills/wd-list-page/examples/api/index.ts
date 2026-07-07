import request from '@/service'
import type { PersonListItem, PersonPageQuery } from '../model'

const URL = '/module-wechat/person'

export const loadPersonPage = (data: QueryParams<PersonPageQuery>) => {
  return request<ResPage<PersonListItem>>({
    method: 'post',
    url: `${URL}/query`,
    data
  })
}
