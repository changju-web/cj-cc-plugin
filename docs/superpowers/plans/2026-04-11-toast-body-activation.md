# Toast 通知本体点击激活 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `notify-toast.ps1` 的通知构造逻辑从按钮激活改为 toast 本体协议激活，移除底部按钮。

**Architecture:** 保持现有的参数、窗口状态检测、延迟等待、activity 文件检查逻辑完全不变。仅替换末尾的通知构造部分：从 `New-BurntToastNotification -Text ... -Button ...` 改为底层 content 组装（`New-BTText` → `New-BTBinding` → `New-BTVisual` → `New-BTContent -ActivationType Protocol -Launch` → `Submit-BTNotification`）。

**Tech Stack:** PowerShell 7, BurntToast 模块, Windows Toast API

---

### Task 1: 替换通知构造逻辑

**Files:**

- Modify: `C:\Users\13226\.claude\scripts\notify-toast.ps1:57-63`（将末尾按钮构造和通知提交替换为 content 组装方式）

- [ ] **Step 1: 替换脚本末尾的通知构造代码**

将第 57-63 行：

```powershell
# Save hwnd to temp file for protocol handler to read
$hwndFile = Join-Path $env:TEMP 'claude-notify-hwnd.txt'
$Hwnd | Out-File $hwndFile -Force

$button = New-BTButton -Content '切换到当前窗口' -Arguments 'claude-focus://activate' -ActivationType Protocol

New-BurntToastNotification -Text 'Claude Code', $Message -Sound 'IM' -Button $button
```

替换为：

```powershell
# Save hwnd to temp file for protocol handler to read
$hwndFile = Join-Path $env:TEMP 'claude-notify-hwnd.txt'
$Hwnd | Out-File $hwndFile -Force

# Build toast with body-click protocol activation (no button)
$text1 = New-BTText -Text 'Claude Code'
$text2 = New-BTText -Text $Message
$binding = New-BTBinding -Children $text1, $text2
$visual = New-BTVisual -BindingGeneric $binding
$content = New-BTContent -Visual $visual -ActivationType Protocol -Launch 'claude-focus://activate' -Audio (New-BTAudio -Source 'ms-winsoundevent:Notification.IM')

Submit-BTNotification -Content $content
```

同时更新脚本顶部注释，将第 1 行：

```powershell
# notify-toast.ps1 - Shows BurntToast notification with focus button
```

改为：

```powershell
# notify-toast.ps1 - Shows BurntToast notification, click body to focus window
```

- [ ] **Step 2: 手动验证横幅通知**

在终端中运行以下命令触发一次测试通知：

```powershell
pwsh -NoProfile -File "C:\Users\13226\.claude\scripts\notify-toast.ps1" -Hwnd 0 -Message "测试本体点击"
```

预期结果：

1. 右下角弹出通知，**无底部按钮**
2. 通知标题显示 "Claude Code"，内容显示 "测试本体点击"

注意：`-Hwnd 0` 会导致窗口句柄校验失败直接退出（因为 `IsWindow(0)` 返回 false）。因此实际测试需要用一个真实窗口句柄。可改用以下方式：

```powershell
# 获取当前终端窗口句柄后测试
$hwnd = (Get-Process -Id $PID).MainWindowHandle.ToInt64()
pwsh -NoProfile -File "C:\Users\13226\.claude\scripts\notify-toast.ps1" -Hwnd $hwnd -Message "测试本体点击"
```

预期结果：

1. 通知弹出，无底部按钮
2. 点击通知本体后，`claude-focus://activate` 协议被触发，终端窗口获得焦点

- [ ] **Step 3: 验证通知中心历史通知**

等待通知超时（约 5 秒）后进入通知中心，在通知中心中点击该历史通知。

预期结果：终端窗口获得焦点（与横幅点击行为一致）。

- [ ] **Step 4: 提交变更**

```bash
cd "C:/Users/13226/.claude"
git add scripts/notify-toast.ps1
git commit -m "feat: toast body click activation, remove button"
```

注意：`~/.claude` 目录可能不是 git 仓库。如果不是，跳过 git 提交，仅确认文件已保存即可。
