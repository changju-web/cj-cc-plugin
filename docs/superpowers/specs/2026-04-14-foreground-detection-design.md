# notify-hook 前台检测设计

## 背景

notify-hook 当前使用 `FlashWindowEx()` 实现任务栏闪烁通知。无论终端窗口是否已在前台，都会触发闪烁。在多 VS Code / 多终端场景下，用户正在操作的窗口不应收到无意义的闪烁提示。

## 需求

1. 宿主窗口（VS Code 窗口或独立终端窗口）已在前台时，**跳过闪烁通知**
2. 宿主窗口不在前台（被其他窗口遮挡、最小化）时，**正常闪烁通知**
3. 同时简化脚本参数，移除不再需要的 `-Message` 参数

## 前台判断定义

- **VS Code 场景**：VS Code 窗口是桌面的活动窗口即算前台（不关心当前 tab 是编辑器还是终端）
- **独立终端场景**：终端窗口本身是活动窗口即算前台
- **最小化**：不算前台，应触发通知

## 方案

在 `FlashWindowEx()` 调用前插入前台检测。

### 核心逻辑

```
目标窗口句柄 (hwnd)
    ↓
GetAncestor(hwnd, GA_ROOT) → 获取顶层窗口
    ↓
GetForegroundWindow() → 获取当前桌面前台窗口
    ↓
两者相同？ ──是──→ 跳过闪烁，日志 "窗口已在前台，跳过通知"
    ↓否
调用 FlashWindowEx() 如常
```

### 新增 Win32 API

在 `NotifyHelper` 类中补充：

- `GetForegroundWindow()` — 获取当前前台窗口句柄
- `GetAncestor(hwnd, GA_ROOT = 2)` — 获取窗口的顶层祖先窗口

### 前台检测函数

```powershell
function Test-WindowForeground {
    param([IntPtr]$Hwnd)
    $root = [NotifyHelper]::GetAncestor($Hwnd, 2)  # GA_ROOT
    $foreground = [NotifyHelper]::GetForegroundWindow()
    return ($root -eq $foreground)
}
```

### 主流程变更

在找到 `$targetHwnd` 后、调用 `FlashWindowEx()` 前：

```powershell
if (Test-WindowForeground -Hwnd $targetHwnd) {
    Write-Log "窗口已在前台，跳过通知"
    return
}
```

## 变更范围

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `notify-hook/scripts/setup/scripts/notify-hook.ps1` | 补充 API、新增检测函数、插入判断逻辑、移除 `-Message` 参数 |
| `notify-hook/skills/setup/SKILL.md` | 简化 hooks 配置描述，两个 matcher 用同一个无参命令 |

### 不变

- 窗口发现逻辑（进程树遍历 + GetConsoleWindow 回退）
- FlashWindowEx 参数和调用方式 — 使用 `FLASHW_TRAY | FLASHW_TIMERNOFG` 标志，**持续闪烁直到窗口被用户前置才自动停止**
- hooks 两个 matcher（`permission_prompt`、`idle_prompt`）保留
- settings.json 结构不变（仅命令参数简化）

## 参数简化

- 移除脚本中的 `-Message` 参数
- 日志统一使用固定消息："需要用户输入，触发任务栏闪烁" / "窗口已在前台，跳过通知"
- hooks 配置两个 matcher 调用同一个无参命令：`pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1`
