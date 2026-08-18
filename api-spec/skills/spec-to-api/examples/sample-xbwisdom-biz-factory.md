# 真机样本 · biz 共享包工厂 + 双 app 薄壳（xbwisdom vehicle-focus，v2 定稿）

spec-to-api 在 xbwisdom 真跑的**定稿形态**（v0.4.x 规则，经用户三轮纠偏）。与 enterprise-info 样本同为工厂模式，差异在：api 落 **biz 业务共享包**（非 share）、类型统一落位、薄壳命名导出。tsc 验证：biz exit 0，web/mini 产物相关报错 0。

## 形态决策（用户意图推翻存量多数派）

```text
探测现状：apps/web/src/api 是 13 个文件的 app 级静态类（default export、request 直连）
用户决策：这些模块属于统一后端，前端区分 apps 但对接服务相同
  → api 工厂入共享包 biz（packages/biz/src/api），各 app 注入自己的 request
  → 导出命名化（非 default），实例名 Api 结尾
  → PageQuery 等类型与 api 同包统一管理（biz/src/types/api.ts）
约定记忆标注：存量静态类为历史欠债，不再新增
```

## 产物 1：biz/src/types/api.ts（http/参数类型统一落位）

```ts
import type { AxiosRequestConfig } from 'axios'

/** 普通 响应体（与 share 全局 Res 结构同构，供 spec 生成的 api 显式 import） */
export interface Res<T> {
  code: string
  data: T
  message: string
  ok: boolean
}

/** 分页 响应体（IPage 展开形态，与 share 全局 ResPage 结构同构） */
export type ResPage<T> = Res<{
  current: number
  optimizeCountSql: boolean
  orders: any[]
  pages: number
  records: T[]
  searchCount: boolean
  size: number
  total: number
}>

/** 分页查询入参（平铺形态：分页字段与业务查询条件同级） */
export type PageQuery<T = Record<string, any>> = {
  pageNum: number
  pageSize: number
} & T

/** api 工厂的 request 注入签名（各 app 注入自己的请求实例） */
export type ApiRequest = <T>(config: AxiosRequestConfig) => Promise<T>
```

经 `types/index.ts`（`export * from './api'`）→ `src/index.ts` 挂入包出口。要点：

- **双源同构**：share 全局声明版 Res/ResPage 继续服务存量静态类（19 文件零 import），biz 版服务新生成 api；结构必须保持同构（结构类型互换无碍）
- **ApiRequest 抽出**：工厂签名统一 `(request: ApiRequest)`，不逐文件内联
- **axios 显式依赖**：biz package.json 加 `axios: catalog:`（不靠根 node_modules 隐式解析）
- **不引用 app 侧全局**：包内弱类型用 `PageQuery` 默认泛型（Record<string, any>），不用全局 AnyObject（biz 编译环境看不到）

## 产物 2：biz/src/api/enterprise/vehicleFocus.ts（工厂）

```ts
import type { ApiRequest, PageQuery, Res, ResPage } from '../../types'
import type { VehicleFocusEntity, VehicleFocusFormModel, VehicleFocusTableModel } from '../../model'

const URL = '/enterprise/vehicle/focus'

/** 重点车辆管理 */
export const createVehicleFocusApi = (request: ApiRequest) => ({
  /** 校验重点车辆车牌号是否存在 */
  checkLicensePlate: (data: VehicleFocusFormModel) =>
    request({
      method: 'post',
      url: `${URL}/checkLicensePlate`,
      data
    }),

  /** 删除单条重点车辆数据/逻辑删除 */
  remove: (id: string) =>
    request({
      method: 'delete',
      url: `${URL}/${id}`
    }),

  /** 获取单条重点车辆数据 */
  byId: (id: string) =>
    request<Res<VehicleFocusEntity>>({
      method: 'get',
      url: `${URL}/${id}`
    }),

  /** 获取重点车辆信息列表 */
  list: ({ pageNum, pageSize, ...queryParams }: PageQuery) =>
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
    }),

  /** 保存/修改重点车辆信息 */
  saveOrUpdate: (data: VehicleFocusFormModel) =>
    request({
      method: 'post',
      url: `${URL}/saveOrUpdate`,
      data
    })
})
```

export 链：`api/enterprise/index.ts` → `api/index.ts` → `src/index.ts`（`export * from './api'`）。

## 产物 3：app 薄壳 ×2（命名导出）

apps/web/src/api/enterprise/vehicleFocus.ts：

```ts
import { createVehicleFocusApi } from '@gx-web/biz'

import request from '@/plugins/axios'

export const VehicleFocusApi = createVehicleFocusApi(request)
```

apps/mini-program/src/api/enterprise/vehicleFocus.ts（仅注入点不同；mini 的 api 目录随首建，barrel 对齐 web）：

```ts
import { createVehicleFocusApi } from '@gx-web/biz'

import request from '@/service'

export const VehicleFocusApi = createVehicleFocusApi(request)
```

命名导出的附带收益：root barrel 的 `export * from './enterprise/vehicleFocus'` 真正可转发（default 导出不被 export * 转发）。

## 规则命中清单（本真跑验证点）

| 规则 | 命中情况 |
|---|---|
| 组合 C 嵌套 DTO 包装 | list：`page: { current, size }` 重组，Page 噪音零生成 |
| queryParams 空洞 → 弱类型 | `PageQuery`（默认泛型），不从 page.records 泄漏位捞字段 |
| 响应裸 object 分级 | byId 语义回链 `Res<VehicleFocusEntity>`；写入型无泛型 |
| body 混入 current/size 摊平 | saveOrUpdate/checkLicensePlate 回链 FormModel 时剔除噪音字段 |
| RESTful 动词按存量校准 | DELETE `/{id}` → `remove`（非默认 delete） |
| 无 x-order 回退 | 切片全缺 → 文件名字典序 |
| 用户意图优先于存量多数派 | 存量静态类 13 文件 vs 用户拍板 biz 工厂 → 工厂胜出 |
| http 类型统一落位 | biz/types/api.ts 四类型 + 双源同构 + axios 显式依赖 |
