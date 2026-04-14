# Session-Bound Multi-Window Notify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让每个 Claude Code 会话绑定到它所属的 VS Code 窗口，在多 VS Code 窗口场景下，A 窗口前台工作时，B 窗口的会话触发通知会只闪烁 B 的任务栏按钮。

**Architecture:** 不再依赖 Notification hook 触发时的父进程链临时推断窗口，而是在 `SessionStart` / `UserPromptSubmit` 时用 `session_id -> HWND` 建立绑定，在 `SessionEnd` 时清理绑定。`notify-hook.ps1` 在 Notification 事件中先读取 stdin JSON 中的 `session_id`，优先使用绑定的 HWND，只有绑定缺失或失效时才回退到当前的进程链解析逻辑。

**Tech Stack:** PowerShell 7, Claude Code hooks (`SessionStart`, `UserPromptSubmit`, `SessionEnd`, `Notification`), Windows Win32 API (`FlashWindowEx`, `GetForegroundWindow`, `GetAncestor`, `GetConsoleWindow`, `IsWindow`)

---

## File Structure

- Create: `notify-hook/skills/setup/scripts/notify-session-bindings.ps1`
  - 负责 `session_id -> hwnd` 的 JSON 存储、读取、更新、删除
- Create: `notify-hook/skills/setup/scripts/notify-session-window.ps1`
  - 负责在 `SessionStart` / `UserPromptSubmit` / `SessionEnd` 时读取 hook stdin，写入或删除绑定
- Modify: `notify-hook/skills/setup/scripts/notify-hook.ps1`
  - 负责在 Notification 时优先读取绑定的 HWND，再做前台判断和任务栏闪烁
- Modify: `notify-hook/skills/setup/SKILL.md`
  - 更新安装说明：复制额外脚本、写入 `SessionStart` / `UserPromptSubmit` / `SessionEnd` / `Notification` hooks
- Modify: `C:/Users/13226/.claude/scripts/notify-hook.ps1`
  - 同步本地已安装脚本
- Create: `C:/Users/13226/.claude/scripts/notify-session-window.ps1`
  - 本地新增会话绑定脚本
- Modify: `C:/Users/13226/.claude/settings.json`
  - 增加 `SessionStart` / `UserPromptSubmit` / `SessionEnd` hooks，并保留现有 `Notification`

---

### Task 1: 新增会话绑定存储脚本

**Files:**

- Create: `notify-hook/skills/setup/scripts/notify-session-bindings.ps1`
- Test: `notify-hook/skills/setup/scripts/notify-session-bindings.ps1`

- [ ] **Step 1: 写失败测试（先在临时 PowerShell 命令里验证 API 设计）**

运行下面的命令，确认在实现前会失败，因为 `notify-session-bindings.ps1` 还不存在。

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-session-bindings-test.json'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
. ./notify-hook/skills/setup/scripts/notify-session-bindings.ps1
Set-NotifySessionBinding -SessionId 's-1' -Hwnd 12345
$record = Get-NotifySessionBinding -SessionId 's-1'
if ($record.hwnd -ne 12345) { throw 'expected hwnd=12345' }
Remove-NotifySessionBinding -SessionId 's-1'
$record = Get-NotifySessionBinding -SessionId 's-1'
if ($null -ne $record) { throw 'expected record removed' }
"
```

Expected: FAIL，报 `notify-session-bindings.ps1` 不存在或函数未定义。

- [ ] **Step 2: 创建 `notify-session-bindings.ps1` 的最小实现**

将文件写成以下内容：

```powershell
function Get-NotifySessionBindingsPath {
    if ($env:CLAUDE_NOTIFY_BINDINGS_FILE) {
        return $env:CLAUDE_NOTIFY_BINDINGS_FILE
    }

    return (Join-Path $env:USERPROFILE '.claude\notify-session-bindings.json')
}

function Read-NotifySessionBindings {
    $path = Get-NotifySessionBindingsPath

    if (-not (Test-Path $path)) {
        return @{}
    }

    $raw = Get-Content -Path $path -Raw -ErrorAction SilentlyContinue
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return @{}
    }

    $parsed = $raw | ConvertFrom-Json -AsHashtable
    if ($null -eq $parsed) {
        return @{}
    }

    return $parsed
}

function Write-NotifySessionBindings {
    param([hashtable]$Bindings)

    $path = Get-NotifySessionBindingsPath
    $dir = Split-Path -Parent $path
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $Bindings | ConvertTo-Json -Depth 5 | Set-Content -Path $path
}

function Set-NotifySessionBinding {
    param(
        [Parameter(Mandatory = $true)][string]$SessionId,
        [Parameter(Mandatory = $true)][long]$Hwnd
    )

    $bindings = Read-NotifySessionBindings
    $bindings[$SessionId] = @{
        hwnd = $Hwnd
        updatedAt = (Get-Date).ToString('o')
    }
    Write-NotifySessionBindings -Bindings $bindings
}

function Get-NotifySessionBinding {
    param([Parameter(Mandatory = $true)][string]$SessionId)

    $bindings = Read-NotifySessionBindings
    if ($bindings.ContainsKey($SessionId)) {
        return $bindings[$SessionId]
    }

    return $null
}

function Remove-NotifySessionBinding {
    param([Parameter(Mandatory = $true)][string]$SessionId)

    $bindings = Read-NotifySessionBindings
    if ($bindings.ContainsKey($SessionId)) {
        $bindings.Remove($SessionId)
        Write-NotifySessionBindings -Bindings $bindings
    }
}
```

- [ ] **Step 3: 运行测试，确认转绿**

Run:

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-session-bindings-test.json'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
. ./notify-hook/skills/setup/scripts/notify-session-bindings.ps1
Set-NotifySessionBinding -SessionId 's-1' -Hwnd 12345
$record = Get-NotifySessionBinding -SessionId 's-1'
if ($record.hwnd -ne 12345) { throw 'expected hwnd=12345' }
Remove-NotifySessionBinding -SessionId 's-1'
$record = Get-NotifySessionBinding -SessionId 's-1'
if ($null -ne $record) { throw 'expected record removed' }
Write-Host 'PASS'
"
```

Expected: 输出 `PASS`。

- [ ] **Step 4: Commit**

```bash
git add notify-hook/skills/setup/scripts/notify-session-bindings.ps1
git commit -m "feat: 新增 Claude 会话窗口绑定存储脚本"
```

---

### Task 2: 新增会话窗口绑定 hook 脚本

**Files:**

- Modify: `notify-hook/skills/setup/scripts/notify-session-bindings.ps1`
- Create: `notify-hook/skills/setup/scripts/notify-session-window.ps1`
- Test: `notify-hook/skills/setup/scripts/notify-session-window.ps1`

- [ ] **Step 1: 写失败测试（SessionStart / UserPromptSubmit 应写入绑定）**

运行下面命令，确认在实现前失败，因为 `notify-session-window.ps1` 还不存在。

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-session-window-test.json'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
'{"session_id":"session-bind-test"}' | pwsh.exe -NoProfile -File ./notify-hook/skills/setup/scripts/notify-session-window.ps1 -Mode bind
$bindings = Get-Content -Path $bindingsFile -Raw | ConvertFrom-Json -AsHashtable
if (-not $bindings.ContainsKey('session-bind-test')) { throw 'expected session binding created' }
Write-Host 'PASS'
"
```

Expected: FAIL，报脚本不存在。

- [ ] **Step 2: 创建 `notify-session-window.ps1` 的最小实现**

将文件写成以下内容：

```powershell
param(
    [ValidateSet('bind', 'clear')]
    [string]$Mode = 'bind'
)

. (Join-Path $PSScriptRoot 'notify-session-bindings.ps1')

function Write-Log {
    param([string]$Msg)

    $logFile = Join-Path $env:TEMP 'claude-notify-debug.log'
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logFile -Value "[$ts] [notify-session-window] $Msg" -ErrorAction SilentlyContinue
}

function Read-HookPayload {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    return ($raw | ConvertFrom-Json)
}

if (-not ('NotifySessionWindowHelper' -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class NotifySessionWindowHelper {
    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();
}
"@
}

function Get-CurrentHostWindowHandle {
    try {
        $proc = Get-Process -Id $PID -ErrorAction Stop
    } catch {
        return 0
    }

    while ($proc) {
        if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
            return $proc.MainWindowHandle.ToInt64()
        }

        if ($proc.Parent) {
            try {
                $proc = Get-Process -Id $proc.Parent.Id -ErrorAction Stop
            } catch {
                break
            }
        } else {
            break
        }
    }

    $consoleHwnd = [NotifySessionWindowHelper]::GetConsoleWindow()
    if ($consoleHwnd -ne [IntPtr]::Zero) {
        return $consoleHwnd.ToInt64()
    }

    return 0
}

$payload = Read-HookPayload
if ($null -eq $payload -or [string]::IsNullOrWhiteSpace($payload.session_id)) {
    Write-Log 'SKIP: missing session_id in hook payload'
    exit 0
}

$sessionId = [string]$payload.session_id

if ($Mode -eq 'clear') {
    Remove-NotifySessionBinding -SessionId $sessionId
    Write-Log "Removed binding for session_id=$sessionId"
    exit 0
}

$hwnd = Get-CurrentHostWindowHandle
if ($hwnd -le 0) {
    Write-Log "SKIP: could not resolve host window for session_id=$sessionId"
    exit 0
}

Set-NotifySessionBinding -SessionId $sessionId -Hwnd $hwnd
Write-Log "Bound session_id=$sessionId to hwnd=$hwnd"
```

- [ ] **Step 3: 运行绑定测试，确认转绿**

Run:

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-session-window-test.json'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
'{"session_id":"session-bind-test"}' | pwsh.exe -NoProfile -File ./notify-hook/skills/setup/scripts/notify-session-window.ps1 -Mode bind
$bindings = Get-Content -Path $bindingsFile -Raw | ConvertFrom-Json -AsHashtable
if (-not $bindings.ContainsKey('session-bind-test')) { throw 'expected session binding created' }
if ([long]$bindings['session-bind-test'].hwnd -le 0) { throw 'expected hwnd > 0' }
Write-Host 'PASS'
"
```

Expected: 输出 `PASS`。

- [ ] **Step 4: 写失败测试（SessionEnd 应清理绑定）**

Run:

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-session-window-clear-test.json'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
. ./notify-hook/skills/setup/scripts/notify-session-bindings.ps1
Set-NotifySessionBinding -SessionId 'session-clear-test' -Hwnd 99999
'{"session_id":"session-clear-test"}' | pwsh.exe -NoProfile -File ./notify-hook/skills/setup/scripts/notify-session-window.ps1 -Mode clear
$bindings = Read-NotifySessionBindings
if ($bindings.ContainsKey('session-clear-test')) { throw 'expected session binding removed' }
Write-Host 'PASS'
"
```

Expected: 实现前可能失败；实现后输出 `PASS`。

- [ ] **Step 5: Commit**

```bash
git add notify-hook/skills/setup/scripts/notify-session-bindings.ps1 notify-hook/skills/setup/scripts/notify-session-window.ps1
git commit -m "feat: 通过 hooks 绑定 Claude 会话与窗口句柄"
```

---

### Task 3: 修改通知脚本，优先使用会话绑定窗口

**Files:**

- Modify: `notify-hook/skills/setup/scripts/notify-hook.ps1`
- Modify: `notify-hook/skills/setup/scripts/notify-session-bindings.ps1`
- Test: `notify-hook/skills/setup/scripts/notify-hook.ps1`

- [ ] **Step 1: 写失败测试（带 session_id 的 Notification 应优先命中绑定）**

这个测试先验证“脚本不会忽略 stdin 里的 `session_id`”。实现前会失败，因为当前 `notify-hook.ps1` 完全不读 stdin。

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-target-selection-test.json'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
. ./notify-hook/skills/setup/scripts/notify-session-bindings.ps1
Set-NotifySessionBinding -SessionId 'session-notify-test' -Hwnd 12345
'{"session_id":"session-notify-test","message":"等待你的输入"}' | pwsh.exe -NoProfile -File ./notify-hook/skills/setup/scripts/notify-hook.ps1
$log = Get-Content (Join-Path $env:TEMP 'claude-notify-debug.log') -Tail 20
if (-not ($log -match 'session-notify-test')) { throw 'expected notify-hook to log session_id usage' }
Write-Host 'PASS'
"
```

Expected: FAIL，因为当前脚本不会记录 `session_id`，也不会尝试使用绑定。

- [ ] **Step 2: 修改 `notify-hook.ps1`，读取 stdin 并优先使用绑定 HWND**

将文件调整为以下结构（保留现有前台检测和闪烁逻辑，只替换目标窗口解析部分）：

```powershell
# notify-hook.ps1 - Claude Code Notification hook entry point
# Flashes the taskbar button of the host window (VS Code or terminal)
# when Claude Code needs user attention. No external dependencies needed.

param(
    [switch]$Force
)

. (Join-Path $PSScriptRoot 'notify-session-bindings.ps1')

function Write-Log {
    param([string]$Msg)
    $logFile = Join-Path $env:TEMP 'claude-notify-debug.log'
    if ((Test-Path $logFile) -and ((Get-Item $logFile).Length -gt 1MB)) {
        $lines = Get-Content $logFile -Tail 100
        $lines | Set-Content $logFile -ErrorAction SilentlyContinue
    }
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] [notify-hook] $Msg"
    Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

function Read-HookPayload {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    try {
        return ($raw | ConvertFrom-Json)
    } catch {
        Write-Log "FAILED: invalid hook payload json: $_"
        return $null
    }
}

if (-not ('NotifyHelper' -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
public class FLASHWINFO {
    public uint cbSize;
    public IntPtr hwnd;
    public uint dwFlags;
    public uint uCount;
    public uint dwTimeout;
}

public class NotifyHelper {
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool FlashWindowEx(FLASHWINFO pfwi);

    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr GetAncestor(IntPtr hwnd, uint gaFlags);

    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hwnd);
}
"@
}

function Get-FallbackHostWindowHandle {
    try { $proc = Get-Process -Id $PID -ErrorAction Stop } catch { $proc = $null }
    while ($proc) {
        Write-Log "  Process: $($proc.ProcessName) PID=$($proc.Id) HWND=$($proc.MainWindowHandle)"
        if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
            return @{
                hwnd = $proc.MainWindowHandle
                strategy = 'process-tree'
            }
        }
        if ($proc.Parent) {
            try { $proc = Get-Process -Id $proc.Parent.Id -ErrorAction Stop } catch { break }
        } else {
            break
        }
    }

    $consoleHwnd = [NotifyHelper]::GetConsoleWindow()
    if ($consoleHwnd -ne [IntPtr]::Zero) {
        return @{
            hwnd = $consoleHwnd
            strategy = 'console-window'
        }
    }

    return @{
        hwnd = [IntPtr]::Zero
        strategy = 'none'
    }
}

$payload = Read-HookPayload
$sessionId = if ($payload) { [string]$payload.session_id } else { '' }
Write-Log "Triggered: Force=$Force PID=$PID session_id=$sessionId"

$targetHwnd = [IntPtr]::Zero
$strategy = 'none'

if (-not [string]::IsNullOrWhiteSpace($sessionId)) {
    $binding = Get-NotifySessionBinding -SessionId $sessionId
    if ($null -ne $binding -and [long]$binding.hwnd -gt 0) {
        $boundHwnd = [IntPtr]::new([long]$binding.hwnd)
        if ([NotifyHelper]::IsWindow($boundHwnd)) {
            $targetHwnd = $boundHwnd
            $strategy = 'session-binding'
            Write-Log "Using bound hwnd=$($targetHwnd.ToInt64()) for session_id=$sessionId"
        } else {
            Write-Log "SKIP: bound hwnd=$($binding.hwnd) is no longer valid for session_id=$sessionId"
        }
    }
}

if ($targetHwnd -eq [IntPtr]::Zero) {
    $fallback = Get-FallbackHostWindowHandle
    $targetHwnd = $fallback.hwnd
    $strategy = $fallback.strategy
}

if ($targetHwnd -eq [IntPtr]::Zero) {
    Write-Log 'FAILED: No window handle found, exiting'
    exit 0
}

Write-Log "Found HWND=$($targetHwnd.ToInt64()) via $strategy"

$root = [NotifyHelper]::GetAncestor($targetHwnd, 2)
$foreground = [NotifyHelper]::GetForegroundWindow()
if ((-not $Force) -and ($root -eq $foreground)) {
    Write-Log "窗口已在前台 (root=$($root.ToInt64()) fg=$($foreground.ToInt64()))，跳过通知"
    exit 0
}
Write-Log "窗口不在前台 (root=$($root.ToInt64()) fg=$($foreground.ToInt64()))，触发闪烁"

$fw = New-Object FLASHWINFO
$fw.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($fw)
$fw.hwnd = $targetHwnd
$fw.dwFlags = 14
$fw.uCount = 0
$fw.dwTimeout = 0

$result = [NotifyHelper]::FlashWindowEx($fw)
Write-Log "FlashWindowEx result: $result"
```

- [ ] **Step 3: 运行测试，确认转绿**

Run:

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-target-selection-test.json'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
. ./notify-hook/skills/setup/scripts/notify-session-bindings.ps1
Set-NotifySessionBinding -SessionId 'session-notify-test' -Hwnd 12345
'{"session_id":"session-notify-test","message":"等待你的输入"}' | pwsh.exe -NoProfile -File ./notify-hook/skills/setup/scripts/notify-hook.ps1
$log = Get-Content (Join-Path $env:TEMP 'claude-notify-debug.log') -Tail 20
if (-not ($log -match 'session_id=session-notify-test')) { throw 'expected session_id log' }
if (-not ($log -match 'Using bound hwnd=')) { throw 'expected bound hwnd log' }
Write-Host 'PASS'
"
```

Expected: 输出 `PASS`。

- [ ] **Step 4: Commit**

```bash
git add notify-hook/skills/setup/scripts/notify-hook.ps1 notify-hook/skills/setup/scripts/notify-session-bindings.ps1
git commit -m "fix: 通知阶段优先使用 Claude 会话绑定窗口"
```

---

### Task 4: 更新安装 skill 与 hooks 配置

**Files:**

- Modify: `notify-hook/skills/setup/SKILL.md`
- Modify: `C:/Users/13226/.claude/settings.json`
- Create: `C:/Users/13226/.claude/scripts/notify-session-window.ps1`
- Modify: `C:/Users/13226/.claude/scripts/notify-hook.ps1`

- [ ] **Step 1: 更新 `SKILL.md` 的 hooks 配置说明**

把示例配置更新为：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-session-window.ps1 -Mode bind"
          }
        ]
      },
      {
        "matcher": "resume",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-session-window.ps1 -Mode bind"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-session-window.ps1 -Mode bind"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-session-window.ps1 -Mode clear"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1"
          }
        ]
      },
      {
        "matcher": "idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1"
          }
        ]
      }
    }
  }
}
```

并把复制脚本说明从“复制一个脚本”改成“复制两个脚本”。

- [ ] **Step 2: 同步安装到本地 `~/.claude/scripts/`**

Run:

```bash
cp "D:/Develop/Project/cj-cc-marketplace/notify-hook/skills/setup/scripts/notify-hook.ps1" "C:/Users/13226/.claude/scripts/notify-hook.ps1"
cp "D:/Develop/Project/cj-cc-marketplace/notify-hook/skills/setup/scripts/notify-session-window.ps1" "C:/Users/13226/.claude/scripts/notify-session-window.ps1"
cp "D:/Develop/Project/cj-cc-marketplace/notify-hook/skills/setup/scripts/notify-session-bindings.ps1" "C:/Users/13226/.claude/scripts/notify-session-bindings.ps1"
```

Expected: 三个脚本都复制成功。

- [ ] **Step 3: 更新本地 `settings.json` hooks**

把 `C:/Users/13226/.claude/settings.json` 的 `hooks` 节点更新为：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-session-window.ps1 -Mode bind"
          }
        ]
      },
      {
        "matcher": "resume",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-session-window.ps1 -Mode bind"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-session-window.ps1 -Mode bind"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-session-window.ps1 -Mode clear"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1"
          }
        ]
      },
      {
        "matcher": "idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1"
          }
        ]
      }
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add notify-hook/skills/setup/SKILL.md
git commit -m "docs: 更新 notify-hook 安装说明，增加会话绑定 hooks"
```

---

### Task 5: 双 VS Code 窗口手动验证

**Files:**

- 无代码改动

- [ ] **Step 1: 重启 Claude Code**

关闭当前 Claude Code 会话并重新启动，确保新的 `SessionStart` / `UserPromptSubmit` / `SessionEnd` hooks 生效。

- [ ] **Step 2: 在两个 VS Code 窗口分别启动 Claude Code**

测试步骤：

```text
1. 打开 VS Code 窗口 A（例如 cj-cc-marketplace）
2. 在 A 的集成终端启动 Claude Code
3. 打开 VS Code 窗口 B（例如 gx-web-lib）
4. 在 B 的集成终端启动 Claude Code
5. 在 A 和 B 各输入一次普通消息，确保 UserPromptSubmit hook 已刷新绑定
```

Expected: 日志中出现两条不同 `session_id -> hwnd` 的绑定记录。

- [ ] **Step 3: 验证目标行为**

测试步骤：

```text
1. 把窗口 A 置前，在 A 中工作
2. 在窗口 B 的 Claude Code 中触发一个需要权限确认或等待输入的场景
3. 观察任务栏：应只有 B 的任务栏按钮持续闪烁
4. 点击或切到 B，闪烁应自动停止
```

Expected:

```text
- A 不闪烁
- B 持续闪烁直到被前置
- 前置 B 后闪烁停止
```

- [ ] **Step 4: 检查日志证据**

Run:

```bash
pwsh.exe -NoProfile -Command "Get-Content (Join-Path $env:TEMP 'claude-notify-debug.log') -Tail 60"
```

Expected log 片段包含：

```text
[notify-session-window] Bound session_id=... to hwnd=...
[notify-hook] Triggered: Force=False PID=... session_id=...
[notify-hook] Using bound hwnd=... for session_id=...
[notify-hook] 窗口不在前台 (...)
[notify-hook] FlashWindowEx result: ...
```

- [ ] **Step 5: Commit 最终状态**

```bash
git add notify-hook/skills/setup/scripts/notify-session-bindings.ps1 notify-hook/skills/setup/scripts/notify-session-window.ps1 notify-hook/skills/setup/scripts/notify-hook.ps1 notify-hook/skills/setup/SKILL.md docs/superpowers/plans/2026-04-14-session-bound-multi-window-notify.md
git commit -m "feat: 支持 Claude 会话级窗口绑定的多窗口通知"
```

---

## Self-Review

- **Spec coverage:** 新计划覆盖了“前台时不提示”“后台窗口持续闪烁直到前置”和“多 VS Code 窗口时精准闪 B 不闪 A”三个核心要求。
- **Placeholder scan:** 无 `TODO`、`TBD`、`implement later` 等占位描述。
- **Type consistency:** 全文统一使用 `session_id`、`hwnd`、`Mode=bind|clear`、`notify-session-bindings.ps1`、`notify-session-window.ps1` 这组命名，没有混用旧的 toast / URL 传递方案。
