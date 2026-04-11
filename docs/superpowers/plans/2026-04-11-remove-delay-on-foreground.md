# 前台窗口跳过通知 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 当 Claude Code 窗口在前台时，跳过通知直接退出；移除 Delay 参数和 activity 文件机制。

**Architecture:** 简化 `notify-toast.ps1` 的前台检测逻辑，移除延迟等待分支，改为前台直接 `exit 0`。同步清理 `notify-hook.ps1` 和 `SKILL.md` 中的 Delay 参数。

**Tech Stack:** PowerShell, BurntToast

---

### Task 1: 简化 notify-toast.ps1

**Files:**
- Modify: `notify-hook/skills/setup/scripts/notify-toast.ps1`

- [ ] **Step 1: 替换整个文件内容**

将 `notify-toast.ps1` 替换为以下内容（移除 `$Delay`、`$StartedAt` 参数、activity 文件逻辑、Start-Sleep 等待）：

```powershell
# notify-toast.ps1 - Shows BurntToast notification, click body to focus window
# If target window is foreground, skip notification silently.

param(
    [long]$Hwnd = 0,
    [string]$Message = '需要你的输入'
)

Import-Module BurntToast

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WindowState {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);
}
"@

$targetHwnd = [IntPtr]::new($Hwnd)
if (-not [WindowState]::IsWindow($targetHwnd)) {
    exit 0
}

$foregroundHwnd = [WindowState]::GetForegroundWindow()
if ($foregroundHwnd -eq $targetHwnd) {
    exit 0
}

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

- [ ] **Step 2: 验证文件内容正确**

读取文件确认：无 `$Delay`、`$StartedAt`、`Start-Sleep`、`activityFile` 相关代码。

- [ ] **Step 3: 提交**

```bash
git add notify-hook/skills/setup/scripts/notify-toast.ps1
git commit -m "refactor: 前台窗口跳过通知，移除延迟等待逻辑"
```

---

### Task 2: 清理 notify-hook.ps1 的 Delay 参数

**Files:**
- Modify: `notify-hook/skills/setup/scripts/notify-hook.ps1`

- [ ] **Step 1: 替换整个文件内容**

移除 `$Delay` 参数，`Start-Process` 不再传递 `-Delay` 和 `-StartedAt`：

```powershell
# notify-hook.ps1 - Claude Code Notification hook entry point
# Resolves the current host window (VS Code or standalone terminal)
# and launches the background toast handler.

param(
    [string]$Message = '需要你的输入'
)

$proc = Get-Process -Id $PID
$targetHwnd = [IntPtr]::Zero

while ($proc) {
    if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
        $targetHwnd = $proc.MainWindowHandle
        break
    }
    if ($proc.Parent) {
        try { $proc = Get-Process -Id $proc.Parent.Id -ErrorAction Stop } catch { break }
    } else {
        break
    }
}

if ($targetHwnd -eq [IntPtr]::Zero) {
    exit 0
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$toastScript = Join-Path $scriptDir 'notify-toast.ps1'

Start-Process pwsh -ArgumentList '-NoProfile', '-File', $toastScript, '-Hwnd', $targetHwnd.ToInt64(), '-Message', $Message -WindowStyle Hidden
```

- [ ] **Step 2: 提交**

```bash
git add notify-hook/skills/setup/scripts/notify-hook.ps1
git commit -m "refactor: 移除 notify-hook Delay 参数传递"
```

---

### Task 3: 更新 SKILL.md hooks 配置

**Files:**
- Modify: `notify-hook/skills/setup/SKILL.md`

- [ ] **Step 1: 移除 hooks 配置中的 `-Delay` 参数**

将 SKILL.md 中两处 hook 命令的 `-Delay` 参数移除：

原：
```
pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1 -Message '需要权限审批' -Delay 10
```

改为：
```
pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1 -Message '需要权限审批'
```

原：
```
pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1 -Message '等待你的输入' -Delay 60
```

改为：
```
pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1 -Message '等待你的输入'
```

- [ ] **Step 2: 提交**

```bash
git add notify-hook/skills/setup/SKILL.md
git commit -m "docs: 更新 SKILL.md hooks 配置移除 Delay 参数"
```
