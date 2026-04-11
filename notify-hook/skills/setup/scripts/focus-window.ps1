# focus-window.ps1 - Protocol handler for claude-focus://
# Reads saved HWND and brings that window to front

param([string]$Uri = '')

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

$hwndFile = Join-Path $env:TEMP 'claude-notify-hwnd.txt'
if (Test-Path $hwndFile) {
    $hwndVal = [long](Get-Content $hwndFile -Raw).Trim()
    $hwnd = [IntPtr]::new($hwndVal)

    if ([FocusWindow]::IsWindow($hwnd)) {
        [FocusWindow]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
        [FocusWindow]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
        if ([FocusWindow]::IsIconic($hwnd)) {
            [FocusWindow]::ShowWindow($hwnd, 9)  # SW_RESTORE only if minimized
        }
        [FocusWindow]::SetForegroundWindow($hwnd)
    }
}
