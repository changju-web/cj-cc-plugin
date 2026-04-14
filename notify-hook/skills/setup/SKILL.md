---
name: setup
description: 初始化任务栏闪烁通知 hook，复制脚本、写入 hooks 配置。用户执行 notify-hook:setup 时触发。
---

# Setup - 任务栏闪烁通知 Hook

## Overview

这个 skill 用于初始化任务栏闪烁通知系统。安装后，Claude Code 在需要权限审批或等待用户输入时，会按 `session_id -> hwnd` 绑定精确闪烁所属 VS Code 窗口的任务栏图标。若当前通知缺少有效的会话绑定，脚本会直接跳过，不会猜测或回退到其他窗口。

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

> 需要安装 PowerShell 7+，请访问 `https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-windows`

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

将插件目录中以下脚本复制到 `~/.claude/scripts/`：

- `notify-hook.ps1`
- `notify-session-window.ps1`
- `notify-session-bindings.ps1`

检查目标是否已存在且内容一致：

```powershell
$sourceDir = '<插件 skills/setup/scripts 目录的绝对路径>'
$destDir = Join-Path $env:USERPROFILE '.claude\scripts'

$files = @(
  'notify-hook.ps1',
  'notify-session-window.ps1',
  'notify-session-bindings.ps1'
)

foreach ($file in $files) {
  $src = Join-Path $sourceDir $file
  $dst = Join-Path $destDir $file

  if ((Test-Path $dst) -and ((Get-FileHash $src).Hash -eq (Get-FileHash $dst).Hash)) {
    # 跳过，内容一致
  } else {
    Copy-Item -Path $src -Destination $dst -Force
  }
}
```

实际执行时，使用 Claude Code 的 Read 工具读取插件目录中脚本内容，然后用 Write 工具写入到 `~/.claude/scripts/`。

### Step 3: 写入 hooks 配置

读取 `~/.claude/settings.json`，在 `hooks` 对象中写入 `SessionStart`、`UserPromptSubmit`、`SessionEnd`、`Notification` 配置。

需要写入的配置：

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
    ]
  }
}
```

行为说明：

- `SessionStart` / `UserPromptSubmit` 负责刷新 `session_id -> hwnd` 绑定
- `SessionEnd` 负责清理绑定
- `Notification` 仅在命中有效 binding 时执行闪烁
- 若 `session_id` 缺失、binding 不存在或 `hwnd` 失效，通知脚本会直接退出，不再尝试通过进程链或控制台窗口猜测目标

合并逻辑：

1. 使用 Read 工具读取 `~/.claude/settings.json`
2. 如果 `hooks` 对象不存在，直接添加整个 `hooks` 节点
3. 如果 `hooks` 存在但缺少对应事件（`SessionStart` / `UserPromptSubmit` / `SessionEnd` / `Notification`），补齐缺失事件
4. 如果事件已存在：
   - `SessionStart` 检查并补齐 `startup` / `resume` 两个 matcher
   - `UserPromptSubmit` 检查并补齐无 matcher 的 bind 命令
   - `SessionEnd` 检查并补齐无 matcher 的 clear 命令
   - `Notification` 检查并补齐 `permission_prompt` / `idle_prompt`
5. 使用 Edit 工具写入更新后的 settings.json

**注意：** 不要破坏 settings.json 中已有的其他配置项。只修改 `hooks` 相关的部分。

### Step 4: 完成提示

安装完成后，向用户输出：

> notify-hook 安装完成！
>
> - 脚本已复制到 ~/.claude/scripts/notify-hook.ps1
> - hooks 配置已写入 settings.json
>
> 请重启 Claude Code 使 hooks 生效。

## Error Handling

| 场景 | 处理方式 |
|------|----------|
| 非 Windows 系统 | 终止安装，提示仅支持 Windows |
| PowerShell 不可用 | 终止安装，提示安装 PowerShell |
| settings.json 解析失败 | 终止安装，提示手动检查配置文件 |
| hooks 已存在相同 matcher | 跳过该项，不重复添加 |
| 脚本内容一致 | 跳过复制，提示已是最新 |
| Notification 缺少 session binding | 直接跳过，不闪烁、不回退猜测 |
| binding 对应的 hwnd 已失效 | 直接跳过，等待下次 bind 刷新 |

## Update Behavior

当用户再次执行 `notify-hook:setup` 时：

1. 检测 `~/.claude/scripts/notify-hook.ps1` 与插件目录中的脚本是否一致
2. 如果不一致，提示用户有可用更新并询问是否覆盖
3. 用户确认后覆盖更新
4. hooks 配置保持不变（幂等）
