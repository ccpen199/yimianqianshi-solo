# Codex CLI 接入 DeepSeek 启动链路

## 目标

在 Workbench 右侧“模型与策略”区域增加一个可选启动链路：

```text
执行引擎 = Codex CLI
勾选 Codex CLI 接入 DeepSeek
点击启动 Codex
```

该链路只在用户显式选择时生效，不替换、不破坏默认 Trae 启动，也不改当前 `~/.codex/config.toml` 的 PinAI 默认 provider。

## 当前实现

前端入口：

```text
solo-coder/workbench/index.html
  模型与策略
  执行引擎：Trae IDE / Codex CLI
  Codex CLI 接入 DeepSeek checkbox
```

前端状态：

```text
localStorage.workbench.executionEngine
localStorage.workbench.codexDeepseekLaunch
```

后端入口：

```text
POST /api/batch-trae-projects
body:
  action: open
  orders: [...]
  engine: codex-cli
  codexDeepseek: true
```

默认旧流程：

```text
engine 未传或 engine=trae
  -> open_trae_project
  -> Trae CN 原启动链路
```

新链路：

```text
engine=codex-cli
  -> open_codex_cli_project
  -> 按系统打开交互终端启动 codex（macOS Terminal / Windows cmd / Linux 常见 terminal）
```

## DeepSeek 配置

默认模型与 Base URL：

```text
DEEPSEEK_TEXT_MODEL=deepseek-v4-pro
DEEPSEEK_API_BASE=https://api.deepseek.com
```

必需环境变量：

```bash
export DEEPSEEK_API_KEY=你的DeepSeekKey
```

Codex 启动时临时传入：

```bash
codex -C <project_path> \
  -m deepseek-v4-pro \
  -c 'model_provider="deepseek"' \
  -c 'model="deepseek-v4-pro"' \
  -c 'model_providers.deepseek.name="DeepSeek"' \
  -c 'model_providers.deepseek.base_url="https://api.deepseek.com"' \
  -c 'model_providers.deepseek.env_key="DEEPSEEK_API_KEY"' \
  -c 'model_providers.deepseek.wire_api="responses"' \
  -c 'model_providers.deepseek.requires_openai_auth=false'
```

## 风险边界

Codex CLI 官方配置支持自定义 provider，但当前官方配置参考中 `wire_api` 主要面向 `responses`。

DeepSeek 文档提供的是 OpenAI 格式 `https://api.deepseek.com`，模型为 `deepseek-v4-pro`。因此当前链路是实验启动链路：

```text
如果 DeepSeek 兼容 Codex 需要的 wire_api：
  Terminal 中 Codex 正常启动。

如果 DeepSeek 不兼容：
  Terminal 中显示 Codex/provider 报错。
  默认 Trae 启动和 PinAI provider 不受影响。
```

可通过环境变量覆盖：

```bash
export CODEX_DEEPSEEK_WIRE_API=responses
```

## MCP 方案参考

`deepseek-claude-code-worker-mcp` 的思路更像第二阶段架构：

```text
主 coding agent 仍负责规划、整合和最终提交。
DeepSeek worker 作为 MCP 子工具承接大段分析/代码生成/并行任务。
```

这能降低主 Codex 消耗，但和“Codex CLI 直接换 provider”不是同一层：

```text
直接 provider：
  Codex 本身所有推理请求都走 DeepSeek。

MCP worker：
  Codex 仍启动，但把部分工作委派给 DeepSeek worker。
```

当前先落地直接 provider 开关；MCP worker 后续可作为独立能力接入，不和本次启动开关混在一起。

## 验证策略

本次只做静态校验：

```text
python3 -m py_compile solo-coder/workbench/serve_workbench.py
node --check solo-coder/workbench/app.js
```

不自动点击启动新链路，避免误开 Codex 消耗。用户显式点击“启动 Codex”后再看 Terminal 输出验证。
