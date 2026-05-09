#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DEFAULT_PORT="8090"
ACTION="${1:-restart}"
START_PORT="${2:-$DEFAULT_PORT}"
PID_FILE="${ROOT_DIR}/.workbench.pid"
URL_FILE="${ROOT_DIR}/.workbench.url"
LOG_FILE="${ROOT_DIR}/.workbench.log"
PLIST_FILE="${HOME}/Library/LaunchAgents/com.yimianqianshi.workbench.plist"
LAUNCH_LABEL="com.yimianqianshi.workbench"

case "$ACTION" in
  start|stop|restart|status|open)
    ;;
  ''|*[!0-9]*)
    echo "用法: sh start_workbench.sh [start|stop|restart|status|open] [port]"
    echo "默认: sh start_workbench.sh restart 8090"
    exit 2
    ;;
  *)
    START_PORT="$ACTION"
    ACTION="restart"
    ;;
esac

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 未安装，无法启动服务。"
  exit 1
fi

port_from_url() {
  sed -E 's#.*:([0-9]+)/.*#\1#' "$1" 2>/dev/null || true
}

health_ok() {
  curl -fsS "http://127.0.0.1:$1/api/health" >/dev/null 2>&1
}

pid_for_port() {
  lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
}

open_url() {
  if command -v open >/dev/null 2>&1; then
    open "$1" >/dev/null 2>&1 || true
  fi
}

find_free_port() {
  port="$1"
  tries=0
  while [ "$tries" -lt 50 ]; do
    if ! lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
    tries=$((tries + 1))
  done
  return 1
}

wait_until_stopped() {
  pid="$1"
  tries=0
  while [ "$tries" -lt 30 ]; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.2
    tries=$((tries + 1))
  done
  return 1
}

stop_pid() {
  pid="$1"
  if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    if ! wait_until_stopped "$pid"; then
      kill -9 "$pid" >/dev/null 2>&1 || true
      wait_until_stopped "$pid" || true
    fi
  fi
}

stop_port_if_workbench() {
  port="$1"
  [ -n "$port" ] || return 0
  if health_ok "$port"; then
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    for pid in $pids; do
      stop_pid "$pid"
    done
  fi
}

stop_workbench() {
  if command -v launchctl >/dev/null 2>&1 && [ -f "$PLIST_FILE" ]; then
    launchctl bootout "gui/$(id -u)" "$PLIST_FILE" >/dev/null 2>&1 || true
  fi

  if [ -f "$PID_FILE" ]; then
    stop_pid "$(cat "$PID_FILE" 2>/dev/null || true)"
  fi

  if [ -f "$URL_FILE" ]; then
    old_port="$(port_from_url "$URL_FILE")"
    stop_port_if_workbench "$old_port"
  fi

  stop_port_if_workbench "$START_PORT"
  rm -f "$PID_FILE" "$URL_FILE"
}

status_workbench() {
  if [ -f "$URL_FILE" ]; then
    url="$(cat "$URL_FILE")"
    port="$(port_from_url "$URL_FILE")"
    if [ -n "$port" ] && health_ok "$port"; then
      pid="$(pid_for_port "$port")"
      echo "Workbench 运行中"
      echo "URL: $url"
      echo "PID: ${pid:-unknown}"
      return 0
    fi
  fi
  if health_ok "$START_PORT"; then
    pid="$(pid_for_port "$START_PORT")"
    echo "Workbench 运行中"
    echo "URL: http://127.0.0.1:${START_PORT}/index.html"
    echo "PID: ${pid:-unknown}"
    return 0
  fi
  echo "Workbench 未运行"
  return 1
}

start_workbench() {
  if [ "$ACTION" = "start" ] && [ -f "$URL_FILE" ]; then
    existing_url="$(cat "$URL_FILE")"
    existing_port="$(port_from_url "$URL_FILE")"
    if [ -n "$existing_port" ] && health_ok "$existing_port"; then
      open_url "$existing_url"
      echo "Workbench 已在运行"
      echo "URL: $existing_url"
      return 0
    fi
  fi

  port="$(find_free_port "$START_PORT")" || {
    echo "未找到可用端口。"
    exit 1
  }
  url="http://127.0.0.1:${port}/index.html"
  echo "$url" > "$URL_FILE"

  if command -v launchctl >/dev/null 2>&1; then
    mkdir -p "$(dirname "$PLIST_FILE")"
    cat > "$PLIST_FILE" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCH_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(command -v python3)</string>
    <string>-u</string>
    <string>${ROOT_DIR}/serve_workbench.py</string>
    <string>${port}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${ROOT_DIR}</string>
  <key>StandardOutPath</key>
  <string>${LOG_FILE}</string>
  <key>StandardErrorPath</key>
  <string>${LOG_FILE}</string>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
PLIST_EOF
    launchctl bootout "gui/$(id -u)" "$PLIST_FILE" >/dev/null 2>&1 || true
    launchctl bootstrap "gui/$(id -u)" "$PLIST_FILE"
    launchctl kickstart -k "gui/$(id -u)/${LAUNCH_LABEL}" >/dev/null 2>&1 || true
  else
    (
      cd "$ROOT_DIR"
      nohup python3 -u serve_workbench.py "$port" > "$LOG_FILE" 2>&1 < /dev/null &
      echo "$!" > "$PID_FILE"
    )
  fi

  tries=0
  while [ "$tries" -lt 50 ]; do
    if health_ok "$port"; then
      pid="$(pid_for_port "$port")"
      [ -n "$pid" ] && echo "$pid" > "$PID_FILE"
      open_url "$url"
      echo "Workbench 已启动"
      echo "URL: $url"
      echo "PID: ${pid:-unknown}"
      return 0
    fi
    sleep 0.2
    tries=$((tries + 1))
  done

  echo "服务未能在预期时间内启动。日志：$LOG_FILE"
  exit 1
}

case "$ACTION" in
  status)
    status_workbench
    ;;
  open)
    if status_workbench >/dev/null 2>&1; then
      open_url "$(cat "$URL_FILE")"
      status_workbench
    else
      ACTION="start"
      start_workbench
    fi
    ;;
  stop)
    stop_workbench
    echo "Workbench 已停止"
    ;;
  restart)
    stop_workbench
    start_workbench
    ;;
  start)
    start_workbench
    ;;
esac
