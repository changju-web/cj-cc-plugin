import { ClassName, FieldName } from '@gx-web/core'

@ClassName('人员表单')
export class PersonFormModel {
  id?: string

  @FieldName('姓名')
  name!: string

  @FieldName('手机号')
  phone!: string
}
