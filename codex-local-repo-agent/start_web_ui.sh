#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$ROOT_DIR/web"
LOG_DIR="$ROOT_DIR/.logs"
PID_FILE="$LOG_DIR/web-ui.pid"
LOG_FILE="$LOG_DIR/web-ui.log"

ACTION="${1:-start}"
PORT="${2:-5177}"
URL="http://127.0.0.1:${PORT}"

mkdir -p "$LOG_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] 缺少命令: $1" >&2
    exit 1
  fi
}

is_pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

is_port_listening() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

port_pid() {
  lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -n 1
}

wait_port() {
  local port="$1"
  local retries="${2:-30}"
  local i=0
  while (( i < retries )); do
    if is_port_listening "$port"; then
      return 0
    fi
    i=$((i + 1))
    sleep 0.2
  done
  return 1
}

health_check() {
  local body
  body="$(curl --noproxy '*' -fsS "$URL/" 2>/dev/null || true)"
  if [[ "$body" == *"Agent 本地仓库提问工作台（Codex 模块）"* ]] && [[ "$body" == *"app.js"* ]]; then
    echo "[OK] 页面健康检查通过: $URL"
    return 0
  fi
  echo "[WARN] 服务已监听，但页面内容校验失败。请强制刷新浏览器(Ctrl/Cmd+Shift+R)。"
  return 1
}

start() {
  require_cmd python3
  require_cmd lsof
  require_cmd curl

  if [[ ! -f "$WEB_DIR/index.html" ]]; then
    echo "[ERROR] 未找到页面文件: $WEB_DIR/index.html" >&2
    exit 1
  fi

  if is_port_listening "$PORT"; then
    local pid
    pid="$(port_pid "$PORT")"
    echo "[INFO] Web UI 已在运行: PID=${pid:-unknown}, URL=$URL"
    health_check || true
    return 0
  fi

  (
    cd "$WEB_DIR"
    nohup python3 -m http.server "$PORT" >"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
  )

  if ! wait_port "$PORT" 30; then
    echo "[ERROR] Web UI 启动失败，端口 $PORT 未监听。" >&2
    echo "[HINT] 查看日志: tail -n 120 $LOG_FILE" >&2
    exit 1
  fi

  local pid
  pid="$(port_pid "$PORT")"
  echo "[OK] Web UI 已启动: PID=${pid:-unknown}"
  echo "[INFO] URL: $URL"
  health_check || true
}

stop() {
  require_cmd lsof
  local pids=""
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' | xargs || true)"
  if [[ -z "$pids" ]]; then
    echo "[INFO] 端口 $PORT 无监听进程，无需停止。"
  else
    echo "[INFO] 停止端口 $PORT 监听进程: $pids"
    lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
    sleep 0.3
  fi

  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if is_pid_running "$pid"; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
    rm -f "$PID_FILE"
  fi
  echo "[OK] stop 完成"
}

status() {
  require_cmd lsof
  if is_port_listening "$PORT"; then
    local pid
    pid="$(port_pid "$PORT")"
    echo "[OK] running, port=$PORT, pid=${pid:-unknown}, url=$URL"
  else
    echo "[INFO] stopped, port=$PORT"
  fi
}

logs() {
  if [[ -f "$LOG_FILE" ]]; then
    tail -n 120 "$LOG_FILE"
  else
    echo "[INFO] 暂无日志文件: $LOG_FILE"
  fi
}

usage() {
  cat <<EOF
用法:
  ./start_web_ui.sh [start|stop|restart|status|logs] [port]

示例:
  ./start_web_ui.sh start 5177
  ./start_web_ui.sh status 5177
  ./start_web_ui.sh restart 5177
EOF
}

case "$ACTION" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  logs) logs ;;
  -h|--help|help) usage ;;
  *)
    echo "[ERROR] 未知动作: $ACTION" >&2
    usage
    exit 1
    ;;
esac
