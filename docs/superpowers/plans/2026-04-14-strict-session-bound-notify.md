# Strict Session-Bound Notify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 notify-hook 精简为“严格按 session 绑定命中窗口”的方案，保留多窗口精确提醒，删除 Notification 阶段的 fallback 猜测链路。

**Architecture:** `notify-session-window.ps1` 继续负责在 `SessionStart` / `UserPromptSubmit` / `SessionEnd` 维护 `session_id -> hwnd` 绑定；`notify-hook.ps1` 只从 Notification payload 读取 `session_id`，命中绑定且窗口句柄有效时才做前台判断与 `FlashWindowEx`。当 `session_id` 缺失、绑定缺失或句柄失效时，直接记录日志并退出，不再走进程树或 `GetConsoleWindow()` 兜底。

**Tech Stack:** PowerShell 7, Claude Code hooks (`SessionStart`, `UserPromptSubmit`, `SessionEnd`, `Notification`), Windows Win32 API (`FlashWindowEx`, `GetForegroundWindow`, `GetAncestor`, `IsWindow`)

---

## File Structure

- Modify: `notify-hook/skills/setup/scripts/notify-hook.ps1`
  - 删除 Notification 阶段的 fallback 解析逻辑，只保留 payload 解析、binding 查询、前台判断、闪烁调用与日志。
- Modify: `notify-hook/skills/setup/SKILL.md`
  - 更新安装说明，明确 Notification 只依赖 session binding，不再描述 fallback 行为。
- Keep: `notify-hook/skills/setup/scripts/notify-session-window.ps1`
  - 继续负责 bind / clear，不在本次变更中扩大职责。
- Keep: `notify-hook/skills/setup/scripts/notify-session-bindings.ps1`
  - 继续负责 binding 存储与锁。
- Test via PowerShell commands
  - 仓库没有 build / test / lint 命令，本次用 `pwsh.exe` 手动验证脚本行为。

---

### Task 1: 先写失败验证，锁定“缺失 binding 不再 fallback”行为

**Files:**
- Test: `notify-hook/skills/setup/scripts/notify-hook.ps1`

- [ ] **Step 1: 准备一个没有 binding 的测试环境**

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-no-binding-test.json'
$logFile = Join-Path $env:TEMP 'claude-notify-debug.log'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
Remove-Item $logFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
'{\"session_id\":\"session-missing\",\"message\":\"等待你的输入\"}' | pwsh.exe -NoProfile -File ./notify-hook/skills/setup/scripts/notify-hook.ps1
Get-Content -Path $logFile -Tail 20
"
```

Expected: 当前实现大概率会继续输出 `Found HWND=... via process-tree` 或 `via console-window`，说明它仍在 fallback。

- [ ] **Step 2: 用断言让验证明确失败**

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-no-binding-test.json'
$logFile = Join-Path $env:TEMP 'claude-notify-debug.log'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
Remove-Item $logFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
'{\"session_id\":\"session-missing\",\"message\":\"等待你的输入\"}' | pwsh.exe -NoProfile -File ./notify-hook/skills/setup/scripts/notify-hook.ps1
$log = Get-Content -Path $logFile -Raw
if ($log -match 'via process-tree' -or $log -match 'via console-window') {
    throw 'expected no fallback when binding is missing'
}
Write-Host 'PASS'
"
```

Expected: FAIL，报 `expected no fallback when binding is missing`。

- [ ] **Step 3: Commit 当前红灯测试基线**

```bash
git status --short
```

Expected: 仅确认工作区状态，不提交。

---

### Task 2: 精简 notify-hook.ps1，仅允许 session binding 命中

**Files:**
- Modify: `notify-hook/skills/setup/scripts/notify-hook.ps1`
- Test: `notify-hook/skills/setup/scripts/notify-hook.ps1`

- [ ] **Step 1: 删除 fallback 相关函数与 API 依赖**

将 `notify-hook/skills/setup/scripts/notify-hook.ps1` 中以下逻辑整体删除：

```powershell
function Get-ParentProcessId {
    param([int]$ProcessId)
    ...
}

function Resolve-FallbackWindowHandle {
    ...
}
```

同时从 `NotifyHelper` 中删除：

```powershell
[DllImport("kernel32.dll")]
public static extern IntPtr GetConsoleWindow();
```

保留：

```powershell
[DllImport("user32.dll")]
public static extern IntPtr GetForegroundWindow();

[DllImport("user32.dll")]
public static extern IntPtr GetAncestor(IntPtr hwnd, uint gaFlags);

[DllImport("user32.dll")]
[return: MarshalAs(UnmanagedType.Bool)]
public static extern bool IsWindow(IntPtr hWnd);
```

- [ ] **Step 2: 将主流程改成“无 binding 直接退出”**

把 `notify-hook/skills/setup/scripts/notify-hook.ps1` 的目标窗口解析部分改成下面这段：

```powershell
$targetHwnd = [IntPtr]::Zero

if ($script:NotifySessionId -eq '-') {
    Write-Log 'SKIP: missing session_id'
    exit 0
}

try {
    $binding = Get-NotifySessionBinding -SessionId $script:NotifySessionId
}
catch {
    Write-Log "SKIP: failed to read session binding. $($_.Exception.Message)"
    exit 0
}

if ($null -eq $binding) {
    Write-Log 'SKIP: binding not found'
    exit 0
}

$bindingHwnd = $null
if ($binding -is [System.Collections.IDictionary]) {
    $bindingHwnd = $binding['hwnd']
}
elseif ($binding -is [System.Management.Automation.PSCustomObject]) {
    $bindingHwnd = $binding.hwnd
}

$bindingHwndLong = 0
if ($null -ne $bindingHwnd) {
    try {
        $bindingHwndLong = [long]$bindingHwnd
    }
    catch {
        $bindingHwndLong = 0
    }
}

if ($bindingHwndLong -le 0) {
    Write-Log "SKIP: invalid hwnd value=$bindingHwnd"
    exit 0
}

$candidateHwnd = [IntPtr]::new($bindingHwndLong)
if (-not [NotifyHelper]::IsWindow($candidateHwnd)) {
    Write-Log "SKIP: invalid hwnd=$bindingHwndLong"
    exit 0
}

$targetHwnd = $candidateHwnd
Write-Log "Using bound hwnd=$bindingHwndLong for session_id=$($script:NotifySessionId)"
```

并把后续日志从：

```powershell
Write-Log "Found HWND=$($targetHwnd.ToInt64()) via $strategy"
```

改成：

```powershell
Write-Log "Found HWND=$($targetHwnd.ToInt64()) via session-binding"
```

- [ ] **Step 3: 保留前台判断与闪烁逻辑，不新增额外分支**

确认文件中仍保留这段逻辑：

```powershell
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

Expected: 只改目标窗口解析，不改闪烁策略。

- [ ] **Step 4: 重新运行缺失 binding 验证，确认转绿**

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-no-binding-test.json'
$logFile = Join-Path $env:TEMP 'claude-notify-debug.log'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
Remove-Item $logFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
'{\"session_id\":\"session-missing\",\"message\":\"等待你的输入\"}' | pwsh.exe -NoProfile -File ./notify-hook/skills/setup/scripts/notify-hook.ps1
$log = Get-Content -Path $logFile -Raw
if ($log -match 'via process-tree' -or $log -match 'via console-window') {
    throw 'expected no fallback when binding is missing'
}
if ($log -notmatch 'SKIP: binding not found') {
    throw 'expected binding-not-found skip log'
}
Write-Host 'PASS'
"
```

Expected: 输出 `PASS`。

- [ ] **Step 5: 追加验证“有 binding 才触发目标解析”**

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-binding-hit-test.json'
$logFile = Join-Path $env:TEMP 'claude-notify-debug.log'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
Remove-Item $logFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
. ./notify-hook/skills/setup/scripts/notify-session-bindings.ps1
Set-NotifySessionBinding -SessionId 'session-hit' -Hwnd 12345
'{\"session_id\":\"session-hit\",\"message\":\"等待你的输入\"}' | pwsh.exe -NoProfile -File ./notify-hook/skills/setup/scripts/notify-hook.ps1
$log = Get-Content -Path $logFile -Raw
if ($log -notmatch 'Using bound hwnd=12345') {
    throw 'expected bound hwnd log'
}
Write-Host 'PASS'
"
```

Expected: 输出里至少包含 `Using bound hwnd=12345`；如果 `12345` 不是有效窗口，后续会有 `SKIP: invalid hwnd=12345`，这是允许的。

- [ ] **Step 6: Commit**

```bash
git add notify-hook/skills/setup/scripts/notify-hook.ps1
git commit -m "refactor: 简化通知脚本为严格会话绑定模式"
```

---

### Task 3: 更新 setup skill 文档，明确“无 binding 不提醒”

**Files:**
- Modify: `notify-hook/skills/setup/SKILL.md`

- [ ] **Step 1: 更新 Overview，明确新的行为边界**

将 `notify-hook/skills/setup/SKILL.md` 的概述描述改为下面内容：

```markdown
这个 skill 用于初始化任务栏闪烁通知系统。安装后，Claude Code 在需要权限审批或等待用户输入时，会按 `session_id -> hwnd` 绑定精确闪烁所属 VS Code 窗口的任务栏图标。若当前通知缺少有效的会话绑定，脚本会直接跳过，不会猜测或回退到其他窗口。
```

- [ ] **Step 2: 在 hooks 配置说明后补充行为说明**

在 hooks JSON 配置代码块后追加这一段：

```markdown
行为说明：

- `SessionStart` / `UserPromptSubmit` 负责刷新 `session_id -> hwnd` 绑定
- `SessionEnd` 负责清理绑定
- `Notification` 仅在命中有效 binding 时执行闪烁
- 若 `session_id` 缺失、binding 不存在或 `hwnd` 失效，通知脚本会直接退出，不再尝试通过进程链或控制台窗口猜测目标
```
```

- [ ] **Step 3: 更新 Error Handling 表，反映新的跳过策略**

把错误处理表中的相关描述调整为：

```markdown
| 场景 | 处理方式 |
|------|----------|
| 非 Windows 系统 | 终止安装，提示仅支持 Windows |
| PowerShell 不可用 | 终止安装，提示安装 PowerShell |
| settings.json 解析失败 | 终止安装，提示手动检查配置文件 |
| hooks 已存在相同 matcher | 跳过该项，不重复添加 |
| 脚本内容一致 | 跳过复制，提示已是最新 |
| Notification 缺少 session binding | 直接跳过，不闪烁、不回退猜测 |
| binding 对应的 hwnd 已失效 | 直接跳过，等待下次 bind 刷新 |
```
```

- [ ] **Step 4: 自查文档里不再出现 fallback 描述**

```bash
python - <<'PY'
from pathlib import Path
text = Path(r'D:/Develop/Project/cj-cc-marketplace/notify-hook/skills/setup/SKILL.md').read_text(encoding='utf-8')
for needle in ['fallback', 'process-tree', 'GetConsoleWindow', '控制台窗口回退', '进程链回退']:
    if needle in text:
        raise SystemExit(f'found stale wording: {needle}')
print('PASS')
PY
```

Expected: 输出 `PASS`。

- [ ] **Step 5: Commit**

```bash
git add notify-hook/skills/setup/SKILL.md
git commit -m "docs: 更新 notify-hook 为严格会话绑定说明"
```

---

### Task 4: 手动验证多窗口精确提醒与“宁可漏不闪错”

**Files:**
- Modify: `notify-hook/skills/setup/scripts/notify-hook.ps1`
- Modify: `notify-hook/skills/setup/SKILL.md`
- Test: `notify-hook/skills/setup/scripts/notify-session-window.ps1`
- Test: `notify-hook/skills/setup/scripts/notify-session-bindings.ps1`

- [ ] **Step 1: 在仓库内同步检查 hooks 相关脚本存在**

```bash
python - <<'PY'
from pathlib import Path
paths = [
    r'D:/Develop/Project/cj-cc-marketplace/notify-hook/skills/setup/scripts/notify-hook.ps1',
    r'D:/Develop/Project/cj-cc-marketplace/notify-hook/skills/setup/scripts/notify-session-window.ps1',
    r'D:/Develop/Project/cj-cc-marketplace/notify-hook/skills/setup/scripts/notify-session-bindings.ps1',
]
for path in paths:
    if not Path(path).exists():
        raise SystemExit(f'missing file: {path}')
print('PASS')
PY
```

Expected: 输出 `PASS`。

- [ ] **Step 2: 用 bind / clear 脚本验证 binding 生命周期**

```bash
pwsh.exe -NoProfile -Command "
$bindingsFile = Join-Path $env:TEMP 'notify-lifecycle-test.json'
Remove-Item $bindingsFile -ErrorAction SilentlyContinue
$env:CLAUDE_NOTIFY_BINDINGS_FILE = $bindingsFile
'{\"session_id\":\"session-lifecycle\"}' | pwsh.exe -NoProfile -File ./notify-hook/skills/setup/scripts/notify-session-window.ps1 -Mode bind
$bindings = Get-Content -Path $bindingsFile -Raw | ConvertFrom-Json -AsHashtable
if (-not $bindings.ContainsKey('session-lifecycle')) { throw 'expected session binding created' }
'{\"session_id\":\"session-lifecycle\"}' | pwsh.exe -NoProfile -File ./notify-hook/skills/setup/scripts/notify-session-window.ps1 -Mode clear
. ./notify-hook/skills/setup/scripts/notify-session-bindings.ps1
$finalBindings = Read-NotifySessionBindings -Path $bindingsFile
if ($finalBindings.ContainsKey('session-lifecycle')) { throw 'expected session binding removed' }
Write-Host 'PASS'
"
```

Expected: 输出 `PASS`。

- [ ] **Step 3: 双窗口人工验证精准性**

```text
1. 打开 VS Code 窗口 A，在 A 的终端启动 Claude Code
2. 打开 VS Code 窗口 B，在 B 的终端启动 Claude Code
3. 在 A、B 各发送一次普通消息，确保触发 UserPromptSubmit 绑定刷新
4. 保持 A 在前台
5. 在 B 的 Claude Code 中制造一个 permission prompt 或 idle_prompt
6. 观察任务栏：只允许 B 闪烁，不允许 A 闪烁
7. 若 B 没有已知 binding 或 binding 已失效，应表现为“不闪烁”，而不是闪到 A
```

Expected:

```text
- 命中 binding 时：只闪对应窗口
- 未命中 binding 时：不闪任何其他窗口
- 前置目标窗口后：闪烁自动停止
```

- [ ] **Step 4: 检查日志证据**

```bash
pwsh.exe -NoProfile -Command "Get-Content (Join-Path $env:TEMP 'claude-notify-debug.log') -Tail 80"
```

Expected log 片段应只出现以下两类之一：

```text
[notify-hook] [session_id=...] Using bound hwnd=...
[notify-hook] [session_id=...] Found HWND=... via session-binding
```

或：

```text
[notify-hook] [session_id=...] SKIP: binding not found
[notify-hook] [session_id=...] SKIP: invalid hwnd=...
```

不应再出现：

```text
via process-tree
via console-window
Fallback 进程链
Fallback GetConsoleWindow
```

- [ ] **Step 5: Commit 最终结果**

```bash
git add notify-hook/skills/setup/scripts/notify-hook.ps1 notify-hook/skills/setup/SKILL.md docs/superpowers/plans/2026-04-14-strict-session-bound-notify.md
git commit -m "refactor: 收缩 notify-hook 为严格会话绑定提醒"
```

---

## Self-Review

- **Spec coverage:** 已覆盖“多窗口精确提醒”“宁可漏提醒不闪错窗口”“删除 Notification 阶段 fallback”“保留前台检测与持续闪烁”四项要求。
- **Placeholder scan:** 全文没有 `TODO`、`TBD`、`implement later`、`similar to` 等占位表述。
- **Type consistency:** 全文统一使用 `session_id`、`hwnd`、`session-binding`、`bind` / `clear` 命名，且只让 `notify-session-window.ps1` 维护绑定，`notify-hook.ps1` 只消费绑定。
