import { ClassName, FieldName } from '@gx-web/core'

@ClassName('人员详情')
export class PersonDetail {
  id!: string

  @FieldName('姓名')
  name!: string

  @FieldName('手机号')
  phone!: string
}
