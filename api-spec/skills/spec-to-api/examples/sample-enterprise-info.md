# 真机样本 · enterprise-info 全量聚合生成（by-investment）

一次完整运行的输入、推导与产物。项目：by-investment-platform-frontend（monorepo，share + web + mini-program）。

## 输入

19 个切片文件（`api-spec/output/招商管理/paths/`），`enterprise-info*.json` 全集。

聚合推导：

```text
公共前缀：/investment/enterprise/info     → const URL
实体名：EnterpriseInfo（path 业务段原样拼接，项目约定）
产出：packages/share/src/api/investment/enterprise-info.ts
app 薄壳：apps/web/src/api/investment/enterprise-info.ts
          apps/mini-program/src/api/investment/enterprise-info.ts
```

## 方法名推导（节选，全表见 references/method-naming.md）

| 切片 | method | x-order | 方法名 | 规则 |
|---|---|---|---|---|
| enterprise-info-page | get | 10 | page | 尾段原样 |
| enterprise-info-id | get | 12 | byId | 动词映射 `/{id}` |
| enterprise-info | post | 14 | insert | 动词映射资源根 |
| enterprise-info | put | 15 | update | 动词映射 |
| enterprise-info | delete | 16 | delete | 动词映射 |
| enterprise-info-simplePage | get | 32 | simplePage | 尾段原样 |
| enterprise-info-getEnterpriseApplyPage | post | 30 | getEnterpriseApplyPage | 尾段原样 |

## 类型回链结果（节选）

```text
simplePage      query 17 字段 → EnterpriseSimplePageSearchModel（指纹覆盖 1.0）
                records      → EnterpriseAndBuildingModel
saveEnterpriseApply  body    → EnterpriseApplyFormModel
getEnterpriseApplyPage  body → EnterpriseSearchModel（查询条件作 POST body）
                        resp → EnterpriseApplyReviewInfoModel
delete          ids 参数     → EnterpriseEditorFormModel['id'][]
全部命中，无缺口清单
```

## 产物：share 工厂全文

> 注意与存量手写的 4 处刻意差异（见文末对照表）。

```ts
/** 企业信息接口 */
import { AxiosRequestConfig } from 'axios'
import {
  EnterpriseApplyFormModel,
  EnterpriseApplyReviewInfoModel,
  EnterpriseSimplePageSearchModel,
  EnterpriseModel,
  EnterpriseAddFormModel,
  EnterpriseEditorFormModel,
  EnterpriseAndBuildingModel,
  EnterpriseSearchModel,
  EnterpriseAssociationFormModel,
  EnterpriseReviewFormModel,
  EnterpriseCardModel
} from '../../model'
import { groupBatchIds } from '../../utils'

const URL = '/investment/enterprise/info'

export const createEnterpriseInfoApi = (
  request: <T>(config: AxiosRequestConfig) => Promise<T>
) => ({
  page: (params: PageQuery<EnterpriseSearchModel>) =>
    request<ResPage<EnterpriseAndBuildingModel>>({
      method: 'get',
      url: `${URL}/page`,
      params: {
        ...params
      }
    }),

  byId: (id: EnterpriseApplyFormModel['id']) =>
    request<Res<EnterpriseAndBuildingModel>>({
      method: 'get',
      url: `${URL}/${id}`
    }),

  /** 查询当前登录用户的企业及企业所属楼栋信息 */
  currentUser: () =>
    request<Res<EnterpriseAndBuildingModel>>({
      method: 'get',
      url: `${URL}/currentUser`
    }),

  list: (params: EnterpriseSearchModel) =>
    request<Res<EnterpriseAndBuildingModel[]>>({
      method: 'get',
      url: `${URL}/list`,
      params: {
        ...params
      }
    }),

  insert: (data: EnterpriseAddFormModel) =>
    request<Res<boolean>>({
      method: 'post',
      url: `${URL}`,
      data
    }),

  update: (data: EnterpriseEditorFormModel) =>
    request<Res<boolean>>({
      method: 'put',
      url: `${URL}`,
      data
    }),

  delete: (ids: EnterpriseEditorFormModel['id'][]) =>
    request<Res<boolean>>({
      method: 'delete',
      url: `${URL}?${groupBatchIds(ids as string[], 'id')}`
    }),

  /** 申请企业认证 */
  saveEnterpriseApply: (data: EnterpriseApplyFormModel) =>
    request<Res<boolean>>({
      method: 'post',
      url: `${URL}/saveEnterpriseApply`,
      data
    }),

  /** 修改企业认证 */
  editEnterpriseApply: (data: EnterpriseApplyFormModel) =>
    request<Res<boolean>>({
      method: 'post',
      url: `${URL}/editEnterpriseApply`,
      data
    }),

  /** 查询企业认证审核结果 */
  getEnterpriseReview: (id: EnterpriseApplyFormModel['id']) =>
    request<Res<EnterpriseApplyReviewInfoModel>>({
      method: 'get',
      url: `${URL}/getEnterpriseReview`,
      params: {
        id
      }
    }),

  /** 简单分页查询企业管理-企业信息列表 */
  simplePage: (params: PageQuery<EnterpriseSimplePageSearchModel>) =>
    request<ResPage<EnterpriseAndBuildingModel>>({
      method: 'get',
      url: `${URL}/simplePage`,
      params: {
        ...params
      }
    }),

  /** 根据id查询企业详情（单单只有企业数据） */
  getEnterpriseInfo: (id: EnterpriseApplyFormModel['id']) =>
    request<Res<EnterpriseModel>>({
      method: 'get',
      url: `${URL}/getEnterpriseInfo`,
      params: {
        id
      }
    }),

  /** 更新发布状态 */
  updateReleaseStatus: (id: EnterpriseEditorFormModel['id']) =>
    request<Res<boolean>>({
      method: 'post',
      url: `${URL}/updateReleaseStatus`,
      params: {
        id
      }
    }),

  /** 关联企业 */
  association: (data: EnterpriseAssociationFormModel) =>
    request<Res<boolean>>({
      method: 'post',
      url: `${URL}/association`,
      data
    }),

  /** 取消关联企业 */
  cancelAssociation: (data: EnterpriseAssociationFormModel) =>
    request<Res<boolean>>({
      method: 'post',
      url: `${URL}/cancelAssociation`,
      data
    }),

  /** 园区审核企业认证-分页 */
  getEnterpriseApplyPage: (params: PageQuery<EnterpriseSearchModel>) => {
    const { pageNum, pageSize, ...data } = params

    return request<ResPage<EnterpriseApplyReviewInfoModel>>({
      method: 'post',
      url: `${URL}/getEnterpriseApplyPage`,
      data,
      params: {
        pageNum,
        pageSize
      }
    })
  },

  /** 审核企业认证 */
  enterpriseReview: (data: EnterpriseReviewFormModel) =>
    request<Res<boolean>>({
      method: 'post',
      url: `${URL}/enterpriseReview`,
      data
    }),

  /** 小程序-获取本人企业名片信息（服务人员信息、名片码、手机号、二维码内容） */
  getEnterpriseCardMyself: () =>
    request<Res<EnterpriseCardModel>>({
      method: 'get',
      url: `${URL}/getEnterpriseCardMyself`
    }),

  /** 小程序-二维码内容获取企业名片信息（扫码进入他人名片，透传二维码解析出的全部参数，平铺为 query） */
  getEnterpriseCardQrCode: (q: string) =>
    request<Res<EnterpriseCardModel>>({
      method: 'get',
      url: `${URL}/getEnterpriseCardQrCode?${q}`
    })
})
```

## 产物：app 层薄壳

apps/web/src/api/investment/enterprise-info.ts：

```ts
import { createEnterpriseInfoApi } from '@gx-web/share'

import request from '@/plugins/axios'

const EnterpriseInfoApi = createEnterpriseInfoApi(request)

export default EnterpriseInfoApi
```

apps/mini-program/src/api/investment/enterprise-info.ts（仅注入点不同）：

```ts
import { createEnterpriseInfoApi } from '@gx-web/share'

import request from '@/service'

const EnterpriseInfoApi = createEnterpriseInfoApi(request)

export default EnterpriseInfoApi
```

## 与存量手写的刻意差异（4 处，增量场景则全保旧）

| # | 存量手写 | 生成版 | 依据 |
|---|---|---|---|
| 1 | `simplePage`/`page`/`list` 带 `pageOrder: 'update_time desc'` | 不生成 | 不编造原则：spec 无取值语义 |
| 2 | `getEnterpriseInfo` 用 `` url: `...?id=${id}` `` 拼接 | `params: { id }` | 统一 params 规则 |
| 3 | `updateReleaseStatus` 用 query 拼接 | `params: { id }` | 同上 |
| 4 | `getEnterpriseApplyPage` 的 params 带 `countTotal: true` + `pageOrder` | 不生成 | 同 1 |

`getEnterpriseCardQrCode` 的 `` ?${q} `` 拼接**保留**：q 是透传的已序列化 query 串（见 request-shaping.md 形态 2 透传特例），不是结构化参数。

## 报告要点（本次运行应收尾的话术）

- 产出 3 个文件（share 工厂 19 方法 + 2 个 app 薄壳），约定来源：docs/api-spec.md（api 侧条目本次补齐）
- RESTful 映射命中 4 个方法（byId/insert/update/delete）
- 类型回链 11 个 class 全部命中，无缺口
- 提醒：page/list/simplePage/getEnterpriseApplyPage 的排序与计数字段默认值需人工补（pageOrder/countTotal）
- 存量偏差：若目标文件已存在（本样本是全量首生成，无偏差）
