# Multi-Instance Notify Fix 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复多 VS Code 实例同时运行 Claude Code 时，后台窗口的通知不弹出问题。

**Architecture:** 增强 `notify-hook.ps1` 的窗口句柄获取策略（进程树 + GetConsoleWindow 备选），将 HWND 从文件传递改为 URL 参数传递以消除多实例竞争，三个脚本均增加诊断日志。

**Tech Stack:** PowerShell 7, BurntToast, Windows Win32 API (P/Invoke)

---

### Task 1: 修改 notify-hook.ps1 — 增加备选窗口获取 + 日志

**Files:**

- Modify: `notify-hook/skills/setup/scripts/notify-hook.ps1`

- [ ] **Step 1: 替换整个 notify-hook.ps1**

将文件内容替换为以下代码：

```powershell
# notify-hook.ps1 - Claude Code Notification hook entry point
# Resolves the current host window (VS Code or standalone terminal)
# and launches the background toast handler.

param(
    [string]$Message = '需要你的输入',
    [switch]$Force
)

function Write-Log {
    param([string]$Msg)
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] [notify-hook] $Msg"
    Add-Content -Path (Join-Path $env:TEMP 'claude-notify-debug.log') -Value $line -ErrorAction SilentlyContinue
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ConsoleHelper {
    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();
}
"@

Write-Log "Triggered: Message='$Message' Force=$Force PID=$PID"

# Strategy 1: Process tree traversal (existing logic)
$proc = Get-Process -Id $PID
$targetHwnd = [IntPtr]::Zero
$strategy = 'none'

while ($proc) {
    Write-Log "  Process: $($proc.ProcessName) PID=$($proc.Id) HWND=$($proc.MainWindowHandle)"
    if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
        $targetHwnd = $proc.MainWindowHandle
        $strategy = 'process-tree'
        break
    }
    if ($proc.Parent) {
        try { $proc = Get-Process -Id $proc.Parent.Id -ErrorAction Stop } catch {
            Write-Log "  Parent lookup failed: $_"
            break
        }
    } else {
        Write-Log "  No parent, stopping traversal"
        break
    }
}

# Strategy 2: GetConsoleWindow fallback
if ($targetHwnd -eq [IntPtr]::Zero) {
    $consoleHwnd = [ConsoleHelper]::GetConsoleWindow()
    Write-Log "  GetConsoleWindow returned: $consoleHwnd"
    if ($consoleHwnd -ne [IntPtr]::Zero) {
        $targetHwnd = $consoleHwnd
        $strategy = 'console-window'
    }
}

if ($targetHwnd -eq [IntPtr]::Zero) {
    Write-Log "FAILED: No window handle found, exiting"
    exit 0
}

Write-Log "Found HWND=$($targetHwnd.ToInt64()) via $strategy"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$toastScript = Join-Path $scriptDir 'notify-toast.ps1'

$toastArgs = @('-NoProfile', '-File', $toastScript, '-Hwnd', $targetHwnd.ToInt64(), '-Message', $Message)
if ($Force) { $toastArgs += '-Force' }

Start-Process pwsh -ArgumentList $toastArgs -WindowStyle Hidden
```

- [ ] **Step 2: 验证文件内容**

Read 文件确认替换成功。

- [ ] **Step 3: Commit**

```bash
git add notify-hook/skills/setup/scripts/notify-hook.ps1
git commit -m "fix: 增强 notify-hook 窗口句柄获取，增加 GetConsoleWindow 备选和日志"
```

---

### Task 2: 修改 notify-toast.ps1 — HWND 编码到 URL + 日志

**Files:**

- Modify: `notify-hook/skills/setup/scripts/notify-toast.ps1`

- [ ] **Step 1: 替换整个 notify-toast.ps1**

将文件内容替换为以下代码：

```powershell
# notify-toast.ps1 - Shows BurntToast notification, click body to focus window
# If target window is foreground, skip notification silently.
# HWND is encoded in protocol URL to avoid multi-instance file race.

param(
    [long]$Hwnd = 0,
    [string]$Message = '需要你的输入',
    [switch]$Force
)

function Write-Log {
    param([string]$Msg)
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] [notify-toast] $Msg"
    Add-Content -Path (Join-Path $env:TEMP 'claude-notify-debug.log') -Value $line -ErrorAction SilentlyContinue
}

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

Write-Log "Triggered: Hwnd=$Hwnd Message='$Message' Force=$Force"

$targetHwnd = [IntPtr]::new($Hwnd)
if (-not [WindowState]::IsWindow($targetHwnd)) {
    Write-Log "SKIP: Invalid window handle $Hwnd"
    exit 0
}

$foregroundHwnd = [WindowState]::GetForegroundWindow()
Write-Log "Foreground=$($foregroundHwnd.ToInt64()) Target=$Hwnd"

if ((-not $Force) -and ($foregroundHwnd -eq $targetHwnd)) {
    Write-Log "SKIP: Target window is already foreground"
    exit 0
}

# Encode HWND in protocol URL (no file-based state sharing)
$launchUrl = "claude-focus://activate?hwnd=$Hwnd"

# Build toast with body-click protocol activation (no button)
$text1 = New-BTText -Text 'Claude Code'
$text2 = New-BTText -Text $Message
$binding = New-BTBinding -Children $text1, $text2
$visual = New-BTVisual -BindingGeneric $binding
$content = New-BTContent -Visual $visual -ActivationType Protocol -Launch $launchUrl -Audio (New-BTAudio -Source 'ms-winsoundevent:Notification.IM')

Submit-BTNotification -Content $content
Write-Log "Toast shown with launch URL: $launchUrl"
```

- [ ] **Step 2: 验证文件内容**

Read 文件确认替换成功。

- [ ] **Step 3: Commit**

```bash
git add notify-hook/skills/setup/scripts/notify-toast.ps1
git commit -m "fix: notify-toast 将 HWND 编码到协议 URL，消除多实例文件竞争"
```

---

### Task 3: 修改 focus-window.ps1 — 从 URL 解析 HWND + 日志

**Files:**

- Modify: `notify-hook/skills/setup/scripts/focus-window.ps1`

- [ ] **Step 1: 替换整个 focus-window.ps1**

将文件内容替换为以下代码：

```powershell
# focus-window.ps1 - Protocol handler for claude-focus://
# Parses HWND from URL parameter and brings that window to front

param([string]$Uri = '')

function Write-Log {
    param([string]$Msg)
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] [focus-window] $Msg"
    Add-Content -Path (Join-Path $env:TEMP 'claude-notify-debug.log') -Value $line -ErrorAction SilentlyContinue
}

Write-Log "Triggered: Uri='$Uri'"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FocusWindow {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
}
"@

# Parse HWND from URL parameter: claude-focus://activate?hwnd=123456
if ($Uri -match 'hwnd=(\d+)') {
    $hwndVal = [long]$Matches[1]
    Write-Log "Parsed hwnd=$hwndVal from URL"
} else {
    # Fallback: read from temp file (backward compatibility)
    $hwndFile = Join-Path $env:TEMP 'claude-notify-hwnd.txt'
    if (Test-Path $hwndFile) {
        $hwndVal = [long](Get-Content $hwndFile -Raw).Trim()
        Write-Log "Parsed hwnd=$hwndVal from file (fallback)"
    } else {
        Write-Log "FAILED: No hwnd in URL and no fallback file"
        exit 1
    }
}

$hwnd = [IntPtr]::new($hwndVal)

if (-not [FocusWindow]::IsWindow($hwnd)) {
    Write-Log "FAILED: Invalid window handle $hwndVal"
    exit 1
}

# ALT key trick to work around SetForegroundWindow restrictions
[FocusWindow]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
[FocusWindow]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)

if ([FocusWindow]::IsIconic($hwnd)) {
    [FocusWindow]::ShowWindow($hwnd, 9)  # SW_RESTORE only if minimized
}

[FocusWindow]::SetForegroundWindow($hwnd)
Write-Log "Focused window hwnd=$hwndVal"
```

- [ ] **Step 2: 验证文件内容**

Read 文件确认替换成功。

- [ ] **Step 3: Commit**

```bash
git add notify-hook/skills/setup/scripts/focus-window.ps1
git commit -m "fix: focus-window 从 URL 参数解析 HWND，保留文件读取向后兼容"
```

---

### Task 4: 重新安装并验证

**Files:**

- 无代码改动

- [ ] **Step 1: 执行 `notify-hook:setup` 重新安装脚本**

运行安装命令，将更新后的脚本复制到 `~/.claude/scripts/`。

- [ ] **Step 2: 手动验证 — 单窗口测试**

1. 打开一个 VS Code 窗口，启动 Claude Code
2. 触发一个需要权限的操作
3. 确认 Toast 通知弹出
4. 点击通知，确认窗口聚焦正常

- [ ] **Step 3: 手动验证 — 双窗口测试**

1. 打开两个独立 VS Code 实例，都启动 Claude Code
2. B 窗口置前，在 B 中工作
3. A 窗口的 Claude Code 触发需要权限的操作
4. 确认 Toast 通知弹出
5. 点击通知，确认 A 窗口被正确聚焦

- [ ] **Step 4: 检查日志**

```powershell
pwsh.exe -Command "Get-Content $env:TEMP\claude-notify-debug.log -Tail 30"
```

确认日志中记录了完整的窗口查找过程和结果。

- [ ] **Step 5: Commit 最终状态**

如果验证通过：

```bash
git add -A
git commit -m "chore: 多实例通知修复验证通过"
```
