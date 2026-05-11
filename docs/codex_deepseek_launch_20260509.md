# Codex CLI 接入 DeepSeek v4 Pro 启动链路

## 目标

在 Workbench 的“模型与策略”区增加一个可选启动方式：

```text
执行引擎 = Codex CLI
勾选 = Codex CLI 接入 DeepSeek
模型 = deepseek-v4-pro
BASE URL = https://api.deepseek.com
```

默认不勾选时，旧流程不变：

```text
执行引擎 = Trae IDE -> 仍然打开 Trae CN
执行引擎 = Codex CLI，但不勾选 DeepSeek -> 使用当前 ~/.codex/config.toml
```

2026-05-12 补充：LLM-Agent 首页模型列表保留两条核心链路，界面压缩为小型选择项：

```text
DeepSeek V4 Pro       用于不满意列双轴原因生成
Codex CLI / pinAI     使用本机 Codex CLI 默认 pinAI provider 做复核或生成
```

`Codex CLI / pinAI` 不修改 `~/.codex/config.toml`，只是把本机 Codex CLI 作为可选模型入口暴露出来。服务进程会探测 PATH、nvm、npm global、Homebrew 和 Windows npm 目录，也可以用 `CODEX_CLI` / `CODEX_CLI_PATH` 显式指定。DeepSeek V4 Pro 仍通过环境变量和临时参数接入。

Workbench 不在前端配置大模型 KEY。后端启动时读取 `<repo>/.env`、`<repo>/.env.local`、`solo-coder/workbench/.env`、`solo-coder/workbench/.env.local`。真实密钥只放本机 `.env.local`，仓库只提交 `.env.example`。

2026-05-12 落地补充：Workbench 的 LLM-Agent 卡片已新增 `生成当前组` 按钮。选择 `DeepSeek V4 Pro` 后会调用服务端 `/api/annotate-dissatisfaction`，按当前批量组读取本机 `data/generated/trae_session_rounds/{order}.json`，用 DeepSeek 生成并写回不满意列双轴原因。`Codex CLI / pinAI` 作为本机复核/启动入口，不直接批量写回不满意列。

## 参考来源

调研的 MCP 仓库：

```text
https://github.com/louchi1984-coder/deepseek-claude-code-worker-mcp
```

该仓库的关键思路：

```text
Codex Desktop 负责计划、委派和审查。
DeepSeek V4 通过 Claude Code worker 执行昂贵的代码阅读、编辑和检查。
目标是减少 Codex 主线程 token，而不是减少 DeepSeek token。
worker 通过 MCP 暴露 start/get/tail/wait/cancel 等异步工具。
```

本次没有直接安装 MCP，原因：

```text
1. MCP 方案需要 Claude Code CLI、DeepSeek key、MCP server 配置和 doctor 验证。
2. 它更适合后续做“Codex 主控 + DeepSeek worker”的多代理委派。
3. 当前需求是启动项选择，因此先接 Codex CLI 的 OpenAI-compatible provider。
4. 旧流程必须稳定，不能因为实验性 MCP 影响 Trae/Codex 原有启动。
```

## 当前实现

前端：

```text
位置：批量项目组 -> 模型与策略

新增：
  执行引擎：
    Trae IDE
    Codex CLI

  勾选项：
    Codex CLI 接入 DeepSeek
    deepseek-v4-pro · https://api.deepseek.com
```

后端：

```text
POST /api/batch-trae-projects

body:
  action: "open"
  orders: [...]
  engine: "codex-cli"
  codexDeepseek: true
```

如果 `engine != codex-cli`：

```text
保持旧流程：
  open_trae_project(order)
```

如果 `engine == codex-cli`：

```text
按系统打开交互终端
  macOS -> Terminal
  Windows -> cmd /k
  Linux -> x-terminal-emulator/gnome-terminal/konsole/xterm
cd <项目目录>
codex -C <项目目录> ...
```

如果同时 `codexDeepseek=true`：

```text
codex -C <项目目录> \
  -m deepseek-v4-pro \
  -c 'model_provider="deepseek"' \
  -c 'model="deepseek-v4-pro"' \
  -c 'model_providers.deepseek.name="DeepSeek"' \
  -c 'model_providers.deepseek.base_url="https://api.deepseek.com"' \
  -c 'model_providers.deepseek.env_key="DEEPSEEK_API_KEY"' \
  -c 'model_providers.deepseek.wire_api="chat"' \
  -c 'model_providers.deepseek.requires_openai_auth=false'
```

## 配置边界

当前实现使用 Codex CLI 的 `-c key=value` 临时覆盖。

```text
不会修改 ~/.codex/config.toml
不会覆盖当前 PinAI provider
不会改变 Codex CLI 默认模型
只有“执行引擎=Codex CLI 且勾选 DeepSeek”时才生效
```

当前本机 `~/.codex/config.toml` 仍是：

```text
model_provider = "PinAI"
[model_providers.PinAI]
base_url = "https://us.pinai-cn.com"
wire_api = "responses"
```

## 环境变量

DeepSeek key 从环境变量读取：

```bash
export DEEPSEEK_API_KEY="..."
```

可选覆盖：

```bash
export DEEPSEEK_API_BASE="https://api.deepseek.com"
export DEEPSEEK_TEXT_MODEL="deepseek-v4-pro"
export CODEX_DEEPSEEK_WIRE_API="chat"
```

如果 Workbench 服务进程没有 `DEEPSEEK_API_KEY`，启动的 Terminal 会要求 shell 环境里存在该变量：

```bash
: "${DEEPSEEK_API_KEY:?请先 export DEEPSEEK_API_KEY=你的DeepSeekKey 后再启动 Codex DeepSeek}"
```

## 验证

已验证 Codex CLI 接受这组临时配置，不触发模型请求：

```bash
codex --version \
  -c 'model_provider="deepseek"' \
  -c 'model="deepseek-v4-pro"' \
  -c 'model_providers.deepseek.name="DeepSeek"' \
  -c 'model_providers.deepseek.base_url="https://api.deepseek.com"' \
  -c 'model_providers.deepseek.env_key="DEEPSEEK_API_KEY"' \
  -c 'model_providers.deepseek.wire_api="chat"' \
  -c 'model_providers.deepseek.requires_openai_auth=false'
```

输出：

```text
codex-cli 0.125.0
```

没有自动点击启动测试，避免在没有 `DEEPSEEK_API_KEY` 的情况下打开失败终端或触发真实模型调用。
