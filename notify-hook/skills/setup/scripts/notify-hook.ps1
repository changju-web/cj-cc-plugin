# notify-hook.ps1 - Claude Code Notification hook entry point
# Flashes the taskbar button of the host window (VS Code or terminal)
# when Claude Code needs user attention. No external dependencies needed.

param(
    [switch]$Force
)

. (Join-Path $PSScriptRoot 'notify-session-bindings.ps1')

$script:NotifySessionId = '-'

function Write-Log {
    param([string]$Msg)

    $logFile = Join-Path $env:TEMP 'claude-notify-debug.log'
    if ((Test-Path $logFile) -and ((Get-Item $logFile).Length -gt 1MB)) {
        $lines = Get-Content $logFile -Tail 100
        $lines | Set-Content $logFile -ErrorAction SilentlyContinue
    }

    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] [notify-hook] [session_id=$($script:NotifySessionId)] $Msg"
    Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

function Read-HookPayload {
    try {
        $raw = [Console]::In.ReadToEnd()
    }
    catch {
        Write-Log "读取 stdin 失败，直接跳过。$($_.Exception.Message)"
        return $null
    }

    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    try {
        return ($raw | ConvertFrom-Json -ErrorAction Stop)
    }
    catch {
        Write-Log "Hook payload JSON 无效，直接跳过。$($_.Exception.Message)"
        return $null
    }
}

if (-not ('NotifyHelper' -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
public class FLASHWINFO {
    public uint cbSize;
    public IntPtr hwnd;
    public uint dwFlags;
    public uint uCount;
    public uint dwTimeout;
}

public class NotifyHelper {
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool FlashWindowEx(FLASHWINFO pfwi);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr GetAncestor(IntPtr hwnd, uint gaFlags);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindow(IntPtr hWnd);
}
"@
}

Write-Log "Triggered: Force=$Force PID=$PID"

$payload = Read-HookPayload
$sessionId = $null
if ($null -ne $payload) {
    if ($payload -is [System.Collections.IDictionary]) {
        $sessionId = $payload['session_id']
    }
    elseif ($payload -is [System.Management.Automation.PSCustomObject]) {
        $sessionId = $payload.session_id
    }
    else {
        Write-Log 'SKIP: hook payload root is not an object'
    }
}

if ($sessionId -is [string] -and -not [string]::IsNullOrWhiteSpace($sessionId)) {
    $script:NotifySessionId = [string]$sessionId
}

$targetHwnd = [IntPtr]::Zero

if ($script:NotifySessionId -eq '-') {
    Write-Log 'SKIP: missing session_id'
    exit 0
}

try {
    $binding = Get-NotifySessionBinding -SessionId $script:NotifySessionId
}
catch {
    Write-Log "SKIP: failed to read session binding. $($_.Exception.Message)"
    exit 0
}

if ($null -eq $binding) {
    Write-Log 'SKIP: binding not found'
    exit 0
}

$bindingHwnd = $null
if ($binding -is [System.Collections.IDictionary]) {
    $bindingHwnd = $binding['hwnd']
}
elseif ($binding -is [System.Management.Automation.PSCustomObject]) {
    $bindingHwnd = $binding.hwnd
}

$bindingHwndLong = 0
if ($null -ne $bindingHwnd) {
    try {
        $bindingHwndLong = [long]$bindingHwnd
    }
    catch {
        $bindingHwndLong = 0
    }
}

if ($bindingHwndLong -le 0) {
    Write-Log "SKIP: invalid hwnd value=$bindingHwnd"
    exit 0
}

$candidateHwnd = [IntPtr]::new($bindingHwndLong)
Write-Log "Using bound hwnd=$bindingHwndLong for session_id=$($script:NotifySessionId)"
if (-not [NotifyHelper]::IsWindow($candidateHwnd)) {
    Write-Log "SKIP: invalid hwnd=$bindingHwndLong"
    exit 0
}

$targetHwnd = $candidateHwnd
Write-Log "Found HWND=$($targetHwnd.ToInt64()) via session-binding"

# Foreground detection: skip flash if window is already active
$root = [NotifyHelper]::GetAncestor($targetHwnd, 2)  # GA_ROOT
$foreground = [NotifyHelper]::GetForegroundWindow()
if ((-not $Force) -and ($root -eq $foreground)) {
    Write-Log "窗口已在前台 (root=$($root.ToInt64()) fg=$($foreground.ToInt64()))，跳过通知"
    exit 0
}
Write-Log "窗口不在前台 (root=$($root.ToInt64()) fg=$($foreground.ToInt64()))，触发闪烁"

# Flash taskbar button continuously until window comes to foreground
# FLASHW_TRAY (2) | FLASHW_TIMERNOFG (12) = 14
$fw = New-Object FLASHWINFO
$fw.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($fw)
$fw.hwnd = $targetHwnd
$fw.dwFlags = 14
$fw.uCount = 0
$fw.dwTimeout = 0

$result = [NotifyHelper]::FlashWindowEx($fw)
Write-Log "FlashWindowEx result: $result"