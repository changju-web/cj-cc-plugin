# notify-hook 插件设计

## 背景

当前通知系统由 3 个 PowerShell 脚本和 Claude Code hooks 配置组成：

- `notify-hook.ps1` — 入口脚本，查找父进程窗口句柄并启动后台 toast 处理
- `notify-toast.ps1` — 使用 BurntToast 创建 Windows Toast 通知，支持点击本体聚焦窗口
- `focus-window.ps1` — `claude-focus://` 协议处理器，将目标窗口调至前台

脚本位于 `~/.claude/scripts/`，hooks 配置在 `~/.claude/settings.json` 的 `Notification` 节点。

需要将这套系统封装为 marketplace 插件，实现团队分发和版本管理。

## 目标

- 在 cj-cc-marketplace 中创建 `notify-hook` 插件
- 提供 `setup` skill，用户执行 `notify-hook:setup` 一键完成安装
- 安装过程全自动：复制脚本、注册协议、写入 hooks
- 支持脚本更新检测

## 约束

- 仅支持 Windows
- 依赖 PowerShell 5.1+ 和 BurntToast 模块
- 通知配置统一（消息文案、延迟时间），不做用户自定义

## 插件结构

```text
notify-hook/
  .claude-plugin/
    plugin.json
  skills/
    setup/
      SKILL.md
      scripts/
        notify-hook.ps1
        notify-toast.ps1
        focus-window.ps1
```

### plugin.json

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

### marketplace.json 注册

在 `.claude-plugin/marketplace.json` 的 `plugins` 数组中追加：

```json
{
  "name": "notify-hook",
  "source": "./notify-hook",
  "description": "Windows Toast 通知 hook 插件"
}
```

## setup Skill 设计

### 触发条件

用户执行 `notify-hook:setup` 时触发。

### 安装流程

```text
前置检查 → 复制脚本 → 注册协议 → 写入 hooks → 完成提示
```

#### 1. 前置检查

- 检测操作系统是否为 Windows（非 Windows 则终止并提示）
- 检测 PowerShell 是否可用（运行 `pwsh.exe -Command $PSVersionTable.PSVersion`）
- 检测 BurntToast 模块是否已安装（`Get-Module -ListAvailable BurntToast`）
  - 未安装则提示用户运行 `Install-Module BurntToast -Scope CurrentUser` 并等待确认

#### 2. 复制脚本

- 将插件目录 `skills/setup/scripts/` 下的 3 个脚本复制到 `~/.claude/scripts/`
- 如果目标文件已存在，比较内容是否一致：
  - 一致 → 跳过
  - 不一致 → 提示用户是否覆盖更新

#### 3. 注册协议

在注册表 `HKCU:\SOFTWARE\Classes\claude-focus` 下添加协议处理：

```powershell
New-Item -Path 'HKCU:\SOFTWARE\Classes\claude-focus' -Force
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Classes\claude-focus' -Name '(Default)' -Value 'URL:claude-focus Protocol'
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Classes\claude-focus' -Name 'URL Protocol' -Value ''
New-Item -Path 'HKCU:\SOFTWARE\Classes\claude-focus\shell\open\command' -Force
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Classes\claude-focus\shell\open\command' -Name '(Default)' -Value "pwsh.exe -NoProfile -File `"$focusScriptPath`" -Uri '%1'"
```

#### 4. 写入 hooks 配置

读取 `~/.claude/settings.json`，在 `hooks.Notification` 数组中写入：

```json
[
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
```

如果 `hooks.Notification` 已存在且包含相同 matcher，跳过不重复添加。

#### 5. 完成提示

告知用户安装完成，提醒重启 Claude Code 使 hooks 生效。

### 错误处理

| 场景 | 处理方式 |
|------|----------|
| 非 Windows 系统 | 终止安装，提示仅支持 Windows |
| PowerShell 不可用 | 终止安装，提示安装 PowerShell |
| BurntToast 未安装 | 提示安装命令，等待用户确认 |
| 脚本目录不存在 | 自动创建 `~/.claude/scripts/` |
| settings.json 解析失败 | 终止安装，提示手动检查配置文件 |
| 协议已注册 | 跳过，不重复注册 |
| hooks 已存在相同 matcher | 跳过，不重复添加 |

## 更新策略

脚本更新时：

1. 更新插件目录 `skills/setup/scripts/` 中的脚本
2. 递增 `plugin.json` 版本号
3. 用户重新执行 `notify-hook:setup`，skill 检测到脚本内容不一致，提示覆盖更新

## 不纳入设计的内容

- 卸载功能
- hooks 配置自定义（消息文案、延迟时间等）
- 跨平台支持（macOS/Linux）
- 通知样式自定义
