# Toast 通知本体点击激活设计

## 背景

当前 `notify-toast.ps1` 使用 BurntToast 创建通知，底部带一个"切换到当前窗口"按钮，点击按钮触发 `claude-focus://activate` 协议，由 `focus-window.ps1` 完成窗口聚焦。

用户希望去掉按钮，改为点击通知本体直接聚焦窗口，横幅通知和通知中心历史通知都应生效。

## 目标

- 移除底部按钮
- 点击通知本体触发与按钮完全相同的 `claude-focus://activate` 协议
- 横幅通知和通知中心历史通知均支持点击激活

## 方案

使用 BurntToast 底层 content 组装方式，将协议激活挂到 toast 内容本身：

1. 用 `New-BTText` 构造文本
2. 用 `New-BTBinding` + `New-BTVisual` 构造视觉层
3. 用 `New-BTContent -ActivationType Protocol -Launch 'claude-focus://activate'` 设置本体激活行为
4. 用 `Submit-BTNotification` 提交通知

## 影响范围

| 文件 | 变更 |
|------|------|
| `~/.claude/scripts/notify-toast.ps1` | 替换通知构造逻辑，移除按钮，改用 content 组装 |
| `~/.claude/scripts/focus-window.ps1` | 无变更 |
| `~/.claude/scripts/notify-hook.ps1` | 无变更 |

## 错误处理与边界

- 窗口句柄无效时静默退出（与现有一致）
- 协议激活依赖 `claude-focus://` 已在系统注册（不变）
- 通知超时进入通知中心后，用户点击仍通过 `-ActivationType Protocol -Launch` 触发协议激活（天然支持）
- 无新增异常路径

## 验收标准

1. 通知不显示底部按钮
2. 点击横幅通知本体 → 窗口聚焦
3. 通知进入通知中心后点击 → 窗口聚焦
4. 窗口句柄无效时不报错，静默退出
