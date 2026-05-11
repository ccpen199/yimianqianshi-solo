param(
  [string]$Action = "restart",
  [int]$Port = 8090,
  [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $RootDir ".workbench.pid"
$UrlFile = Join-Path $RootDir ".workbench.url"
$LogFile = Join-Path $RootDir ".workbench.log"

function Get-PythonCommand {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) { return $python.Source }
  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) { return $py.Source }
  throw "Python is not installed or not in PATH."
}

function Test-Health([int]$CheckPort) {
  try {
    Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$CheckPort/api/health" -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Test-PortFree([int]$CheckPort) {
  $listener = $null
  try {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $CheckPort)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) { $listener.Stop() }
  }
}

function Find-FreePort([int]$StartPort) {
  for ($candidate = $StartPort; $candidate -lt ($StartPort + 50); $candidate++) {
    if (Test-PortFree $candidate) { return $candidate }
  }
  throw "No free port found from $StartPort."
}

function Stop-Workbench {
  if (Test-Path $PidFile) {
    $oldPid = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($oldPid) {
      $process = Get-Process -Id ([int]$oldPid) -ErrorAction SilentlyContinue
      if ($process) { Stop-Process -Id $process.Id -Force }
    }
  }
  Remove-Item -LiteralPath $PidFile,$UrlFile -Force -ErrorAction SilentlyContinue
}

function Start-Workbench {
  if ($Action -eq "start" -and (Test-Path $UrlFile)) {
    $existingUrl = Get-Content $UrlFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existingUrl -match ":(\d+)/" -and (Test-Health ([int]$Matches[1]))) {
      Start-Process $existingUrl
      Write-Host "Workbench already running"
      Write-Host "URL: $existingUrl"
      return
    }
  }

  $freePort = Find-FreePort $Port
  $url = "http://$HostName`:$freePort/index.html"
  Set-Content -Path $UrlFile -Value $url -Encoding UTF8

  $python = Get-PythonCommand
  $server = Join-Path $RootDir "serve_workbench.py"
  $cmd = "`"$python`" -u `"$server`" $freePort $HostName > `"$LogFile`" 2>&1"
  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $cmd) -WorkingDirectory $RootDir -PassThru -WindowStyle Hidden
  Set-Content -Path $PidFile -Value $proc.Id -Encoding UTF8

  for ($i = 0; $i -lt 50; $i++) {
    if (Test-Health $freePort) {
      Start-Process $url
      Write-Host "Workbench started"
      Write-Host "URL: $url"
      Write-Host "PID: $($proc.Id)"
      return
    }
    Start-Sleep -Milliseconds 200
  }
  throw "Workbench did not start in time. Log: $LogFile"
}

switch ($Action.ToLowerInvariant()) {
  "start" { Start-Workbench }
  "restart" { Stop-Workbench; Start-Workbench }
  "stop" { Stop-Workbench; Write-Host "Workbench stopped" }
  "status" {
    if (Test-Path $UrlFile) {
      $url = Get-Content $UrlFile -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($url -match ":(\d+)/" -and (Test-Health ([int]$Matches[1]))) {
        Write-Host "Workbench running"
        Write-Host "URL: $url"
        exit 0
      }
    }
    Write-Host "Workbench not running"
    exit 1
  }
  "open" {
    if (Test-Path $UrlFile) {
      $url = Get-Content $UrlFile -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($url -match ":(\d+)/" -and (Test-Health ([int]$Matches[1]))) {
        Start-Process $url
        Write-Host "URL: $url"
        exit 0
      }
    }
    Start-Workbench
  }
  default { throw "Usage: powershell -ExecutionPolicy Bypass -File start_workbench.ps1 [start|stop|restart|status|open] [port]" }
}
