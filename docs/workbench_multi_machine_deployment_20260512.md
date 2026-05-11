# Workbench 多机器部署与本地数据隔离 20260512

## 目标

同一套 `yimianqianshi` Workbench 需要在本机 Mac 和另外两台 Windows 机器上运行。代码、文档和通用逻辑可以同步到 GitHub，但每台机器的 Trae 本地日志、会话轮次缓存、批量组、截图缓存和提示词运行状态必须保持本机独立。

## 本次落地

1. LLM-Agent 模型列表压缩为小型选择项，只保留当前核心链路：
   - `DeepSeek V4 Pro`：用于不满意列双轴原因生成。
   - `Codex CLI / pinAI`：走本机 Codex CLI 默认 pinAI 链路，用于后续复核或生成。

2. Trae 路径改为环境变量优先，不再绑定单台 Mac 的绝对路径：
   - `WORKBENCH_DATA_DIR` / `YMQS_DATA_DIR`
   - `TRAE_ROOT`
   - `TRAE_APP_SUPPORT_DIR` / `TRAE_SUPPORT_DIR`
   - `TRAE_WORKSPACE_STORAGE_DIR`
   - `TRAE_APP_NAME`
   - `TRAE_CLI`

3. 默认路径按系统推断：
   - Workbench 运行数据：仓库根目录 `data/`，首次启动会从 `docs/data/generated/` 复制 `generation_prompts.json` 和 `prompt_state.json` 作为本机种子。
   - macOS：`~/Documents/trae_projects`，`~/Library/Application Support/Trae CN`
   - Windows：`%USERPROFILE%\Documents\trae_projects`，`%APPDATA%\Trae CN`
   - Linux：`~/trae_projects`，`~/.config/Trae CN`

4. 打开项目的顺序改为：
   - 优先用 `TRAE_CLI` 或 PATH 中的 `trae-cn/trae`。
   - macOS 没有 CLI 时用 `open -a "Trae CN"`。
   - Windows/Linux 没有 CLI 时只打开项目目录，不批量杀进程。

5. Codex CLI 启动改为跨平台终端：
   - macOS：Terminal + AppleScript。
   - Windows：`cmd /k` 新窗口。
   - Linux：尝试 `x-terminal-emulator/gnome-terminal/konsole/xterm`。

## 大模型链路

不满意列 LLM-Agent 目前保留两个模型入口：

```text
deepseek-v4-pro
  provider=deepseek
  baseUrl=https://api.deepseek.com
  env=DEEPSEEK_API_KEY

codex-cli-pinai
  provider=codex-cli
  source=本机 Codex CLI 默认 pinAI 配置
```

## 配置文件环境变量

Workbench 不在前端录入大模型 KEY。后端启动时会自动读取以下配置文件，后面的本机配置会覆盖前面的通用配置，已经存在的系统环境变量始终优先生效、不会被文件覆盖：

```text
<repo>/.env
<repo>/solo-coder/workbench/.env
<repo>/.env.local
<repo>/solo-coder/workbench/.env.local
WORKBENCH_ENV_FILE / YMQS_ENV_FILE 指向的外部 env 文件
```

推荐每台机器复制 `.env.example` 为 `.env.local`，把真实 KEY 写在本机 `.env.local`。如果一台机器用多个工作树，也可以把真实配置放在固定位置，再通过 `WORKBENCH_ENV_FILE` 或 `YMQS_ENV_FILE` 指向该文件。`.env` 和 `.env.local` 已被 `.gitignore` 排除，不能推送到远程仓库。

具体环境变量名如下：

```bash
DEEPSEEK_API_KEY=...
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_TEXT_MODEL=deepseek-v4-pro
TRAE_SESSION_ANNOTATION_PROVIDER=deepseek
TRAE_SESSION_ANNOTATION_MODEL=deepseek-v4-pro
TRAE_SESSION_ANNOTATION_MODELS=deepseek-v4-pro

CODEX_CLI=/path/to/codex
CODEX_CLI_PATH=/path/to/codex
CODEX_DEEPSEEK_WIRE_API=chat

WORKBENCH_ENV_FILE=/absolute/path/to/local.env
WORKBENCH_DATA_DIR=/path/to/local/data
YMQS_DATA_DIR=/path/to/local/data
TRAE_ROOT=/path/to/trae_projects
TRAE_APP_SUPPORT_DIR=/path/to/Trae CN
TRAE_WORKSPACE_STORAGE_DIR=/path/to/Trae CN/User/workspaceStorage
TRAE_APP_NAME=Trae CN
TRAE_CLI=/path/to/trae-cli

MODELSCOPE_API_KEY=
MODELSCOPE_API_BASE=https://api-inference.modelscope.cn/v1
MODELSCOPE_TEXT_MODEL=Qwen/Qwen3-235B-A22B-Instruct-2507
```

`CODEX_CLI` 或 `CODEX_CLI_PATH` 可显式指定 Codex CLI。未配置时会依次探测 PATH、nvm、npm global、Homebrew、Windows `%APPDATA%\npm` 等常见位置。

Codex CLI / pinAI 不写入 `~/.codex/config.toml`，也不覆盖本机默认 provider。DeepSeek 只在显式选择相关链路时通过临时参数传入。

仓库只提交 `.env.example`，不提交真实 `DEEPSEEK_API_KEY` 或 `MODELSCOPE_API_KEY`。文档中的“KEY”指环境变量名，不指真实密钥值。

Workbench 侧已落地“不满意列双轴标注”写回按钮：在批量项目组中选择组，选择 `DeepSeek V4 Pro`，点击 `生成当前组`，服务端会调用 `/api/annotate-dissatisfaction` 并只写回各机器本地 `data/generated/trae_session_rounds/{order}.json` 内的 `dissatisfactionReason`、`annotationHash`、`annotationVersion`、`annotationUpdatedAt`、`annotationSource` 字段。`Codex CLI / pinAI` 只作为本机复核入口，不直接批量写回不满意列。

## Windows 机器建议配置

PowerShell 示例：

```powershell
$env:TRAE_ROOT="$env:USERPROFILE\Documents\trae_projects"
$env:WORKBENCH_DATA_DIR="$PWD\data"
$env:TRAE_APP_SUPPORT_DIR="$env:APPDATA\Trae CN"
$env:TRAE_APP_NAME="Trae CN"
$env:DEEPSEEK_API_KEY="你的 DeepSeek Key"
python solo-coder\workbench\serve_workbench.py 8090
```

也可以直接使用 Windows 启动脚本：

```powershell
powershell -ExecutionPolicy Bypass -File solo-coder\workbench\start_workbench.ps1 restart 8090
```

或双击/命令行运行：

```bat
solo-coder\workbench\start_workbench.bat restart 8090
```

如果 Trae CLI 不在 PATH，需要显式设置：

```powershell
$env:TRAE_CLI="C:\Users\<你>\AppData\Local\Trae CN\Trae CN.exe"
```

实际路径以 Windows 本机安装位置为准。只要 `TRAE_APP_SUPPORT_DIR\User\workspaceStorage` 和 `TRAE_APP_SUPPORT_DIR\logs` 能读到，日志轨迹拉取链路就能继续工作。

## 本地数据隔离

以下内容属于机器本地运行数据，不同步、不提交、不推送：

```text
docs/data/generated/generation_prompts.json
docs/data/generated/prompt_state.json
docs/data/generated/trae_session_rounds/
docs/data/generated/feishu_screenshot_paste/
docs/data-bak/
```

其中 `prompt_state.json` 里包含完成状态、序号覆盖和批量组 `trae_groups`。这些数据必须各机器独立维护，否则不同电脑的批量组和轮次缓存会互相污染。

`.gitignore` 已加入上述路径。由于历史上部分生成文件可能已经被 Git 跟踪，提交时仍然必须只 stage 代码和文档，不使用 `git add -A`。

## 拉取 Trae 的跨机原则

日志轨迹拉取不依赖固定日期，也不依赖单台机器路径。正确链路是：

```text
序号项目
-> TRAE_ROOT 下的项目目录
-> workspaceStorage/*/workspace.json 定位 state.vscdb
-> state.vscdb 当前值和 raw 残留
-> TRAE_APP_SUPPORT_DIR/logs/** 全日期 Modular/ai-agent 日志
-> 项目目录内 *.log/*.md/*.txt/*.json 轨迹文件
-> 组装每轮 conversation/session/logTrace/screenshot
```

不同机器只需要把 `TRAE_ROOT` 和 `TRAE_APP_SUPPORT_DIR` 指到本机真实目录，不需要共享缓存文件。

## 边界

Chrome/飞书页面注入自动化当前仍以 macOS Apple Events 为主；Windows 可使用页面内复制、图片逐张粘贴和本地缓存拉取能力。该限制不影响 Trae 日志文件扫描、session 组装和 LLM-Agent 标注链路。
