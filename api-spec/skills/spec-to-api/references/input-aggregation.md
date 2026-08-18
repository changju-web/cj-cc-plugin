# Input Aggregation · 实体聚合与输入识别

`SKILL.md`「输入：按实体聚合」的关键补充。解决"一组切片怎么归组、URL 常量怎么定、方法怎么排序、单切片增量怎么进"。

## 为什么按实体聚合（不是一次一个切片）

一个实体的 api 面通常有 10~20 个端点，切成 10~20 个切片文件。api 工厂的自然单位是**实体**（一个 `const URL`、一个 `createXxxApi`），不是端点。一次喂一个切片意味着 19 次运行、19 次增量合并才能拼齐一个文件——粒度错了。正确粒度：**同 URL 前缀的全部切片 → 一个工厂文件**。

## 切片文件结构回顾

每个切片文件是一个 path 单位（不是 operation 单位）：

```json
{
  "path": "/investment/enterprise/info/simplePage",
  "operations": {
    "get": { "operationId": "...", "parameters": [...], "responses": {...}, "summary": "...", "x-order": 32 }
  }
}
```

**一个文件可含多个 operation**——RESTful 资源根路径就是这样：

```text
enterprise-info.json        → post（新增）/ put（修改）/ delete（批量删）三合一
enterprise-info-id.json     → get（/{id} 详情）
enterprise-info-page.json   → get（分页）
```

聚合时按 operation 展开，不是按文件计数。

## 聚合流程

```text
Step 1：展开
  输入 N 个切片文件 → 展开成 M 个 operation（method, path, 参数, 响应, summary, x-order）

Step 2：算公共前缀（= const URL）
  对 M 个 path 求最长公共路径前缀（按段比较，不切半段）
  /investment/enterprise/info/simplePage
  /investment/enterprise/info/{id}
  /investment/enterprise/info
  → 公共前缀 /investment/enterprise/info ✓

Step 3：定实体名
  公共前缀去掉服务前缀（/investment）→ 业务段 enterprise/info
  → 按项目约定的实体名规则拼接（与 spec-to-model 同源规则）
  → EnterpriseInfo

Step 4：定产出路径
  api 目录（约定）+ 服务域子目录（约定）+ kebab-case 文件名
  → packages/share/src/api/investment/enterprise-info.ts
  → 与 model 文件目录镜像（api/investment/enterprise-info.ts ↔ model/investment/enterprise-info.ts）

Step 5：排序
  方法排序 = x-order 升序为主键，x-order 相同或全部缺失时按切片文件名字典序稳定兜底
  （真机数据 x-order 有重复：enterprise-info-id 的 get 与 getEnterpriseInfo 同为 12；
   xbwisdom 企业模块切片普遍无 x-order，全缺时直接字典序）
```

## 前缀不一致（分组询问）

用户给的切片组里出现两个及以上不同前缀 → **分组列出，问用户**"这批切片包含 N 个实体（列出前缀与切片数），是否分别生成 N 个工厂文件？"不强行合并成一个大杂烩工厂，也不擅自丢弃。

典型场景：用户把 `enterprise-info-*` 和 `enterprise-staff-*` 一起拖进来——两个实体，两个工厂文件。

## 单切片 / 部分切片输入

- 单切片（如只给 `enterprise-info-checkEnterpriseApply.json`）→ 定位到目标工厂文件（按前缀推导），**增量追加一个方法**（三层合并，见 SKILL.md）
- 目标工厂文件不存在 → 新建只含该方法的工厂（后续再增量拼装）
- 用户给的是"实体名"而非文件路径（如"给 enterprise-info 生成 api"）→ 读 `api-spec/output/<服务>/index.md` 按前缀/文件名匹配筛出全部相关切片，列出清单让用户确认范围后再聚合

## 粘贴模式（无切片文件）

用户直接粘贴 OpenAPI operation JSON 时：

- 单个 operation → 按其 path 定前缀与实体名，增量进对应工厂
- path 不含网关 contextPath（是服务内路径）→ 询问服务前缀（或从约定的服务前缀映射反查），拼成全路径再定位
- 粘贴的是整个 path 对象（含多 method）→ 按 operation 展开同正常流程

## 服务前缀与全路径

切片里的 `path` 已经是**全路径**（spec-init/gen-spec 阶段拼好了网关 contextPath），`const URL` 直接用它，**不再二次拼前缀**。仅粘贴模式下的服务内路径需要补前缀——见上节。

服务名 ↔ 前缀映射（如 招商管理 → /investment）是项目约定，记在 `docs/api-spec.md`，用于"按服务找切片"的场景，不用于改写切片内的全路径。

## 真实示例：enterprise-info 全量聚合

```text
输入（19 个切片文件，招商管理/paths/）：
  enterprise-info.json                post/put/delete   x-order 14/15/16
  enterprise-info-id.json             get               x-order 12
  enterprise-info-page.json           get               x-order 10
  enterprise-info-list.json           get               x-order 11
  enterprise-info-simplePage.json     get               x-order 32
  enterprise-info-association.json    post              x-order 18
  enterprise-info-cancelAssociation.json post           x-order 19
  ...（其余 12 个）

公共前缀：/investment/enterprise/info → const URL
实体名：EnterpriseInfo（原样拼接约定）
产出：packages/share/src/api/investment/enterprise-info.ts
方法序：page(10) → byId?(12) → getEnterpriseInfo(12) → insert(14) → update(15) → delete(16) → ...
  （x-order=12 两个方法时，enterprise-info-getEnterpriseInfo.json 字典序在 enterprise-info-id.json 前，
   若项目已有文件则完全尊重既有顺序，只在缺失位置插入）
```

注意最后一行：**增量场景方法的插入位置**——已存在的文件保持既有方法顺序不动，新方法按推导序插入最接近的位置；全新文件才严格按 x-order 排。
