# codex-local-repo-agent

用于当前仓库的最小闭环：通过 agent 执行链路调用 `codex` 模块运行本地 agent，不依赖 `Tools-project` 或 `127.0.0.1:3000` API。

## 核心脚本

- `run_repo_agent.sh`：在目标仓库目录直接执行 codex agent（默认加载提问建议 prompt）
- `list_providers.sh`：读取 `~/.codex/config.toml` 中的 provider 配置
- `start_web_ui.sh`：启动静态 Web UI（仅页面服务，不含后端 API）
- `start_all.sh`：启动 Web UI，并打印 CLI 运行指令
- `prompts/local_repo_question_advisor.txt`：默认“本地仓库提问建议”提示词

## 前置

- 本机已安装并可执行 `codex`
- `codex login` 已完成，且 `~/.codex/config.toml` 已配置可用 provider

## CLI 用法（推荐）

1) 查看 provider

```bash
cd /Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi/codex-local-repo-agent
./list_providers.sh
```

2) 使用默认 prompt 运行 agent

```bash
./run_repo_agent.sh \
  --repo-path /Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi
```

3) 指定模型或 profile

```bash
./run_repo_agent.sh \
  --repo-path /Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi \
  --model gpt-5-codex

./run_repo_agent.sh \
  --repo-path /Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi \
  --profile fast-ai
```

4) 自定义问题

```bash
./run_repo_agent.sh \
  --repo-path /Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi \
  --prompt "请总结该仓库启动步骤，并给出3个优先改进建议"
```

## 参数说明

- `--repo-path`：必填，目标仓库绝对路径
- `--prompt-file`：自定义提示词文件
- `--prompt`：直接传入提问内容（优先于 `--prompt-file`）
- `--model`：指定模型
- `--profile`：指定 codex profile
- `--sandbox`：`read-only | workspace-write | danger-full-access`
- `--output-file`：保存最后一条 assistant 消息

## Web UI 说明

- `start_web_ui.sh` / `start_all.sh` 只负责静态页面服务。
- 当前仓库未内置 `/api/*` 后端时，页面只能展示，不会执行提问流程。
- 真正可执行的闭环入口是 `run_repo_agent.sh`。
