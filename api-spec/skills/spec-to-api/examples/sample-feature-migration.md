# 真机样本 · 页面级 api 迁移到共享工厂（xbwisdom visitInfo 改造）

用户说「改造 X 功能」时的完整链路样本：spec → model → api → 页面迁移 → 旧文件清理。xbwisdom 真机（visitInfo 替换 bookVisit）。

## 场景特征

- 存量形态：**页面级 api 文件**（`pages-core/visit/audit/api/index.ts` 直连 request + 页面级 model），后端推出新端点族（visitInfo）替换旧端点（bookVisit）
- 新旧契约字段大改（非 1:1）：`name→visitorName`、`hasAgree:number(1/2)→agreed:boolean(null待审)`、`beginTime→visitStartTime`、审批参数 `hasAgree/rejectReason/updatedBy→agreed/id/placeId/placeType/remark`
- 旧单端点靠 `agree` 参数分流待审/历史，新契约拆成 `pending` / `list` 两个端点

## 流程（五步）

```text
1. spec-to-model：新端点切片 → biz/src/model/wechat/visit-info.ts
   （Entity 22 字段 + TableModel extends Entity 增量 visitorName/visitorPhone
    + VisitInfoFormModel（submit，required 4 个 !:）+ VisitInfoApproveFormModel（approve））
2. spec-to-api：biz/src/api/wechat/visit-info.ts 工厂（6 端点）+ 双 app 薄壳
3. 页面迁移：逐文件替换调用 + 字段映射 + 契约缺口标注
4. 旧文件清理：grep 确认零引用后删除页面级 api/model 目录
5. tsc 验证：biz exit 0 + app 全量 0 新增错误
```

## 页面迁移的字段映射表（改造的核心资产）

| 旧 bookVisit | 新 visitInfo | 备注 |
|---|---|---|
| `name` | `visitorName` | 列表项有；**详情 Entity 无**（仅 TableModel） |
| `intervieweeName` | — | **契约缺口**：列表标题退化为地址展示 |
| `hasAgree: 1/2` | `agreed: true/false/null` | fmtStatus 逻辑同步改 boolean 三态 |
| `updatedTime` | `createTime` | 标题日期 |
| `beginTime` / `endTime` | `visitStartTime` / `visitEndTime` | |
| `createdTime` | `createTime` | |
| `rejectReason` | `remark` | 审批备注（approve body 第 5 字段，截断打印时差点漏掉） |
| 照片 `imgPath`/`hasPhoto`、证件 `cardType`/`idCard`、`nationality`、`personNumber` | — | **契约缺口**：展示块删除，代码注释标注待后端 |

注意 body 字段清单要从 schema **全量打印**，切片的字段可能在打印截断之外（approve 的 remark 就是第 5 个字段）。

## 分页参数迁移

```text
旧手写（嵌套 DTO 直传）：{ page: { maxCurrent, current, size }, queryParams: { agree, name, ... } }
新生成 api 入参（平铺 PageQuery）：{ pageNum, pageSize, ...查询字段 }

页面侧：reactive<Record<string, any>>({ pageNum: 1, pageSize: 10 })，
查询字段直接平铺塞入（spec 的 queryParams 是空 schema → 弱类型，运行时传真实参数合法）
旧 agree:'0' 过滤删除——pending 端点专职待审，不再需要
maxCurrent 是旧嵌套结构的私货 → 页面局部变量 maxPage
```

## 契约缺口的责任边界

缺口（详情无访客姓名、无照片/证件字段）在**改造中如实标注**（代码注释 + 报告清单），不编造字段、不保留对不存在字段的引用（TS 会报错）。展示退化方案：标题用可用的替代字段（如地址），UI 块删除并注释。是否要后端补齐由用户与后端协商，重跑 spec-pull + spec-to-model/api 增量即可补上。

## 旧文件清理纪律

- 先 grep 全量引用面（含 `from '../api'` / `from './model'` 的域外引用），零引用才删
- 删除的是**该功能的页面级 api/model 目录**，不是共享层任何文件
- 被其他功能复用的函数（如 loadGetImg 在 checkin-audit 有独立副本）不受影响——确认没有跨域 import 再动手
