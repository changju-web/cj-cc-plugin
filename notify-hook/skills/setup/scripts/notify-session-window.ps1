param(
    [ValidateSet('bind', 'clear')]
    [string]$Mode = 'bind'
)

. (Join-Path $PSScriptRoot 'notify-session-bindings.ps1')

function Write-Log {
    param([string]$Msg)

    $logFile = Join-Path $env:TEMP 'claude-notify-debug.log'
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logFile -Value "[$ts] [notify-session-window] $Msg" -ErrorAction SilentlyContinue
}

function Read-HookPayload {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    try {
        return ($raw | ConvertFrom-Json -ErrorAction Stop)
    }
    catch {
        Write-Log "SKIP: invalid hook payload JSON. $($_.Exception.Message)"
        return $null
    }
}

if (-not ('NotifySessionWindowHelper' -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class NotifySessionWindowHelper {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr GetAncestor(IntPtr hwnd, uint gaFlags);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hWnd);
}
"@
}

function Get-ParentProcessId {
    param([int]$ProcessId)

    try {
        $proc = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
    }
    catch {
        return $null
    }

    if ($null -eq $proc -or $null -eq $proc.ParentProcessId) {
        return $null
    }

    return [int]$proc.ParentProcessId
}

function Find-ForegroundWindowForProcess {
    param([int]$ProcessId)

    $foreground = [NotifySessionWindowHelper]::GetForegroundWindow()
    if ($foreground -eq [IntPtr]::Zero) {
        return 0
    }

    $root = [NotifySessionWindowHelper]::GetAncestor($foreground, 2)
    if ($root -eq [IntPtr]::Zero) {
        $root = $foreground
    }

    $ownerPid = [uint32]0
    [void][NotifySessionWindowHelper]::GetWindowThreadProcessId($root, [ref]$ownerPid)
    if ([int]$ownerPid -eq $ProcessId) {
        return $root.ToInt64()
    }

    return 0
}

function Find-VisibleWindowForProcess {
    param([int]$ProcessId)

    $handles = New-Object 'System.Collections.Generic.List[long]'
    $callback = [NotifySessionWindowHelper+EnumWindowsProc]{
        param($hWnd, $lParam)

        if (-not [NotifySessionWindowHelper]::IsWindowVisible($hWnd)) {
            return $true
        }

        $ownerPid = [uint32]0
        [void][NotifySessionWindowHelper]::GetWindowThreadProcessId($hWnd, [ref]$ownerPid)
        if ([int]$ownerPid -eq $ProcessId) {
            $handles.Add($hWnd.ToInt64()) | Out-Null
        }

        return $true
    }

    [NotifySessionWindowHelper]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
    if ($handles.Count -gt 0) {
        return $handles[0]
    }

    return 0
}

function Get-CurrentHostWindowHandle {
    $visited = New-Object 'System.Collections.Generic.HashSet[int]'
    $currentPid = $PID

    while ($currentPid -gt 0 -and -not $visited.Contains($currentPid)) {
        [void]$visited.Add($currentPid)

        $foregroundHwnd = Find-ForegroundWindowForProcess -ProcessId $currentPid
        if ($foregroundHwnd -gt 0) {
            return $foregroundHwnd
        }

        $visibleHwnd = Find-VisibleWindowForProcess -ProcessId $currentPid
        if ($visibleHwnd -gt 0) {
            return $visibleHwnd
        }

        try {
            $proc = Get-Process -Id $currentPid -ErrorAction Stop
            if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
                return $proc.MainWindowHandle.ToInt64()
            }
        }
        catch {
            # ignore and continue walking parent chain
        }

        $parentPid = Get-ParentProcessId -ProcessId $currentPid
        if ($null -eq $parentPid -or $parentPid -le 0) {
            break
        }

        $currentPid = $parentPid
    }

    $consoleHwnd = [NotifySessionWindowHelper]::GetConsoleWindow()
    if ($consoleHwnd -ne [IntPtr]::Zero) {
        return $consoleHwnd.ToInt64()
    }

    return 0
}

$payload = Read-HookPayload
if ($null -eq $payload) {
    Write-Log 'SKIP: empty or invalid hook payload'
    exit 0
}

if ($payload -isnot [System.Management.Automation.PSCustomObject] -and $payload -isnot [System.Collections.IDictionary]) {
    Write-Log 'SKIP: invalid hook payload root (must be object)'
    exit 0
}

if ($payload -is [System.Collections.IDictionary]) {
    $sessionIdValue = $payload['session_id']
}
else {
    $sessionIdValue = $payload.session_id
}

if ($sessionIdValue -isnot [string] -or [string]::IsNullOrWhiteSpace($sessionIdValue)) {
    Write-Log 'SKIP: invalid session_id in hook payload'
    exit 0
}

$sessionId = [string]$sessionIdValue

if ($Mode -eq 'clear') {
    try {
        Remove-NotifySessionBinding -SessionId $sessionId
        Write-Log "Removed binding for session_id=$sessionId"
    }
    catch {
        Write-Log "ERROR: failed to remove binding for session_id=$sessionId. $($_.Exception.Message)"
    }

    exit 0
}

$hwnd = Get-CurrentHostWindowHandle
if ($hwnd -le 0) {
    Write-Log "SKIP: could not resolve host window for session_id=$sessionId"
    exit 0
}

try {
    Set-NotifySessionBinding -SessionId $sessionId -Hwnd $hwnd
    Write-Log "Bound session_id=$sessionId to hwnd=$hwnd"
}
catch {
    Write-Log "ERROR: failed to bind session_id=$sessionId. $($_.Exception.Message)"
}

exit 0
