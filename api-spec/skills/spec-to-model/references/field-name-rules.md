# @FieldName Rules · 清洗规则书

`SKILL.md` 原则 2 的详细规则书。本文件解决"OpenAPI description → `@FieldName('中文')` 文本"的所有边界情况。

## 为什么不能照搬 registration 的截断逻辑

`registration/model/index.ts` 的 FieldName 生成逻辑像是 **"取 description 中 `-` 或 `(` 前的部分"**，机械截断导致三个问题：

### 问题 1：撞名（严重）

```
contact        | 企业默认-联系人       → @FieldName('企业默认')  ❌
contactEmail   | 企业默认-联系人邮箱   → @FieldName('企业默认')  ❌
contactNumber  | 企业默认-联系人电话   → @FieldName('企业默认')  ❌
contactWechatNo| 企业默认-微信号       → @FieldName('企业默认')  ❌
```

`@FieldName` 通常被列表表头、详情 label、表单 placeholder 复用。4 个字段都叫"企业默认"，用户看到 4 列都写"企业默认"，等同于装饰器完全失效。

### 问题 2：丢主语

```
certificationCardId | 认证时的企业名片id → @FieldName('认证时的企业名片')  ❌
```

"认证时的企业名片"是 noun phrase 片段，丢了"id"后语义不完整。

### 问题 3：丢说明（轻度）

```
industryCode | 所属行业(sys_industry表code字段) → @FieldName('所属行业')  ← 这个其实还行
```

去括号是合理的，但 `(sys_industry表code字段)` 这种引用说明该字段绑字典表，是有用信息。

## 清洗规则（按优先级）

### 规则 1：取 description 全文为起点

```
input: '认证时的企业名片id'
output: '认证时的企业名片id'  ✅
```

不主动截断。

### 规则 2：去掉尾部的技术参数括号

匹配尾部 `(xxx表xxx字段)` / `(枚举值列表)` / `(单位:xxx)` 等：

```
'所属行业(sys_industry表code字段)'                    → '所属行业'
'注册资本(万元)'                                       → '注册资本'
'发布状态（0、待处理 1、上架 2、下架）'                → '发布状态'  ← 枚举部分单抽，见 enum-extraction.md
'坐标(WGS84)'                                          → '坐标'      ← 也可保留为 'WGS84坐标' 见规则 5
```

但**业务语义括号保留**：

```
'企业默认(对外展示)'     → '企业默认(对外展示)'  ← 不剥，括号里是业务说明
'房号(楼栋-楼层-房间)'   → '房号(楼栋-楼层-房间)'  ← 不剥
```

判定：括号里是技术参数（表名/code/单位/枚举值）才剥；是业务说明保留。

### 规则 3：`-` 分隔的"业务前缀-业务主体"取主体

匹配 `^<前缀>-(?<主体>.+)$`，取主体（消歧用）：

```
'企业默认-联系人'        → '联系人'       ✅
'企业默认-联系人邮箱'    → '联系人邮箱'   ✅
'企业默认-联系人电话'    → '联系人电话'   ✅
'企业默认-微信号'        → '微信号'       ✅
'企业-法定代表人'         → '法定代表人'   ✅
```

但如果取主体后会丢失关键信息，保留全文：

```
'系统-超级管理员账号'    → '系统-超级管理员账号'  ← 取'超级管理员账号'也行，但'系统'是限定词，保留更明确
```

判定：前缀是"分组归类"（如"企业默认"、"系统"）→ 取主体；前缀是"限定词"→ 保留全文。模棱两可时取主体（消歧优先）。

### 规则 4：去重消歧（兜底）

走完规则 1-3 后，同 class 内仍出现重复 `@FieldName` → 加字段名消歧：

```
@FieldName('联系人(contact)')
contact!: string

@FieldName('联系人邮箱(contactEmail)')
contactEmail!: string
```

只在规则 1-3 没消歧干净时使用，不要一上来就加字段名后缀。

### 规则 5：无 description 的退化

字段无 description → 用字段名驼峰转写（**不臆译英文**）：

```
fieldName       → 'fieldName'           ← 留待用户补中文
createTime      → 'createTime'
```

理由：自动翻译英文业务词容易翻错（如 `entry` 翻"入口"还是"入驻"取决于业务），不如保留原字段名让用户填。

**例外**：常见技术词可译：

```
id          → 'ID'           ← 通用
createTime  → '创建时间'      ← MyBatis-Plus 约定
updateTime  → '更新时间'      ← MyBatis-Plus 约定
createUser  → '创建人'        ← MyBatis-Plus 约定
updateUser  → '更新人'        ← MyBatis-Plus 约定
isDeleted   → '是否已删除'    ← MyBatis-Plus 约定
status      → '状态'          ← 通用
remark      → '备注'          ← 通用
```

## 真实数据对照（enterprise-info 接口）

下表左：`api-spec/output/.../enterprise-info-getEnterpriseInfo.json` 中的 description。
下表中：registration 实际生成（演示 bug）。
下表右：本 skill 应生成。

| 字段 | spec description | registration 生成 | 本 skill 生成 | 规则 |
|---|---|---|---|---|
| `address` | `企业地址` | `企业地址` | `企业地址` | 规则 1 |
| `addressDetail` | `详细地址` | `详细地址` | `详细地址` | 规则 1 |
| `area` | `租赁面积` | `租赁面积` | `租赁面积` | 规则 1 |
| `certificationCardId` | `认证时的企业名片id` | `认证时的企业名片` ❌ | `认证时的企业名片id` | 规则 1（不截断） |
| `contact` | `企业默认-联系人` | `企业默认` ❌ | `联系人` | 规则 3 |
| `contactEmail` | `企业默认-联系人邮箱` | `企业默认` ❌ | `联系人邮箱` | 规则 3 |
| `contactNumber` | `企业默认-联系人电话` | `企业默认` ❌ | `联系人电话` | 规则 3 |
| `contactWechatNo` | `企业默认-微信号` | `企业默认` ❌ | `微信号` | 规则 3 |
| `createTime` | `创建时间` | `创建时间` | `创建时间` | 规则 1 |
| `industryCode` | `所属行业(sys_industry表code字段)` | `所属行业` | `所属行业` | 规则 2 |
| `industryName` | `所属行业名称` | `所属行业名称` | `所属行业名称` | 规则 1 |
| `releaseStatus` | `发布状态（0、待处理 1、上架 2、下架）` | `发布状态` | `发布状态` | 规则 2（枚举抽走） |
| `latWgs84` | `WGS84纬度` | `WGS84纬度` | `WGS84纬度` | 规则 1 |
| `mainBusiness` | `主营业务` | `主营业务` | `主营业务` | 规则 1 |
| `name` | `企业名称` | `企业名称` | `企业名称` | 规则 1 |

## 不要做的事

- ❌ 不要按字段名前缀分组（如把所有 `contact*` 强行归一组）—— spec description 才是事实来源
- ❌ 不要把字段名当 `@FieldName`（除非 description 缺失）—— 字段名是 code identifier，不是给人看的
- ❌ 不要把英文 description 机翻成中文 —— 业务术语翻译容易错
- ❌ 不要把多个字段合并成同一个 `@FieldName` —— 这是 registration 的核心 bug
