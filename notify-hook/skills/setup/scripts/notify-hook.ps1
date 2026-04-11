# notify-hook.ps1 - Claude Code Notification hook entry point
# Resolves the current host window (VS Code or standalone terminal)
# and launches the background toast handler.

param(
    [string]$Message = '需要你的输入',
    [switch]$Force
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

$toastArgs = @('-NoProfile', '-File', $toastScript, '-Hwnd', $targetHwnd.ToInt64(), '-Message', $Message)
if ($Force) { $toastArgs += '-Force' }
Start-Process pwsh -ArgumentList $toastArgs -WindowStyle Hidden
