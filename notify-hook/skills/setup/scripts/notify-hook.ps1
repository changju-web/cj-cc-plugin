# notify-hook.ps1 - Claude Code Notification hook entry point
# Flashes the taskbar button of the host window (VS Code or terminal)
# when Claude Code needs user attention. No external dependencies needed.

param(
    [string]$Message = '需要你的输入',
    [switch]$Force
)

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

if (-not ('NotifyHelper' -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
public struct FLASHWINFO {
    public uint cbSize;
    public IntPtr hwnd;
    public uint dwFlags;
    public uint uCount;
    public uint dwTimeout;
}

public class NotifyHelper {
    [DllImport("user32.dll")]
    public static extern bool FlashWindowEx(ref FLASHWINFO pfwi);

    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();
}
"@
}

Write-Log "Triggered: Message='$Message' Force=$Force PID=$PID"

# Strategy 1: Process tree traversal
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
    $consoleHwnd = [NotifyHelper]::GetConsoleWindow()
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

# Flash taskbar button continuously until window comes to foreground
# FLASHW_TRAY (2) | FLASHW_TIMERNOFG (12) = 14
$fw = New-Object FLASHWINFO
$fw.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf([FLASHWINFO])
$fw.hwnd = $targetHwnd
$fw.dwFlags = 14
$fw.uCount = 0
$fw.dwTimeout = 0

$result = [NotifyHelper]::FlashWindowEx([ref]$fw)
Write-Log "FlashWindowEx result: $result"
