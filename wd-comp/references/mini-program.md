# Mini Program Reference

## Project Boundary

生成代码默认面向 `apps/mini-program`：

- 页面：`apps/mini-program/src/pages-core/<module>/`
- 页面 API：`api/index.ts`
- 页面 model：`model/index.ts`
- 模块私有组件：`components/`
- 跨模块业务组件：`features/`
- 通用组件：`components/`

不要为历史小程序重新引入独立应用壳、Vuex、uView、Vue 2 class component 或旧全局实例方法。

## Page Contract

页面使用 `<script setup lang="ts">` 和 `definePage`。

```ts
definePage({
  style: {
    navigationBarTitleText: '人员管理'
  }
})
```

路由由 `@uni-helper/vite-plugin-uni-pages` 扫描页面生成；不要为了新增页面手写 `pages.json`。

## API Contract

使用 `@/service`。

```ts
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
```

规则：

- 先读取同模块或邻近模块 API 风格，再决定使用 `QueryParams<T>`、`PageParams & T` 或接口要求的特殊结构。
- 不确定分页入参时不要猜，保留待确认项。
- 非组件上下文如果需要 store，使用 `useXxxStoreHook()`。

## UI Contract

- Wot UI 组件通过 easycom 使用 `wd-*`，页面里不要手动 import 基础组件。
- 列表分页优先使用 `gx-list`。
- 简单搜索使用 `wd-search` 或 `gx-search`。
- 复杂筛选使用 `gx-search-more`，筛选体可拆到 `components/more-search-popup.vue`。
- 空状态使用 `wd-empty`。
- 表单使用 `wd-form`、`wd-form-item`、`wd-input`、`wd-textarea`、`wd-radio-group`、`wd-picker`、`gx-dict-*` 等现有能力。
- 提交成功提示优先使用项目 `useNotify()`，普通轻提示可使用 `uni.showToast`。

## Refresh Contract

列表页进入新增/编辑页后，提交成功可用模块事件刷新：

```ts
// event/index.ts
export const eventKey = 'person-reload'
```

列表页：

```ts
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { eventKey } from './event'

onLoad(() => uni.$on(eventKey, reloadList))
onUnload(() => uni.$off(eventKey))
```

表单页：

```ts
uni.$emit(eventKey)
```

## Validation

完成后运行：

```bash
pnpm mini:ts-check
```

扫描旧壳残留：

```bash
rg "u-|Vuex|vue-property-decorator|\\$navTo|\\$message|\\$setHttpIMG|\\|\\s*isNull" apps/mini-program/src/pages-core/<module>
```

如果只剩 `node_modules/@wot-ui/ui` 内部类型兼容错误，报告明细并说明业务改动已按项目约定验证。

