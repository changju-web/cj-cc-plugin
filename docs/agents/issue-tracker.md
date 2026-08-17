# Issue tracker: 本地 Markdown

本仓库的工单与规格以 markdown 文件形式存放在 `.scratch/` 下。

## 约定

- 一个 feature 一个目录：`.scratch/<feature-slug>/`
- 规格文件：`.scratch/<feature-slug>/spec.md`
- 实施工单一票一文件：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 起编号——绝不合并成单个工单文件
- triage 状态记录在每个工单文件顶部的 `Status:` 行（角色字符串见 `triage-labels.md`）
- 评论与讨论历史追加到文件底部 `## Comments` 标题下

## 当 skill 说 "publish to the issue tracker"

在 `.scratch/<feature-slug>/` 下新建文件（目录不存在则创建）。

## 当 skill 说 "fetch the relevant ticket"

读取引用路径处的文件。用户通常会直接给出路径或工单编号。

## Wayfinding 操作

供 `/wayfinder` 使用。**map** 是一个文件，每个工单对应一个 **child** 文件。

- **Map**：`.scratch/<effort>/map.md` —— Notes / Decisions-so-far / Fog 主体
- **Child ticket**：`.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 编号，正文写问题。`Type:` 行记录工单类型（`research`/`prototype`/`grilling`/`task`）；`Status:` 行记录 `claimed`/`resolved`
- **Blocking**：文件顶部 `Blocked by: NN, NN` 行。所列文件全部 `resolved` 后工单解除阻塞
- **Frontier**：扫描 `.scratch/<effort>/issues/` 中开放、未阻塞、未认领的文件，编号小者优先
- **Claim**：动手前先置 `Status: claimed` 并保存
- **Resolve**：在 `## Answer` 标题下追加答案，置 `Status: resolved`，然后把上下文指针（要点 + 链接）追加到 `map.md` 的 Decisions-so-far
