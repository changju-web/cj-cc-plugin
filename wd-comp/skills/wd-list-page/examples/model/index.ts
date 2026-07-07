import { ClassName, Default, FieldName } from '@gx-web/core'

@ClassName('人员查询条件')
export class PersonPageQuery {
  @FieldName('关键词')
  keyword!: string

  @Default(() => [])
  @FieldName('状态')
  status!: string[]
}

@ClassName('人员列表项')
export class PersonListItem {
  id!: string

  @FieldName('姓名')
  name!: string

  @FieldName('手机号')
  phone!: string
}
