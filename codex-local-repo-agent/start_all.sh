#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_PORT="${WEB_PORT:-5177}"
WEB_URL="http://127.0.0.1:${WEB_PORT}"

start_web() {
  echo "[INFO] 启动 Web UI（静态页面）..."
  "$ROOT_DIR/start_web_ui.sh" start "$WEB_PORT"
}

print_cli_hints() {
  cat <<HINT
[INFO] 本项目采用“agent-cli（底层 codex 模块）”模式，不再自动启动 Tools-project:3000。
[INFO] 直接执行 agent:
       $ROOT_DIR/run_repo_agent.sh --repo-path "$(cd "$ROOT_DIR/.." && pwd)"
[INFO] Provider 列表:
       $ROOT_DIR/list_providers.sh
HINT
}

main() {
  start_web
  print_cli_hints
  echo "[DONE] 启动完成"
  echo "       WEB: $WEB_URL"
}

main "$@"
