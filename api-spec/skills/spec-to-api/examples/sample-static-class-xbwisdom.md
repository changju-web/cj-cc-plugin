# 真机样本 · 静态类形态生成（xbwisdom vehicle-focus 全量）

spec-to-api 首次在 xbwisdom 真跑的完整记录（v0.4.1 规则）。与 by-investment 样本对照：本项目 api 形态是**静态类**（非工厂），app 级 request 绑定，无薄壳步骤。tsc 验证产物相关报错 0。

## 输入与聚合

```text
5 个切片（企业模块/paths/vehicle-focus-*.json）：
  checkLicensePlate [post] saveOrUpdate [post]（body 均为 Entity 全量 + current/size 摊平噪音）
  delete/{id} [delete]  getById/{id} [get]（路径参数）
  list [post]（body = { page, queryParams }，queryParams 空 schema → 组合 C）

公共前缀 /enterprise/vehicle/focus → const URL
实体名 VehicleFocus（去 contextPath 业务段拼接，约定）
产出 apps/web/src/api/enterprise/vehicleFocus.ts（新服务域目录 enterprise/）
排序：切片无 x-order（本项目普遍）→ 字典序兜底
```

## 类型回链

```text
来源连续性：上次 spec-to-model 产物直接对号——
  VehicleFocusTableModel（list 的 records）→ ResPage 泛型
  VehicleFocusFormModel（saveOrUpdate/checkLicensePlate 的 body，12/12 覆盖，current/size 剔除后）→ data 入参
  VehicleFocusEntity（getById 语义回链，见下）
无 SearchModel：list 的 queryParams 空（spec 泛型缺陷）→ PageQuery<AnyObject>（组合 C 空洞规则）
```

## 响应裸 object 的分级处理（本项目高发）

```text
getById/{id}   响应 { type: object } 无 properties → 详情型：语义回链 Res<VehicleFocusEntity> + 报告标注
saveOrUpdate   同裸 object → 写入型：不写泛型（返回 any）+ 报告缺口（不猜 Res<boolean>）
checkLicensePlate / remove 同上写入型
```

## 产物全文

```ts
import type { VehicleFocusEntity, VehicleFocusFormModel, VehicleFocusTableModel } from '@gx-web/biz'

import request from '@/plugins/axios'

const URL = '/enterprise/vehicle/focus'

/** 重点车辆管理 */
export default class VehicleFocus {
  /** 校验重点车辆车牌号是否存在 */
  static checkLicensePlate = (data: VehicleFocusFormModel) =>
    request({
      method: 'post',
      url: `${URL}/checkLicensePlate`,
      data
    })

  /** 删除单条重点车辆数据/逻辑删除 */
  static remove = (id: string) =>
    request({
      method: 'delete',
      url: `${URL}/${id}`
    })

  /** 获取单条重点车辆数据 */
  static byId = (id: string) =>
    request<Res<VehicleFocusEntity>>({
      method: 'get',
      url: `${URL}/${id}`
    })

  /** 获取重点车辆信息列表 */
  static list = ({ pageNum, pageSize, ...queryParams }: PageQuery<AnyObject>) =>
    request<ResPage<VehicleFocusTableModel>>({
      method: 'post',
      url: `${URL}/list`,
      data: {
        page: {
          current: pageNum,
          size: pageSize
        },
        queryParams
      }
    })

  /** 保存/修改重点车辆信息 */
  static saveOrUpdate = (data: VehicleFocusFormModel) =>
    request({
      method: 'post',
      url: `${URL}/saveOrUpdate`,
      data
    })
}
```

## 本项目形态适配（探测/校准结果，已记入其 docs/api-spec.md）

| 约定点 | 取值 | 依据 |
|---|---|---|
| api 形态 | 静态类，`export default class VehicleFocus` | 存量多数派；**类名无 Api 后缀**（User/Role/Menu 9 票 vs BuildingApi 等 3 票） |
| request | `import request from '@/plugins/axios'` | app 级绑定，薄壳步骤跳过（静态类无工厂注入概念） |
| ResPage | 全局声明直接用，不 import | 19 个存量文件零 import vs user.ts 1 个显式 import（少数派不跟随） |
| DELETE 方法名 | `remove` | **存量项目方言**（user/permission-group），非默认映射表的 delete |
| model 引用 | `from '@gx-web/biz'` | biz 包，app 侧有 import 先例 |
| 文件名 | camelCase（vehicleFocus.ts） | 存量多数派（dictType/user vs kebab 2 例） |
| index 注册 | root `api/index.ts` 追加 `export * from './enterprise/vehicleFocus'` | 逐文件列出的存量惯例 |

## PageQuery 落地（本项目此前未定义）

约定记忆原标注「spec-to-api 落地时再定」——本次在 `packages/share/src/types/global.d.ts` 补定义（对齐 by-investment 形态）：

```ts
/** 分页查询入参（平铺形态：分页字段与业务查询条件同级） */
type PageQuery<T = Record<string, any>> = {
  pageNum: number
  pageSize: number
} & T
```

依据：视图侧 `useTablePage(({ current, size }) => Xxx.list({ ...form.value, pageNum: current, pageSize: size }))` 的消费形态证明平铺契约已事实存在，缺的只是类型声明。
