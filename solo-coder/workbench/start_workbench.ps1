param(
  [string]$Action = "restart",
  [int]$Port = 8090,
  [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $RootDir ".workbench.pid"
$UrlFile = Join-Path $RootDir ".workbench.url"
$OutLogFile = Join-Path $RootDir ".workbench.out.log"
$ErrLogFile = Join-Path $RootDir ".workbench.err.log"
$LegacyLogFile = Join-Path $RootDir ".workbench.log"

function Resolve-Args {
  if ($Action -match '^\d+$') {
    $script:Port = [int]$Action
    $script:Action = "restart"
  }

  $script:Action = $Action.ToLowerInvariant()
  if (@("start", "stop", "restart", "status", "open") -notcontains $script:Action) {
    throw "Usage: start_workbench.bat [start|stop|restart|status|open] [port]"
  }
}

function Get-PythonCommand {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) { return $python.Source }

  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) { return $py.Source }

  throw "Python is not installed or not in PATH."
}

function Get-PortFromUrl([string]$Url) {
  if ($Url -match ':(\d+)/') {
    return [int]$Matches[1]
  }
  return $null
}

function Test-WorkbenchHealth([int]$CheckPort) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$CheckPort/api/health" -TimeoutSec 2
    return ($response.StatusCode -eq 200 -and $response.Content -match '"ok"\s*:\s*true')
  } catch {
    return $false
  }
}

function Test-PortFree([int]$CheckPort) {
  try {
    $connection = Get-NetTCPConnection -LocalPort $CheckPort -State Listen -ErrorAction SilentlyContinue
    return -not [bool]$connection
  } catch {
    return $true
  }
}

function Find-FreePort([int]$StartPort) {
  for ($candidate = $StartPort; $candidate -lt ($StartPort + 50); $candidate++) {
    if (Test-PortFree $candidate) {
      return $candidate
    }
  }
  throw "No free port found from $StartPort."
}

function Stop-ProcessTree([int]$ProcessId) {
  $children = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ParentProcessId -eq $ProcessId }
  foreach ($child in $children) {
    Stop-ProcessTree ([int]$child.ProcessId)
  }
  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Stop-PidFileProcess {
  if (-not (Test-Path $PidFile)) {
    return
  }

  $oldPid = Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $oldPid -or $oldPid -notmatch '^\d+$') {
    return
  }

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $oldPid" -ErrorAction SilentlyContinue
  if ($process -and $process.CommandLine -like "*serve_workbench.py*") {
    Stop-ProcessTree ([int]$oldPid)
  }
}

function Stop-PortIfWorkbench([int]$CheckPort) {
  if (-not (Test-WorkbenchHealth $CheckPort)) {
    return
  }

  $connections = Get-NetTCPConnection -LocalPort $CheckPort -State Listen -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue
    if ($process -and $process.CommandLine -like "*serve_workbench.py*") {
      Stop-ProcessTree ([int]$process.ProcessId)
    }
  }
}

function Stop-Workbench {
  Stop-PidFileProcess

  if (Test-Path $UrlFile) {
    $existingUrl = Get-Content $UrlFile -ErrorAction SilentlyContinue | Select-Object -First 1
    $existingPort = Get-PortFromUrl $existingUrl
    if ($existingPort) {
      Stop-PortIfWorkbench $existingPort
    }
  }

  Stop-PortIfWorkbench $Port
  Remove-Item -LiteralPath $PidFile, $UrlFile -Force -ErrorAction SilentlyContinue
}

function Get-RunningStatus {
  if (Test-Path $UrlFile) {
    $url = Get-Content $UrlFile -ErrorAction SilentlyContinue | Select-Object -First 1
    $existingPort = Get-PortFromUrl $url
    if ($existingPort -and (Test-WorkbenchHealth $existingPort)) {
      return @{
        Running = $true
        Url = $url
        Port = $existingPort
      }
    }
  }

  if (Test-WorkbenchHealth $Port) {
    return @{
      Running = $true
      Url = "http://127.0.0.1:$Port/index.html"
      Port = $Port
    }
  }

  return @{ Running = $false }
}

function Start-Workbench {
  if ($Action -eq "start") {
    $status = Get-RunningStatus
    if ($status.Running) {
      Start-Process $status.Url
      Write-Host "Workbench already running"
      Write-Host "URL: $($status.Url)"
      return
    }
  }

  $freePort = Find-FreePort $Port
  $url = "http://$HostName`:$freePort/index.html"
  Set-Content -Path $UrlFile -Value $url -Encoding ASCII

  $python = Get-PythonCommand
  $server = Join-Path $RootDir "serve_workbench.py"
  if (-not (Test-Path $server)) {
    throw "Missing server script: $server"
  }

  Set-Content -Path $OutLogFile -Value "" -Encoding ASCII
  Set-Content -Path $ErrLogFile -Value "" -Encoding ASCII
  if (-not (Test-Path $LegacyLogFile)) {
    Set-Content -Path $LegacyLogFile -Value "" -Encoding ASCII
  }

  $proc = Start-Process `
    -FilePath $python `
    -ArgumentList @("-u", $server, "$freePort", $HostName) `
    -WorkingDirectory $RootDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $OutLogFile `
    -RedirectStandardError $ErrLogFile `
    -PassThru

  Set-Content -Path $PidFile -Value $proc.Id -Encoding ASCII

  for ($i = 0; $i -lt 50; $i++) {
    if (Test-WorkbenchHealth $freePort) {
      Start-Process $url
      Write-Host "Workbench started"
      Write-Host "URL: $url"
      Write-Host "PID: $($proc.Id)"
      return
    }
    Start-Sleep -Milliseconds 200
  }

  Stop-Workbench
  throw "Workbench did not start in time. Logs: $OutLogFile, $ErrLogFile"
}

Resolve-Args

switch ($Action) {
  "start" {
    Start-Workbench
  }
  "restart" {
    Stop-Workbench
    Start-Workbench
  }
  "stop" {
    Stop-Workbench
    Write-Host "Workbench stopped"
  }
  "status" {
    $status = Get-RunningStatus
    if ($status.Running) {
      Write-Host "Workbench running"
      Write-Host "URL: $($status.Url)"
      exit 0
    }
    Write-Host "Workbench not running"
    exit 1
  }
  "open" {
    $status = Get-RunningStatus
    if ($status.Running) {
      Start-Process $status.Url
      Write-Host "URL: $($status.Url)"
    } else {
      Start-Workbench
    }
  }
}
