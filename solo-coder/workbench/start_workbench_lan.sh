#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
START_PORT="${1:-8091}"
HOST="0.0.0.0"
PID_FILE="${ROOT_DIR}/.workbench-lan.pid"
URL_FILE="${ROOT_DIR}/.workbench-lan.url"
LOG_FILE="${ROOT_DIR}/.workbench-lan.log"
PLIST_FILE="${HOME}/Library/LaunchAgents/com.yimianqianshi.workbench.lan.plist"
LAUNCH_LABEL="com.yimianqianshi.workbench.lan"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 未安装，无法启动服务。"
  exit 1
fi

find_free_port() {
  local port="$1"
  local tries=0
  while [ "${tries}" -lt 50 ]; do
    if ! lsof -tiTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "${port}"
      return 0
    fi
    port=$((port + 1))
    tries=$((tries + 1))
  done
  return 1
}

lan_ip() {
  ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || \
    ifconfig | awk '/inet / && $2 !~ /^127\\./ {print $2; exit}'
}

health_ok() {
  curl -fsS "http://127.0.0.1:${1}/api/health" >/dev/null 2>&1
}

if [ -f "${URL_FILE}" ]; then
  EXISTING_URL="$(cat "${URL_FILE}")"
  EXISTING_PORT="$(printf '%s' "${EXISTING_URL}" | sed -E 's#.*:([0-9]+)/.*#\1#')"
  if [ -n "${EXISTING_PORT}" ] && health_ok "${EXISTING_PORT}"; then
    CURRENT_IP="$(lan_ip || true)"
    if [ -n "${CURRENT_IP}" ]; then
      EXISTING_URL="http://${CURRENT_IP}:${EXISTING_PORT}/index.html"
      echo "${EXISTING_URL}" > "${URL_FILE}"
    fi
    echo "LAN Workbench 已在运行"
    echo "URL: ${EXISTING_URL}"
    exit 0
  fi
fi

PORT="$(find_free_port "${START_PORT}")" || {
  echo "未找到可用端口。"
  exit 1
}
IP="$(lan_ip)"
if [ -z "${IP}" ]; then
  echo "未能识别局域网 IP。请确认 Mac 已连接 Wi-Fi。"
  exit 1
fi
URL="http://${IP}:${PORT}/index.html"

echo "${URL}" > "${URL_FILE}"

if command -v launchctl >/dev/null 2>&1; then
  mkdir -p "$(dirname "${PLIST_FILE}")"
  cat > "${PLIST_FILE}" <<PLIST_EOF
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
    <string>${PORT}</string>
    <string>${HOST}</string>
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
  launchctl bootout "gui/$(id -u)" "${PLIST_FILE}" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/$(id -u)" "${PLIST_FILE}"
  launchctl kickstart -k "gui/$(id -u)/${LAUNCH_LABEL}" >/dev/null 2>&1 || true
else
  cd "${ROOT_DIR}"
  nohup python3 -u serve_workbench.py "${PORT}" "${HOST}" > "${LOG_FILE}" 2>&1 < /dev/null &
  echo "$!" > "${PID_FILE}"
  cd - >/dev/null
fi

for _ in {1..50}; do
  if health_ok "${PORT}"; then
    PID="$(lsof -tiTCP:"${PORT}" -sTCP:LISTEN | head -n 1 || cat "${PID_FILE}" 2>/dev/null || true)"
    [ -n "${PID}" ] && echo "${PID}" > "${PID_FILE}"
    echo "LAN Workbench 已启动"
    echo "URL: ${URL}"
    echo "PID: ${PID:-unknown}"
    echo "Windows 电脑需要和本机在同一个 Wi-Fi，并访问上面的 URL。"
    exit 0
  fi
  sleep 0.2
done

echo "LAN 服务未能在预期时间内启动。"
exit 1
