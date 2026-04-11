# notify-hook 插件实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有的 Windows Toast 通知 hook 系统封装为 cj-cc-marketplace 插件，支持一键安装。

**Architecture:** 创建 `notify-hook` 插件目录，包含 `setup` skill。skill 内嵌 3 个 PowerShell 脚本作为安装资源，安装时由 Claude 读取脚本、复制到 `~/.claude/scripts/`、注册 `claude-focus://` 协议、写入 hooks 配置。

**Tech Stack:** Claude Code marketplace plugin 体系、PowerShell、Windows Registry、BurntToast

---

## File Structure

```text
创建:
  notify-hook/.claude-plugin/plugin.json                  — 插件元数据
  notify-hook/skills/setup/SKILL.md                       — setup skill 指令
  notify-hook/skills/setup/scripts/notify-hook.ps1        — 入口脚本（从现有复制）
  notify-hook/skills/setup/scripts/notify-toast.ps1       — Toast 通知脚本（从现有复制）
  notify-hook/skills/setup/scripts/focus-window.ps1       — 协议处理器（从现有复制）

修改:
  .claude-plugin/marketplace.json                         — 注册新插件
```

---

### Task 1: 创建插件目录结构和 plugin.json

**Files:**
- Create: `notify-hook/.claude-plugin/plugin.json`

- [ ] **Step 1: 创建目录并写入 plugin.json**

```json
{
  "name": "notify-hook",
  "description": "Windows Toast 通知 hook，支持权限审批和空闲等待提醒，点击通知聚焦 Claude Code 窗口",
  "version": "1.0.0",
  "repository": "https://github.com/changju-web/cj-cc-marketplace",
  "author": {
    "name": "wangjiahui",
    "email": "13226651554@163.com",
    "url": "https://github.com/TurtleWXG"
  }
}
```

---

### Task 2: 复制 PowerShell 脚本到插件目录

**Files:**
- Create: `notify-hook/skills/setup/scripts/notify-hook.ps1`
- Create: `notify-hook/skills/setup/scripts/notify-toast.ps1`
- Create: `notify-hook/skills/setup/scripts/focus-window.ps1`

- [ ] **Step 1: 复制 notify-hook.ps1**

将 `~/.claude/scripts/notify-hook.ps1` 的内容原样写入 `notify-hook/skills/setup/scripts/notify-hook.ps1`：

```powershell
# notify-hook.ps1 - Claude Code Notification hook entry point
# Resolves the current host window (VS Code or standalone terminal)
# and launches the background toast handler.

param(
    [string]$Message = '需要你的输入',
    [int]$Delay = 0
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

Start-Process pwsh -ArgumentList '-NoProfile', '-File', $toastScript, '-Hwnd', $targetHwnd.ToInt64(), '-Message', $Message, '-Delay', $Delay -WindowStyle Hidden
```

- [ ] **Step 2: 复制 notify-toast.ps1**

将 `~/.claude/scripts/notify-toast.ps1` 的内容原样写入 `notify-hook/skills/setup/scripts/notify-toast.ps1`：

```powershell
# notify-toast.ps1 - Shows BurntToast notification, click body to focus window
# If target window is foreground, wait for Delay seconds before notifying.
# If target window is not foreground, notify immediately.
# If new activity is recorded after the notification starts waiting, cancel the toast.

param(
    [long]$Hwnd = 0,
    [string]$Message = '需要你的输入',
    [int]$Delay = 0,
    [long]$StartedAt = 0
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

$stateDir = Join-Path $env:TEMP 'claude-notify'
$activityFile = Join-Path $stateDir ("activity-" + $Hwnd + ".txt")

$foregroundHwnd = [WindowState]::GetForegroundWindow()
$shouldDelay = ($Delay -gt 0 -and $foregroundHwnd -eq $targetHwnd)

if ($shouldDelay) {
    Start-Sleep -Seconds $Delay

    if (-not [WindowState]::IsWindow($targetHwnd)) {
        exit 0
    }

    if (Test-Path $activityFile) {
        $lastActivity = [long](Get-Content $activityFile -Raw).Trim()
        if ($lastActivity -gt $StartedAt) {
            exit 0
        }
    }

    $foregroundHwnd = [WindowState]::GetForegroundWindow()
    if ($foregroundHwnd -ne $targetHwnd) {
        exit 0
    }
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

- [ ] **Step 3: 复制 focus-window.ps1**

将 `~/.claude/scripts/focus-window.ps1` 的内容原样写入 `notify-hook/skills/setup/scripts/focus-window.ps1`：

```powershell
# focus-window.ps1 - Protocol handler for claude-focus://
# Reads saved HWND and brings that window to front

param([string]$Uri = '')

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

$hwndFile = Join-Path $env:TEMP 'claude-notify-hwnd.txt'
if (Test-Path $hwndFile) {
    $hwndVal = [long](Get-Content $hwndFile -Raw).Trim()
    $hwnd = [IntPtr]::new($hwndVal)

    if ([FocusWindow]::IsWindow($hwnd)) {
        [FocusWindow]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
        [FocusWindow]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
        if ([FocusWindow]::IsIconic($hwnd)) {
            [FocusWindow]::ShowWindow($hwnd, 9)  # SW_RESTORE only if minimized
        }
        [FocusWindow]::SetForegroundWindow($hwnd)
    }
}
```

---

### Task 3: 创建 setup SKILL.md

**Files:**
- Create: `notify-hook/skills/setup/SKILL.md`

- [ ] **Step 1: 创建 SKILL.md**

SKILL.md 是插件的核心文件，定义了 `notify-hook:setup` 被触发时 Claude 应执行的完整安装流程：

```markdown
---
name: setup
description: 初始化 Windows Toast 通知 hook，复制脚本、注册 claude-focus:// 协议、写入 hooks 配置。用户执行 notify-hook:setup 时触发。
---

# Setup - Windows Toast 通知 Hook

## Overview

这个 skill 用于初始化 Windows Toast 通知系统。安装后，Claude Code 在需要权限审批或等待用户输入时，会弹出 Windows Toast 通知，用户点击通知可聚焦回 Claude Code 窗口。

## When to Use

当用户执行 `notify-hook:setup` 时触发此 skill。

## When NOT to Use

- 用户只是询问通知系统如何工作（解释即可，不执行安装）
- 用户要求修改通知配置（当前版本不支持自定义配置）
- 非 Windows 系统（不支持）

## Prerequisites

安装前必须确认以下条件：

### 1. 操作系统检查

运行：

```powershell
$IsWindows
```

如果返回 `$false` 或变量不存在（非 PowerShell Core），终止安装并提示：

> 此插件仅支持 Windows 系统。

### 2. PowerShell 检查

运行：

```powershell
pwsh.exe -Command '$PSVersionTable.PSVersion.ToString()'
```

如果命令失败，终止安装并提示：

> 需要安装 PowerShell 7+，请访问 https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-windows

### 3. BurntToast 模块检查

运行：

```powershell
pwsh.exe -Command 'Get-Module -ListAvailable BurntToast | Select-Object -First 1 -ExpandProperty Version'
```

如果没有输出（模块未安装），提示用户：

> 需要安装 BurntToast 模块。请运行以下命令后重新执行 setup：
>
> ```powershell
> pwsh.exe -Command 'Install-Module BurntToast -Scope CurrentUser -Force'
> ```

等待用户确认安装完成后再继续。

## Installation Steps

前置检查通过后，按以下顺序执行安装。

### Step 1: 创建脚本目录

```powershell
$scriptsDir = Join-Path $env:USERPROFILE '.claude\scripts'
if (-not (Test-Path $scriptsDir)) {
    New-Item -ItemType Directory -Path $scriptsDir -Force
}
```

### Step 2: 复制脚本

将插件目录中 `skills/setup/scripts/` 下的 3 个脚本复制到 `~/.claude/scripts/`。

对于每个脚本文件，检查目标是否已存在且内容一致：

```powershell
$sourceDir = '<插件 skills/setup/scripts 目录的绝对路径>'
$destDir = Join-Path $env:USERPROFILE '.claude\scripts'
$scripts = @('notify-hook.ps1', 'notify-toast.ps1', 'focus-window.ps1')

foreach ($script in $scripts) {
    $src = Join-Path $sourceDir $script
    $dst = Join-Path $destDir $script

    if ((Test-Path $dst) -and ((Get-FileHash $src).Hash -eq (Get-FileHash $dst).Hash)) {
        # 跳过，内容一致
    } else {
        Copy-Item -Path $src -Destination $dst -Force
    }
}
```

实际执行时，使用 Claude Code 的 Read 工具读取插件目录中每个脚本的内容，然后用 Write 工具写入 `~/.claude/scripts/` 对应文件。

### Step 3: 注册 claude-focus:// 协议

```powershell
$focusScript = Join-Path $env:USERPROFILE '.claude\scripts\focus-window.ps1'

New-Item -Path 'HKCU:\SOFTWARE\Classes\claude-focus' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Classes\claude-focus' -Name '(Default)' -Value 'URL:claude-focus Protocol'
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Classes\claude-focus' -Name 'URL Protocol' -Value ''
New-Item -Path 'HKCU:\SOFTWARE\Classes\claude-focus\shell\open\command' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Classes\claude-focus\shell\open\command' -Name '(Default)' -Value "pwsh.exe -NoProfile -File `"$focusScript`" -Uri '%1'"
```

通过 Bash 工具执行以上 PowerShell 命令：

```bash
pwsh.exe -Command '上述 PowerShell 代码（单行转义）'
```

### Step 4: 写入 hooks 配置

读取 `~/.claude/settings.json`，在 `hooks` 对象中写入 `Notification` 配置。

需要写入的配置：

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1 -Message '需要权限审批' -Delay 10"
          }
        ]
      },
      {
        "matcher": "idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1 -Message '等待你的输入' -Delay 60"
          }
        ]
      }
    ]
  }
}
```

合并逻辑：

1. 使用 Read 工具读取 `~/.claude/settings.json`
2. 如果 `hooks` 对象不存在，直接添加整个 `hooks` 节点
3. 如果 `hooks` 存在但 `Notification` 不存在，在 `hooks` 中添加 `Notification` 数组
4. 如果 `hooks.Notification` 已存在：
   - 检查是否已包含 `matcher` 为 `permission_prompt` 和 `idle_prompt` 的条目
   - 缺少的条目追加，已存在的跳过
5. 使用 Edit 工具写入更新后的 settings.json

**注意：** 不要破坏 settings.json 中已有的其他配置项。只修改 `hooks` 相关的部分。

### Step 5: 完成提示

安装完成后，向用户输出：

> notify-hook 安装完成！
>
> - 3 个脚本已复制到 ~/.claude/scripts/
> - claude-focus:// 协议已注册
> - hooks 配置已写入 settings.json
>
> 请重启 Claude Code 使 hooks 生效。

## Error Handling

| 场景 | 处理方式 |
|------|----------|
| 非 Windows 系统 | 终止安装，提示仅支持 Windows |
| PowerShell 不可用 | 终止安装，提示安装 PowerShell |
| BurntToast 未安装 | 提示安装命令，等待确认后继续 |
| settings.json 解析失败 | 终止安装，提示手动检查配置文件 |
| 协议已注册 | 跳过注册，不报错 |
| hooks 已存在相同 matcher | 跳过该项，不重复添加 |
| 脚本内容一致 | 跳过复制，提示已是最新 |

## Update Behavior

当用户再次执行 `notify-hook:setup` 时：

1. 检测 `~/.claude/scripts/` 中的脚本与插件目录中的脚本是否一致
2. 如果不一致，提示用户有可用更新并询问是否覆盖
3. 用户确认后覆盖更新
4. hooks 和协议配置保持不变（幂等）
```

---

### Task 4: 更新 marketplace.json

**Files:**
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: 在 marketplace.json 中注册 notify-hook 插件**

在 `plugins` 数组中追加新条目，最终文件内容为：

```json
{
  "name": "cj-cc-marketplace",
  "owner": {
    "name": "长聚科技"
  },
  "plugins": [
    {
      "name": "ep-comp",
      "source": "./ep-comp",
      "description": "基于 @gx-web/ep-comp 的业务代码生成插件"
    },
    {
      "name": "notify-hook",
      "source": "./notify-hook",
      "description": "Windows Toast 通知 hook 插件"
    }
  ]
}
```

---

### Task 5: 提交

- [ ] **Step 1: 暂存所有文件并提交**

```bash
git add notify-hook/ .claude-plugin/marketplace.json
git commit -m "feat: add notify-hook plugin for Windows Toast notifications"
```
