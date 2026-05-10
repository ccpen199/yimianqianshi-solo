# Codex CLI 接入 DeepSeek V4 Pro 启动链路

时间：2026-05-09
范围：`solo-coder/workbench` 的批量启动区。

## 目标

在“模型与策略”区增加一个可选启动链路：

```text
执行引擎 = Codex CLI
勾选 Codex CLI 接入 DeepSeek
点击启动 Codex
```

只有满足上述条件时，Codex CLI 才会尝试使用 DeepSeek V4 Pro；默认不勾选、默认 Trae IDE 的旧启动流程不变。

## 调研结论

1. Codex CLI 支持通过 `~/.codex/config.toml` 或 `-c key=value` 覆盖 `model_provider`、`model` 和 `model_providers.<id>` 配置。
2. 本机当前 Codex 默认 provider 是 `PinAI`，配置在 `~/.codex/config.toml`，旧流程不能直接覆盖它。
3. DeepSeek 文档给出的 OpenAI 格式 base URL 是 `https://api.deepseek.com`，目标模型为 `deepseek-v4-pro`。
4. OpenAI Codex 官方配置文档目前把自定义 provider 的 `wire_api` 标为 `responses`；DeepSeek 公开文档强调的是 OpenAI 兼容接口。两者是否完全兼容需要点击启动后由 Codex 终端真实验证。
5. `deepseek-claude-code-worker-mcp` 的价值更像“让主 Agent 把重活委派给 DeepSeek worker”，不是直接替换 Codex CLI provider。本轮先落地 Codex 直连 provider 启动选项，MCP 适合作为第二阶段降本方案。

## 实现策略

不改 `~/.codex/config.toml`，避免破坏 PinAI / ChatGPT 旧流程。

点击启动时，在 Terminal 中打开 Codex CLI，并给本次进程传入临时配置覆盖：

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

环境变量：

```bash
DEEPSEEK_API_KEY=...
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_TEXT_MODEL=deepseek-v4-pro
CODEX_DEEPSEEK_WIRE_API=responses
```

`CODEX_DEEPSEEK_WIRE_API` 保留为可覆盖项。如果后续确认当前 Codex 版本支持 chat-completions wire，可以在不改代码的情况下改为：

```bash
CODEX_DEEPSEEK_WIRE_API=chat
```

## UI 行为

新增位置：批量项目组侧栏的“模型与策略”。

```text
执行引擎：
  Trae IDE    默认，保持旧流程
  Codex CLI   新链路

勾选：
  Codex CLI 接入 DeepSeek
  deepseek-v4-pro · https://api.deepseek.com
```

启动规则：

```text
执行引擎=Trae IDE：
  点击“开启 Trae” -> 旧 open_trae_project 流程

执行引擎=Codex CLI，未勾选 DeepSeek：
  点击“启动 Codex” -> 用当前 Codex 默认配置启动

执行引擎=Codex CLI，勾选 DeepSeek：
  点击“启动 Codex” -> 用 deepseek-v4-pro provider 覆盖启动
```

关闭规则：

```text
关闭项目仍走旧 Trae 关闭逻辑。
Codex CLI 终端窗口暂不自动关闭，避免误杀用户正在交互的 shell。
```

## 文件改动

```text
solo-coder/workbench/index.html
  新增模型与策略区域、Codex DeepSeek 勾选项。

solo-coder/workbench/app.js
  保存执行引擎选择和 DeepSeek 勾选状态到 localStorage。
  点击启动时将 engine/codexDeepseek 传给后端。

solo-coder/workbench/styles.css
  新增模型与策略卡片、执行引擎按钮和 DeepSeek 开关样式。

solo-coder/workbench/serve_workbench.py
  新增 open_codex_cli_project。
  新增 DeepSeek provider 临时启动参数。
  batch_trae_projects 支持 engine=codex-cli。
```

## 风险边界

```text
不写入 ~/.codex/config.toml。
不改默认 model_provider=PinAI。
不替换旧 Trae 启动/关闭链路。
不在代码落地时自动启动 Codex；只有用户点击启动才测试新链路。
```

如果点击后 Codex 终端报 provider/wire_api 不兼容，则下一步有两个方向：

```text
1. 确认当前 Codex CLI 是否支持 chat-completions wire，并设置 CODEX_DEEPSEEK_WIRE_API=chat。
2. 走 MCP worker 方案：Codex 仍用原 provider，但把高 token 的代码阅读/修改任务委派给 DeepSeek worker。
```
