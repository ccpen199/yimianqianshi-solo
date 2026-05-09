#!/usr/bin/env bash
set -euo pipefail

MODEL="${MODEL:-}"
PROFILE="${PROFILE:-}"
SANDBOX="${SANDBOX:-workspace-write}"
PROMPT_FILE_DEFAULT="$(cd "$(dirname "$0")" && pwd)/prompts/local_repo_question_advisor.txt"
LAST_MSG_FILE=""

REPO_PATH=""
PROMPT_TEXT=""
PROMPT_FILE=""

usage() {
  cat <<USAGE
Usage:
  $(basename "$0") --repo-path <absolute_path> [options]

Options:
  --repo-path <path>        Local repository absolute path (required)
  --model <model>           Model name (optional)
  --profile <name>          Codex profile from ~/.codex/config.toml (optional)
  --sandbox <mode>          read-only/workspace-write/danger-full-access (default: ${SANDBOX})
  --prompt-file <file>      Prompt template file (default built-in advisor prompt)
  --prompt "<text>"         Inline prompt text (higher priority than --prompt-file)
  --output-file <file>      Save last assistant message to a file (optional)
  -h, --help                Show help

Examples:
  $(basename "$0") --repo-path /Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi
  $(basename "$0") --repo-path /path/to/repo --model gpt-5-codex
  $(basename "$0") --repo-path /path/to/repo --profile fast-ai
  $(basename "$0") --repo-path /path/to/repo --prompt "请总结该仓库启动流程并指出3个风险点"
USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] Missing command: $1" >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-path)
      REPO_PATH="${2:-}"
      shift 2
      ;;
    --model)
      MODEL="${2:-}"
      shift 2
      ;;
    --profile)
      PROFILE="${2:-}"
      shift 2
      ;;
    --sandbox)
      SANDBOX="${2:-}"
      shift 2
      ;;
    --prompt-file)
      PROMPT_FILE="${2:-}"
      shift 2
      ;;
    --prompt)
      PROMPT_TEXT="${2:-}"
      shift 2
      ;;
    --output-file)
      LAST_MSG_FILE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$REPO_PATH" ]]; then
  echo "[ERROR] --repo-path is required" >&2
  usage
  exit 1
fi

if [[ "$REPO_PATH" != /* ]]; then
  echo "[ERROR] --repo-path must be an absolute path" >&2
  exit 1
fi

if [[ ! -d "$REPO_PATH" ]]; then
  echo "[ERROR] Repository path not found: $REPO_PATH" >&2
  exit 1
fi

if [[ -z "$PROMPT_TEXT" ]]; then
  if [[ -n "$PROMPT_FILE" ]]; then
    if [[ ! -f "$PROMPT_FILE" ]]; then
      echo "[ERROR] Prompt file not found: $PROMPT_FILE" >&2
      exit 1
    fi
  else
    PROMPT_FILE="$PROMPT_FILE_DEFAULT"
  fi
  PROMPT_TEXT="$(cat "$PROMPT_FILE")"
fi

require_cmd codex

if [[ "$SANDBOX" != "read-only" && "$SANDBOX" != "workspace-write" && "$SANDBOX" != "danger-full-access" ]]; then
  echo "[ERROR] --sandbox must be read-only/workspace-write/danger-full-access" >&2
  exit 1
fi

auto_cleanup_output=false
if [[ -z "$LAST_MSG_FILE" ]]; then
  LAST_MSG_FILE="$(mktemp -t codex-local-repo-agent-last-message.XXXXXX)"
  auto_cleanup_output=true
fi

cmd=(codex exec -C "$REPO_PATH" --sandbox "$SANDBOX" --skip-git-repo-check -o "$LAST_MSG_FILE" -)
if [[ -n "$MODEL" ]]; then
  cmd+=(-m "$MODEL")
fi
if [[ -n "$PROFILE" ]]; then
  cmd+=(-p "$PROFILE")
fi

echo "[1/2] 在仓库执行 codex agent..."
echo "[INFO] repo=$REPO_PATH"
if [[ -n "$PROFILE" ]]; then
  echo "[INFO] profile=$PROFILE"
fi
if [[ -n "$MODEL" ]]; then
  echo "[INFO] model=$MODEL"
fi
echo "[INFO] sandbox=$SANDBOX"

printf '%s\n' "$PROMPT_TEXT" | "${cmd[@]}"

echo "[2/2] 最终回答"
if [[ -s "$LAST_MSG_FILE" ]]; then
  cat "$LAST_MSG_FILE"
else
  echo "[WARN] 未捕获到 last message（已在上方原始输出中显示）"
fi

if [[ "$auto_cleanup_output" == true ]]; then
  rm -f "$LAST_MSG_FILE"
fi
