# table-page Reference

## index.vue template

API/model 的 import 形态跟随归属决策结论（下例为统一管理形态：消费 app 侧 `XxxApi`）：

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { ElButton } from "element-plus";
import { useStateRef, useTablePage } from "@gx-web/tool";
import { getModelFromJson } from "@gx-web/core";
import {
  GxPaginationTable,
  GxSearch,
  generateFormItems,
  generateTableColumns,
} from "@gx-web/ep-comp";
import { XxxApi } from "@/api/<域>/<实体>";
import { XxxQueryModel, XxxRowModel } from "./model";

defineOptions({
  name: "XxxManage",
});

const [search, , resetSearch] = useStateRef(() =>
  getModelFromJson(XxxQueryModel),
);

const [list, { page, loading, loadList, reloadList, onChange }] =
  useTablePage<XxxRowModel>(({ current, size }) =>
    XxxApi.page({ ...search.value, pageNum: current, pageSize: size }).then(
      (res) => ({
        records: res.data.records,
        total: res.data.total,
      }),
    ),
  );

const columns = generateTableColumns(XxxRowModel, ["field1", "field2"]);
const searchItems = generateFormItems(XxxQueryModel, ["keyword"]);

onMounted(loadList);
</script>

<template>
  <div class="xxx-manage">
    <GxPaginationTable
      v-model:page="page.current"
      v-model:limit="page.size"
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="page.total"
      @pagination="onChange"
    >
      <template #header>
        <GxSearch
          v-model="search"
          :items="searchItems"
          @submit="loadList"
          @reset="
            resetSearch();
            reloadList();
          "
        />
      </template>

      <template #action="{ row }">
        <ElButton link type="primary">详情</ElButton>
      </template>

      <template #action-bar />
    </GxPaginationTable>
  </div>
</template>
```

## API template

### 统一管理形态（存在 biz 类统一层）

契约 API 写统一层工厂，app 侧一行消费：

```ts
// packages/biz/src/api/<域>/<实体>.ts
import type { ApiRequest, PageQuery, Res, ResPage } from "../../types";
import type { XxxListItemModel, XxxQueryModel } from "../../model";

/** xxx 管理 */
export const createXxxApi = (request: ApiRequest) => ({
  /** 获取分页 */
  page: (params?: PageQuery & Partial<XxxQueryModel>) =>
    request<ResPage<XxxListItemModel>>({
      method: "get",
      url: "/xxx/v1/xxx/page",
      params,
    }),
});
```

```ts
// apps/<app>/src/api/<域>/<实体>.ts —— app 侧消费（页面只 import XxxApi）
import { createXxxApi } from "@gx-web/biz";

import request from "@/plugins/axios";

export const XxxApi = createXxxApi(request);
```

注意：壳文件是**模块求值期**立即解引用 `request` 的。若项目请求层与 store 存在
循环依赖（如 axios 拦截器静态 import user store 做 401 续登），顶层求值会触发
TDZ `ReferenceError`。此时先确认项目是否有 auth-context 类解耦层（优先走治本）；
没有则该壳退化为调用时求值包装，切勿原样照抄上面的顶层求值：

```ts
import type { AxiosRequestConfig } from "axios";
import { createXxxApi, type ApiRequest } from "@gx-web/biz";

import request from "@/plugins/axios";

// 存在循环依赖(axios → store → 本薄壳 → axios),包装为调用时求值规避 TDZ
export const XxxApi = createXxxApi(((config: AxiosRequestConfig) =>
  request(config)) as ApiRequest);
```

### 就近形态

请求实例以项目请求层为准（下例为 `@/plugins/axios` 形态，不要虚构别的封装）：

```ts
// views/<module>/api/index.ts
import request from "@/plugins/axios";
import type { XxxListItemModel, XxxQueryModel } from "../model";

export const loadPage = (params: XxxQueryModel) => {
  return request<ResPage<XxxListItemModel>>({
    method: "get",
    url: "/xxx/v1/xxx/page",
    params,
  });
};
```

## Model template

### 统一管理形态

契约实体落 biz；页面只建页面私有的查询/行模型，继承实体补页面字段，不复制契约字段：

```ts
// packages/biz/src/model/<域>/<实体>.ts —— 契约实体
import { ClassName, FieldName } from "@gx-web/core";

@ClassName("xxx")
export class XxxEntity {
  @FieldName("字段1")
  field1!: string;

  @FieldName("字段2")
  field2!: string;

  id!: string;
}
```

```ts
// views/<module>/model/index.ts —— 页面私有模型
import { FieldName } from "@gx-web/core";
import { XxxEntity } from "@gx-web/biz";

export class XxxQueryModel {
  @FieldName("关键字")
  keyword!: string;
}

export class XxxRowModel extends XxxEntity {
  @FieldName("入库时间")
  createTime!: string;
}
```

查询条件本身就是契约字段时，QueryModel 也可直接落 biz，页面 `generateFormItems(biz 模型, [...])` 挑选暴露字段，不建页面副本（以项目约定为准）。

### 就近形态

```ts
// views/<module>/model/index.ts
import { FieldName } from "@gx-web/core";

export class XxxQueryModel {
  @FieldName("关键字")
  keyword!: string;
}

export class XxxListItemModel {
  @FieldName("字段1")
  field1!: string;

  @FieldName("字段2")
  field2!: string;

  id!: string;
}
```

## Shared Contracts

### 根节点 contract

```vue
<template>
  <div class="module-kebab-case">
    <GxPaginationTable ... />
  </div>
</template>
```

### 挂点 contract

- `#header`：查询区
- `#action`：行级操作
- `#action-bar`：页面级操作
