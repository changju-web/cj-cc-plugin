# Multi-Instance Notify Design

## 问题

当用户打开两个独立 VS Code 实例（A 和 B），两个都运行 Claude Code 时，B 窗口前置，A 窗口的 Claude Code 需要权限审批或等待输入时，Toast 通知完全不弹出。

## 根因分析

当前 `notify-hook.ps1` 通过进程树向上遍历找窗口句柄。存在两个核心问题：

1. **进程链断裂**：任何一级父进程获取失败（权限、进程已退出），`$targetHwnd` 保持为 0 → 脚本静默退出
2. **HWND 文件竞争**：`claude-notify-hwnd.txt` 全局共享，两个实例同时写入会互相覆盖

此外没有任何诊断日志，失败时完全黑盒。

## 设计

### 1. notify-hook.ps1 — 增强窗口句柄获取

保持现有进程树遍历作为主策略，增加备选策略：

- **策略 1**（现有）：进程树向上遍历，找 `MainWindowHandle` 不为 0 的进程
- **策略 2**（新增）：如果策略 1 失败，使用 `GetConsoleWindow()` Win32 API 获取当前控制台窗口句柄

`GetConsoleWindow()` 返回与当前进程关联的控制台窗口句柄。因为 hook 脚本由 Claude Code 在 VS Code 终端中执行，这个 API 应该返回 VS Code 的终端窗口，其顶层父窗口就是 VS Code 本身。

### 2. notify-toast.ps1 — HWND 内嵌到协议 URL

将 Toast 的 Launch URL 从固定值改为动态编码 HWND：

```
# Before
-Launch 'claude-focus://activate'

# After
-Launch "claude-focus://activate?hwnd=$Hwnd"
```

删除 `$env:TEMP\claude-notify-hwnd.txt` 的写入逻辑，消除多实例文件竞争。

### 3. focus-window.ps1 — 从 URL 参数读取 HWND

从 URI 的 query 参数解析 `hwnd` 值：

```powershell
# 解析 claude-focus://activate?hwnd=123456
$hwndVal = $Uri -replace '.*hwnd=(\d+).*', '$1'
```

删除文件读取逻辑。

### 4. 日志系统

- 统一日志文件：`$env:TEMP\claude-notify-debug.log`
- 格式：`[2026-04-13 14:30:00] [script-name] message`
- 仅追加，不覆盖
- 三个脚本均写日志

日志场景：
- `notify-hook.ps1`：记录进程链每级信息、最终获取的 HWND 和策略
- `notify-toast.ps1`：记录前台窗口、目标窗口、是否跳过
- `focus-window.ps1`：记录从 URL 解析的 HWND、聚焦结果

### 5. 不改动的部分

- `SKILL.md` 安装流程
- hooks 配置（`settings.json` 中的 `Notification` hooks）
- `claude-focus://` 协议注册
- 前台窗口跳过逻辑（Smart Skip）

## 涉及文件

| 文件 | 改动类型 |
|------|---------|
| `notify-hook.ps1` | 修改：增加 GetConsoleWindow 备选 + 日志 |
| `notify-toast.ps1` | 修改：HWND 编码到 URL + 日志 |
| `focus-window.ps1` | 修改：从 URL 解析 HWND + 日志 |
| `SKILL.md` | 不改动 |
