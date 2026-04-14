# focus-window.ps1 - Protocol handler for claude-focus://
# Parses HWND from URL parameter and brings that window to front

param([string]$Uri = '')

function Write-Log {
    param([string]$Msg)
    $logFile = Join-Path $env:TEMP 'claude-notify-debug.log'
    # Truncate log if over 1MB
    if ((Test-Path $logFile) -and ((Get-Item $logFile).Length -gt 1MB)) {
        $lines = Get-Content $logFile -Tail 100
        $lines | Set-Content $logFile -ErrorAction SilentlyContinue
    }
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] [focus-window] $Msg"
    Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

Write-Log "Triggered: Uri='$Uri'"

if (-not ('FocusWindow' -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FocusWindow {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
}
"@
}

# Parse HWND from URL parameter: claude-focus://activate?hwnd=123456
if ($Uri -match 'hwnd=(\d+)') {
    $hwndVal = [long]$Matches[1]
    Write-Log "Parsed hwnd=$hwndVal from URL"
} else {
    # Fallback: read from temp file (backward compatibility)
    $hwndFile = Join-Path $env:TEMP 'claude-notify-hwnd.txt'
    if (Test-Path $hwndFile) {
        $hwndVal = [long](Get-Content $hwndFile -Raw).Trim()
        Write-Log "Parsed hwnd=$hwndVal from file (fallback)"
    } else {
        Write-Log "FAILED: No hwnd in URL and no fallback file"
        exit 1
    }
}

$hwnd = [IntPtr]::new($hwndVal)

if (-not [FocusWindow]::IsWindow($hwnd)) {
    Write-Log "FAILED: Invalid window handle $hwndVal"
    exit 1
}

# ALT key trick to work around SetForegroundWindow restrictions
[FocusWindow]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
[FocusWindow]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)

if ([FocusWindow]::IsIconic($hwnd)) {
    [FocusWindow]::ShowWindow($hwnd, 9)  # SW_RESTORE only if minimized
}

[FocusWindow]::SetForegroundWindow($hwnd)
Write-Log "Focused window hwnd=$hwndVal"
