# 共通篇 · 跨端与团队 Vue 3 约定

跨端（PC ep-comp / 小程序 wd-comp）共通的 gx-web 用法约定 + 团队 Vue 3 编码约定。2026-08 自个人 AGENTS.md 迁入，本文件为唯一权威源。

## Props 类型标注

优先解构 + 默认值：

```ts
interface Props {
  msg?: string;
  labels?: string[];
}

const { msg = "hello", labels = ["one", "two"] } = defineProps<Props>();
```

考虑封装便捷时可用备选：

```ts
const props = withDefaults(defineProps<Props>(), {
  msg: "hello",
  labels: () => ["one", "two"],
});
```

## Emits 类型标注

```ts
const emit = defineEmits<{
  change: [id: number];
  update: [value: string];
}>();
```

## 双向绑定一律 defineModel（Vue 3.4+）

组件的 `modelValue` 双向绑定**禁止** `props.modelValue + emit('update:modelValue')` 手写三件套（含 computed get/set 代理版）：

```ts
// ✅ 直接 defineModel
const visible = defineModel<boolean>({ required: true });
const value = defineModel<string>();

// ❌ props.modelValue + defineEmits(['update:modelValue']) + computed get/set 转发
```

- 需要在写回前做加工的（如 UrlPermGroup 拼 `METHOD:/path`），对 `defineModel` 返回的 ref 赋值即可，不必退回 emit
- 仅当绑定名不是 `modelValue`（如 `v-model:title`）时用 `defineModel<string>('title')`

## 插槽类型标注

```vue
<script setup lang="ts">
const slots = defineSlots<{
  default?: (scope: { msg: string }) => any;
}>();
</script>
```

## Pinia Store 使用规范

核心约定——按调用处上下文二分：

- **Vue 组件上下文**（`<script setup>` / `setup()`）：`useXxxStore()`
- **非组件上下文**（router / axios / utils / guard / 独立 `.ts`）：`useXxxStoreHook()`

标准模式（store 定义与非组件安全入口同文件导出）：

```ts
// store/modules/setting.ts
export const useSettingStore = defineStore("setting", () => {
  // ...
  return {};
});

// 非组件场景统一使用的安全入口
export function useSettingStoreHook() {
  return useSettingStore(store);
}
```

目的：避免非组件上下文 `getActivePinia()` / 无 active pinia 的运行时错误；统一获取入口；为 SSR、初始化注入保留改造点。

禁止事项：

- 禁止在非组件文件中直接调用 `useXxxStore()`
- 禁止同一类型场景混用两套调用方式
- 禁止同义命名变体（如 `getXxxStore`）

命名规范：Store 定义 `useXxxStore`，安全入口 `useXxxStoreHook`，全项目一致。

## 待库作者补充

- [ ] 样式 / UnoCSS 类的使用边界（如适用）
