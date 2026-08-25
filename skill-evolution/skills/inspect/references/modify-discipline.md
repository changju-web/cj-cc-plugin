# 修改纪律与禁区

## 前置检查

- 市场仓库工作树不干净 → 本次只出报告，不改文件
- 已有在途进化分支（`skill-evolution/*`）→ 在其上追加；否则从 main 新建 `skill-evolution/<日期>`
- 在途分支最多一个

## 改动纪律

- **最小 diff**：单次改动 ≤3 个文件，只动行动项涉及的文件
- **替换优于追加**：规则冲突时替换旧文案，不并排堆叠新段——防 skill 文件沉积
- **落点层级**：流程 → SKILL.md / 细则 → references/（单 reference.md 插件即该文件）/ 真机样本 → examples/
- **不改版本号**：bump 由人工在 merge 时执行，报告只给建议（插件 + 目标版本）
- 消费项目侧唯一允许的写动作：台账条目行尾打标

## 禁区

- 不 push、不 merge、不修改 main
- 不操作 `worktree-agent-*` 与 `feature/*` 既有分支
- 不创建 / 修改 / 删除任何自动化
- 不修改 ZCode 配置或 memory
- 不代写消费项目约定记忆文件与业务代码
- 巡检报告（`.scratch/evolution-*.md`）不进 git

## 元层不豁免

本插件自身（inspect 的 SKILL.md 与 references/）同样在可进化范围内：信号指向 skill-evolution 自身时，归因层记为"元层"，门槛与纪律同样适用。

## 度量（v1）

不做指标统计，仅在报告尾部做**回归标记**：列出本次行动项可能影响展示结果的既有 examples 样本清单，供人工抽查。
