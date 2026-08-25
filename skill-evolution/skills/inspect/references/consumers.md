# 消费项目注册表

蒸馏巡检按此清单读取各项目的 `docs/codegen-ledger.md`。新增消费项目时人工补一行。

| 项目 | 路径 | 客户端（插件） | 状态 |
| --- | --- | --- | --- |
| by-investment | `D:\Develop\Project\by-investment-platform-frontend` | PC（api-spec + ep-comp） | 活跃 |
| xbwisdom | `D:\Develop\Project\xbwisdom-web-monorepo` | PC + 小程序（api-spec + ep-comp + wd-comp） | 活跃 |

说明：

- 台账尚未创建的项目：首次生成会话的捕获动作会创建它；巡检遇缺失 → 报告提示，不代建
- 路径失效（换机 / 移库）→ 巡检报告标注，人工更新本表
