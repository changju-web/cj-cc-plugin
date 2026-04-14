function Get-NotifySessionBindingsPath {
    if ($env:CLAUDE_NOTIFY_BINDINGS_FILE) {
        return $env:CLAUDE_NOTIFY_BINDINGS_FILE
    }

    return (Join-Path $env:USERPROFILE '.claude\notify-session-bindings.json')
}

function Get-NotifySessionBindingsLockPath {
    param([string]$Path = (Get-NotifySessionBindingsPath))

    return "$Path.lock"
}

function Ensure-NotifySessionBindingsDirectory {
    param([string]$Path)

    $dir = Split-Path -Parent $Path
    if ([string]::IsNullOrWhiteSpace($dir)) {
        return (Get-Location).Path
    }

    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    return $dir
}

function Invoke-NotifySessionBindingsLock {
    param(
        [Parameter(Mandatory = $true)][scriptblock]$Action,
        [string]$Path = (Get-NotifySessionBindingsPath),
        [int]$TimeoutMilliseconds = 5000
    )

    Ensure-NotifySessionBindingsDirectory -Path $Path | Out-Null

    $lockPath = Get-NotifySessionBindingsLockPath -Path $Path
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $lockStream = $null

    while ($null -eq $lockStream) {
        try {
            $lockStream = [System.IO.File]::Open(
                $lockPath,
                [System.IO.FileMode]::OpenOrCreate,
                [System.IO.FileAccess]::ReadWrite,
                [System.IO.FileShare]::None
            )
        }
        catch [System.IO.IOException] {
            if ($stopwatch.ElapsedMilliseconds -ge $TimeoutMilliseconds) {
                throw "Failed to acquire bindings lock within $TimeoutMilliseconds ms. Lock file: $lockPath"
            }

            Start-Sleep -Milliseconds 50
        }
    }

    try {
        & $Action
    }
    finally {
        $lockStream.Dispose()
    }
}

function Read-NotifySessionBindings {
    param([string]$Path = (Get-NotifySessionBindingsPath))

    if (-not (Test-Path $Path)) {
        return @{}
    }

    $raw = Get-Content -Path $Path -Raw -ErrorAction Stop
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return @{}
    }

    try {
        $parsed = $raw | ConvertFrom-Json -AsHashtable -ErrorAction Stop
    }
    catch {
        throw "Notify session bindings JSON is invalid: $Path. $($_.Exception.Message)"
    }

    if ($null -eq $parsed -or $parsed -isnot [System.Collections.IDictionary]) {
        throw "Notify session bindings JSON root must be an object: $Path"
    }

    return $parsed
}

function Write-NotifySessionBindings {
    param(
        [Parameter(Mandatory = $true)][hashtable]$Bindings,
        [string]$Path = (Get-NotifySessionBindingsPath)
    )

    $dir = Ensure-NotifySessionBindingsDirectory -Path $Path
    $tempPath = Join-Path $dir ([System.IO.Path]::GetRandomFileName())
    $utf8 = [System.Text.UTF8Encoding]::new($false)

    try {
        [System.IO.File]::WriteAllText($tempPath, ($Bindings | ConvertTo-Json -Depth 5), $utf8)
        if (Test-Path $Path) {
            Move-Item -Path $tempPath -Destination $Path -Force
        }
        else {
            Move-Item -Path $tempPath -Destination $Path
        }
    }
    finally {
        if (Test-Path $tempPath) {
            Remove-Item -Path $tempPath -Force -ErrorAction SilentlyContinue
        }
    }
}

function Set-NotifySessionBinding {
    param(
        [Parameter(Mandatory = $true)][string]$SessionId,
        [Parameter(Mandatory = $true)][long]$Hwnd
    )

    $path = Get-NotifySessionBindingsPath
    Invoke-NotifySessionBindingsLock -Path $path -Action {
        $bindings = Read-NotifySessionBindings -Path $path
        $bindings[$SessionId] = @{
            hwnd = $Hwnd
            updatedAt = (Get-Date).ToString('o')
        }
        Write-NotifySessionBindings -Bindings $bindings -Path $path
    }
}

function Get-NotifySessionBinding {
    param([Parameter(Mandatory = $true)][string]$SessionId)

    $path = Get-NotifySessionBindingsPath
    Invoke-NotifySessionBindingsLock -Path $path -Action {
        $bindings = Read-NotifySessionBindings -Path $path
        if ($bindings.ContainsKey($SessionId)) {
            return $bindings[$SessionId]
        }

        return $null
    }
}

function Remove-NotifySessionBinding {
    param([Parameter(Mandatory = $true)][string]$SessionId)

    $path = Get-NotifySessionBindingsPath
    Invoke-NotifySessionBindingsLock -Path $path -Action {
        $bindings = Read-NotifySessionBindings -Path $path
        if ($bindings.ContainsKey($SessionId)) {
            $bindings.Remove($SessionId)
            Write-NotifySessionBindings -Bindings $bindings -Path $path
        }
    }
}
