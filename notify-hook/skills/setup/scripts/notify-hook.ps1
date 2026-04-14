# notify-hook.ps1 - Claude Code Notification hook entry point
# Resolves the current host window (VS Code or standalone terminal)
# and launches the background toast handler.

param(
    [string]$Message = '需要你的输入',
    [switch]$Force
)

function Write-Log {
    param([string]$Msg)
    $logFile = Join-Path $env:TEMP 'claude-notify-debug.log'
    # Truncate log if over 1MB
    if ((Test-Path $logFile) -and ((Get-Item $logFile).Length -gt 1MB)) {
        $lines = Get-Content $logFile -Tail 100
        $lines | Set-Content $logFile -ErrorAction SilentlyContinue
    }
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] [notify-hook] $Msg"
    Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

if (-not ('ConsoleHelper' -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ConsoleHelper {
    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();
}
"@
}

Write-Log "Triggered: Message='$Message' Force=$Force PID=$PID"

# Strategy 1: Process tree traversal (existing logic)
try { $proc = Get-Process -Id $PID -ErrorAction Stop } catch {
    Write-Log "  Get-Process self failed: $_"
    $proc = $null
}
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