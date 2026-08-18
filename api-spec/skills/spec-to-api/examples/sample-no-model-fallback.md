# 真机样本 · 无 model 匹配的兜底流程（temporary-token 场景）

展示 type-binding 的第 3 层兜底：schema 匹配不到 model 时引导上游，用户跳过后的降级内联规范。项目：by-investment-platform-frontend。

## 场景

用户给切片 `auth/temporary/token/login`（module-action 或对应服务的登录端点），要生成 api。响应 `data` 是一个内联对象：

```json
"data": {
  "properties": {
    "disposable": { "description": "是否一次性", "type": "boolean" },
    "exp":        { "description": "到期时间", "format": "int64", "type": "integer" },
    "iat":        { "description": "创建时间", "format": "int64", "type": "integer" },
    "token":      { "description": "临时令牌", "type": "string" },
    "tokenExp":   { "format": "int64", "type": "integer" }
  }
}
```

## 第一步：回链尝试（角色 × 字段指纹）

```text
角色锁定：响应 data 对象 → *Model / *DetailModel
实体名：TemporaryToken（path /auth/temporary/token）
实体先验：model 目录找 TemporaryToken* → 无
放宽全目录：token/exp/disposable 字段集 vs 全部 class
  → 覆盖率最高 0.2（只有零星 token 字段撞上），远低于 0.8
→ 无匹配，进缺口清单
```

## 第二步：引导上游（默认动作）

报告话术：

```text
缺口清单（1 项）：
  POST /auth/temporary/token/login 的响应缺少 model
    建议：对切片 <路径> 跑 spec-to-model，建议生成 TemporaryTokenModel（5 字段）
    生成后回来重跑本 skill，api 将直接引用该 class
继续生成其余方法（无缺口的），还是先补 model？
```

用户此时通常去跑 spec-to-model → 回来走「来源连续性」直接命中 `TemporaryTokenModel`，闭环完成。

## 第三步：用户明确跳过 → 降级内联

用户说"这个不用生成 model，直接内联"时的产物：

```ts
// 降级内联：未匹配到 model（用户跳过 spec-to-model），建议后续补 TemporaryTokenModel 替换
export const createAuthTemporaryTokenApi = (
  request: <T>(config: AxiosRequestConfig) => Promise<T>
) => ({
  getTemporaryToken: () =>
    request<
      Res<{
        disposable: boolean
        /** 到期时间 */
        exp: string
        /** 创建时间 */
        iat: string
        /** 临时令牌 */
        token: string
        /** 令牌过期 */
        tokenExp: string
      }>
    >({
      method: 'post',
      url: `/auth/temporary/token/login`,
      data: {
        disposable: false
      }
    })
})
```

## 与存量 temporary-token.ts 的关键差异（int64 对齐）

存量手写：

```ts
disposable: boolean // 	是否一次性	boolean
exp: number // 	到期时间	integer(int64)   ← BUG：int64 → number
```

降级内联版：

```text
exp / iat / tokenExp：int64 → string（对齐 model 约定，JS Number 装不下 int64）
注释：行内尾巴注释 → 字段上方 JSDoc（块内统一形态）
```

int64 → number 是历史 bug 不是惯例：JSON 反序列化出的超长 id/时间戳在 number 上会精度丢失，model 侧早已全线 string，内联必须同表（type-binding.md 参数类型映射表），否则同一接口在 model 层和 api 层类型打架。

## 方法名说明

`getTemporaryToken` 来自 path 尾段？不——尾段是 `login`。这是**存量已存在的方法**（增量合并保旧），名字是历史语义命名。若该端点全新生成，按规则应命名为 `login`（尾段原样）。此差异在报告中标注但不改存量。

## 报告要点

- 1 个方法降级内联（用户跳过 spec-to-model），技术债清单已标注在代码注释与报告中
- int64 → string 已对齐 model 约定（与存量 bug 的差异明示）
- 引导话术已给出：补 TemporaryTokenModel 后重跑可替换内联
