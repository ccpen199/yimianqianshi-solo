# Trae SessionId 共性规则汇总

更新时间：2026-05-04

本文只沉淀几份 Trae sessionId 文档里反复确认的共性规则，用作后续排错的稳定口径。方案差异和冲突点不要写进本文，统一看 `trae_session_solution_comparison_20260504.md`。

## 来源文档

| 文件 | 文档时间/修改时间 | 作用 |
|---|---:|---|
| `docs/trae_session_extraction.json` | 2026-04-29 18:26:47 | 扫描 workspaceStorage，确认 session、input_history、ChatStore 的数据来源 |
| `docs/trae_session_extraction_report.md` | 2026-05-03 13:28:14 | 报告 Trae workspace 与输入历史的覆盖情况 |
| `docs/trae_session_chain.md` | 2026-05-03 15:14:30 | 说明 sessionId 链路、字段来源、接口和排障方法 |
| `docs/trae_session_refresh_rules_20260503.md` | 2026-05-03 20:57:03 | 复盘刷新污染、missing_trace、时间错位和缓存保护规则 |

## 稳定目标

Workbench 表格里每一轮会话要展示完整 Trae 复合轨迹，而不是 24 位短 session id。

页面顶部的 `当前会话` 可以保留 24 位原始 `rawSessionId`，但表格里的 `sessionId` 和 `日志轨迹` 必须是完整 composite。

稳定格式：

```text
.{userId}:{traceId}_{rawSessionId}.{messageIdA}.{chatMessageId}:Trae CN.T(YYYY/M/D HH:MM:SS)
```

字段共识：

- `userId`：Trae 账号或用户 id，例如 `3792634309254663`。
- `traceId`：ai-agent 日志里的真实 32 位 trace id。
- `rawSessionId`：Trae 当前聊天会话的 24 位 session id。
- `chatMessageId`：用户输入对应的 24 位消息 id。
- `messageIdA`：第二段 24 位消息 id，具体取值在不同方案中有差异，见对比文档。
- `Trae CN.T(...)`：该轮消息的规范时间，不能用刷新时间。

## 数据来源共识

1. workspace 数据库来自：

```text
/Users/chen/Library/Application Support/Trae CN/User/workspaceStorage/*/state.vscdb
```

2. 项目路径来自 workspace 映射，通常指向：

```text
/Users/chen/Documents/trae_projects/local_projects/xm-xxxxx
```

3. 数据库表为 `ItemTable`。

4. 必查 key：

```text
memento/icube-ai-agent-storage
icube-ai-agent-storage-input-history
ChatStore
```

5. 日志目录为：

```text
/Users/chen/Library/Application Support/Trae CN/logs
```

6. 日志优先级：

- `Modular/ai-agent*.log` 是主链路。
- `renderer.log` 只能补充 UI 展示、block、tool 或响应消息信息。
- 精准搜索 `create message` 时，服务进程不能只依赖 PATH 找 `rg`；`launchctl` 环境下要显式尝试固定 `rg` 路径。

## 抽取链路共识

1. 根据序号找到 Trae workspace db。
2. 从 `memento/icube-ai-agent-storage` 读取 `currentSessionId`。
3. 从 `input_history` 读取用户输入文本。
4. 从 `ChatStore` 或 ai-agent 日志获取每轮用户消息 id。
5. 用 `create message, chat_session_id: 当前session, message_id:` 找用户消息创建行。
6. 从同轮日志补齐真实 `traceId`。
7. 必要时从 renderer 日志补第二段消息 id 或 block 信息。
8. 输出 `sessionId/logTrace/rawSessionId/conversation`。
9. 结果按真实消息时间排序。

## 不允许

这些规则在几份文档里是一致的：

- 不能写 `missing_trace`。
- 不能写 `missing_session`。
- 不能写 `missing_chat`。
- 不能为了凑行数复用别的轮次 trace。
- 不能生成重复 composite sessionId。
- 不能把表格 `sessionId` 简化成 24 位短 id。
- 新刷新结果为空时，不能覆盖旧的有效缓存。
- `input_history` 只提供会话文本，不能反过来决定 trace 或消息 id。
- renderer 的展示时间不能覆盖用户消息创建时间。

## 空结果判定

只有同时缺少可组成 composite 的真实链路时，才允许 rows 为空。

允许空的情况：

- 找不到 workspace db。
- 找到 workspace db，但没有当前 session。
- 有 input_history，但没有 `create message`。
- 有 session 级日志，但没有用户消息 id。
- 有 tool/snapshot trace，但不能对应到用户 `create message`。

不允许误判为空的情况：

- `create message` 在旧日志里，不在最近日志尾部。
- `ChatStore` 残缺，但 ai-agent 日志还能按 session 找到 create message。
- renderer 中存在 response/tool id，只是快速扫描没覆盖到。

## 缓存保护

刷新缓存时必须满足：

- 新结果为空，旧缓存有真实 rows，则保留旧缓存。
- 新结果缺 trace，不能覆盖旧真实 composite。
- 旧缓存里已有更完整的真实 composite，刷新不能用退化 composite 覆盖。
- 旧缓存如果只是 `chatMessageId.chatMessageId` 保底 composite，刷新拿到同 trace、同 session、同 chatMessageId 的真实 response/task message id 时，必须允许升级覆盖。
- 读缓存时要清理历史 `missing_trace` 污染。

## 排错顺序

1. 查接口：

```bash
curl 'http://127.0.0.1:8090/api/trae-session-rounds?order=xm-xxxxx'
```

2. 查缓存：

```text
data/generated/trae_session_rounds/xm-xxxxx.json
```

3. 查 workspace db 是否存在。
4. 查 `input_history` 是否有文本。
5. 查 `currentSessionId`。
6. 精准搜：

```bash
rg 'create message, chat_session_id:\s*<sessionId>, message_id:' '/Users/chen/Library/Application Support/Trae CN/logs'
```

7. 如果 `full` 与 `precise` 两条路径行数不一致，优先保留行数更多的一侧。
8. 若最近日志没有，必须扩大到历史日志，不能直接判定 0。
9. 再用 message id 查 renderer/tool/block 信息。
10. 最后核验无 `missing_trace`、无短 id、无重复 composite。

## 回归样本

`xm-12232`：

- 应为 3 条。
- 第一条时间应为 `2026/5/3 17:06:37`。
- 不应出现 `missing_trace`。

`xm-20768`：

- 应为 3 条。
- 第三条应包含：

```text
.3792634309254663:15a66672f1af56c69d526b04660fd109_69f7db857f0ec5291f1c7fa8.69f84bc87f0ec5291f1c84f4.69f84bc88d6da18af1089f91:Trae CN.T(2026/5/4 10:33:28)
```

该样本说明：真实记录可能在旧日志中，不能只扫最近日志。
