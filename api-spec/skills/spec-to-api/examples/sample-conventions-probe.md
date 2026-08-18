# 真机样本 · api 侧约定探测过程（by-investment）

记忆文件 `docs/api-spec.md` 缺 api 侧条目时（先跑过 spec-to-model 的常态），spec-to-api 首次运行的探测过程实录。

## 起点

```text
读 docs/api-spec.md
  → 存在，含 model 目录/命名/http 类型/api 形态/服务前缀（spec-to-model 侧写的）
  → 缺：app 层注入段、批量 id 工具段
  → 只探缺项（api 形态已有「工厂函数」条目，形态探测跳过）
```

## 探测点 5：app 清单与 request 注入点

```text
扫 apps/*/src：

apps/web/src/api/investment/enterprise-info.ts
  import request from '@/plugins/axios'      ← web 注入点
apps/web/src/api/system/dept.ts              ← 同上，多数派确认

apps/mini-program/src/api/investment/enterprise-info.ts
  import request from '@/service'            ← mini 注入点（与 web 不同，独立记录）

归纳：
  app 清单 = web, mini-program
  web 注入点 = @/plugins/axios（2 样本一致）
  mini-program 注入点 = @/service（1 样本，但该 app 全部薄壳一致 → 采信）
```

**反例警示**：不能从 web 的注入点推断 mini-program 的——两端请求栈完全不同（axios vs 小程序封装）。注入点每 app 独立探测。

## 探测点 6：批量 id 工具

```text
grep 重复 key 拼接模式：
  packages/share/src/utils/index.ts:
    export const groupBatchIds = (ids: string[], key = 'id') => ...

→ 找到。记录：groupBatchIds @ packages/share/src/utils
```

## 探测点 7：share 包名

```text
读 app 薄壳 import：from '@gx-web/share'
→ 记录：@gx-web/share
```

## 写入记忆文件（增量补缺，不动已有段）

在 `docs/api-spec.md` 追加：

```markdown
## app 层注入
- app 清单与 request 注入点：apps/web → @/plugins/axios；apps/mini-program → @/service
- app api 目录：apps/<app>/src/api（镜像 share 的服务域子目录）
- share 包名：@gx-web/share

## 批量 id 工具
- groupBatchIds：packages/share/src/utils（'id=1&id=2' 重复 key 格式，DELETE 批量用）
```

## 从零项目对照（xbwisdom 场景）

xbwisdom-web-monorepo 首次运行 spec-to-api 时探测结果的差异，说明探测不是走过场：

```text
api 目录探测：扫 export const create.*Api → packages/share/src/api 不存在
  → 该项目只有 model（packages/share/src/model），api 目录零基础
  → 问用户："api 工厂放哪个目录？建议 packages/share/src/api（与 model 镜像）"
app 清单：apps/web 存在且有自己的 src/api（app 级历史文件）
  → 读其 import 形态确认 request 注入点
批量工具：无 groupBatchIds
  → 问用户，附标准实现（5 行），确认落位后记入约定
```

要点：**探测不到 ≠ 默认值**。api 目录缺失、工具缺失都走询问，绝不擅自建目录/建工具函数（探测只读不写；只有记忆文件本身是探测阶段的唯一写动作）。
