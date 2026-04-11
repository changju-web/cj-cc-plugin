# 前台窗口跳过通知设计

## 背景

当前 `notify-toast.ps1` 在 Claude Code 窗口已处于前台时，会等待 Delay 秒后再决定是否弹通知。这个等待逻辑对用户没有实际价值——窗口已经在最前面，用户可以看到 Claude Code 的提示，无需再弹 Windows Toast 通知。

## 目标

- Claude Code 窗口在前台 → 静默退出，不弹通知不等待
- Claude Code 窗口不在前台 → 立即弹通知
- 移除 Delay 参数和 activity 文件机制

## 方案

### notify-toast.ps1

移除 `$Delay`、`$StartedAt` 参数和所有延迟/activity 文件相关逻辑。核心逻辑简化为：

```text
检查窗口句柄有效 → 检查窗口是否前台 → 前台则退出 → 非前台则弹通知
```

变更后的关键代码：

```powershell
param(
    [long]$Hwnd = 0,
    [string]$Message = '需要你的输入'
)

# ... WindowState 类型定义 ...

$targetHwnd = [IntPtr]::new($Hwnd)
if (-not [WindowState]::IsWindow($targetHwnd)) {
    exit 0
}

$foregroundHwnd = [WindowState]::GetForegroundWindow()
if ($foregroundHwnd -eq $targetHwnd) {
    exit 0
}

# 弹通知（原有逻辑不变）
```

### notify-hook.ps1

移除 `$Delay` 参数，`Start-Process` 调用中不再传递 `-Delay` 和 `-StartedAt`。

### SKILL.md hooks 配置

hooks 配置中的命令移除 `-Delay` 参数：

```json
{
  "matcher": "permission_prompt",
  "hooks": [
    {
      "type": "command",
      "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1 -Message '需要权限审批'"
    }
  ]
},
{
  "matcher": "idle_prompt",
  "hooks": [
    {
      "type": "command",
      "command": "pwsh.exe -NoProfile -File ~/.claude/scripts/notify-hook.ps1 -Message '等待你的输入'"
    }
  ]
}
```

## 影响范围

| 文件 | 变更 |
|------|------|
| `notify-toast.ps1` | 移除 Delay/StartedAt 参数、延迟等待、activity 文件检查；新增前台检测直接退出 |
| `notify-hook.ps1` | 移除 Delay 参数及其传递 |
| `SKILL.md` | hooks 配置命令移除 `-Delay` 参数 |

## 验收标准

1. Claude Code 窗口在前台时触发 hook → 无通知、无等待
2. Claude Code 窗口不在前台时触发 hook → 立即弹出 Toast 通知
3. 点击通知仍可正常聚焦窗口（不受影响）
4. 无 Delay 参数残留
