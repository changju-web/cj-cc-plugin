import request from '@/service'
import type { PersonFormModel } from '../model'

const URL = '/module-wechat/person'

export const addPerson = (data: PersonFormModel) => {
  return request({
    method: 'post',
    url: `${URL}/add`,
    data
  })
}

export const updatePerson = (data: PersonFormModel) => {
  return request({
    method: 'post',
    url: `${URL}/update`,
    data
  })
}
