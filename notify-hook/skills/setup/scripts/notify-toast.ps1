# notify-toast.ps1 - Shows BurntToast notification, click body to focus window
# If target window is foreground, skip notification silently.

param(
    [long]$Hwnd = 0,
    [string]$Message = '需要你的输入',
    [switch]$Force
)

Import-Module BurntToast

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WindowState {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);
}
"@

$targetHwnd = [IntPtr]::new($Hwnd)
if (-not [WindowState]::IsWindow($targetHwnd)) {
    exit 0
}

$foregroundHwnd = [WindowState]::GetForegroundWindow()
if ((-not $Force) -and ($foregroundHwnd -eq $targetHwnd)) {
    exit 0
}

# Save hwnd to temp file for protocol handler to read
$hwndFile = Join-Path $env:TEMP 'claude-notify-hwnd.txt'
$Hwnd | Out-File $hwndFile -Force

# Build toast with body-click protocol activation (no button)
$text1 = New-BTText -Text 'Claude Code'
$text2 = New-BTText -Text $Message
$binding = New-BTBinding -Children $text1, $text2
$visual = New-BTVisual -BindingGeneric $binding
$content = New-BTContent -Visual $visual -ActivationType Protocol -Launch 'claude-focus://activate' -Audio (New-BTAudio -Source 'ms-winsoundevent:Notification.IM')

Submit-BTNotification -Content $content
