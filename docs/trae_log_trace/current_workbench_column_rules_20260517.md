# Workbench 会话列当前唯一口径 20260517

本文是当前代码口径。旧文档如果与本文冲突，以本文为准；旧文档只保留历史排障背景，不再作为实现依据。

## 列优先级

1. `conversation` 会话列先确定。它只来自该轮有效用户输入文本。
2. `sessionId` 列挂到已经确定好的会话行上。它是定位串，不反向决定会话文本。
3. `logTrace` 日志轨迹列只放执行过程正文。它不能用 `sessionId`、`logTraceId` 或复合 Session 串兜底。
4. `screenshots` 截图列最后补齐，只来自该轮输入附件，不能创建、删除或重排会话行。
5. `dissatisfactionReason` 不满意列只写回不满意相关字段，不能改会话、Session、日志轨迹或截图。

## Session 复合串

当前格式固定为：

```text
.{userId}:{traceId}_{rawSessionId}.{userMessageId}.{taskMessageId}:Trae CN.T(createMessageTime)
```

字段规则：

- `userMessageId` 来自同轮 ai-agent `create message` 的用户消息 id。
- `taskMessageId` 优先取同轮真实 response/task 消息 id；找不到时才退回 `userMessageId`，并标记 `sessionIdQuality=fallback_user_message`。
- `createMessageTime` 优先取同轮 `create message` 日志时间；没有时才退回 `userMessageId` ObjectId 时间，再退回 `taskMessageId` ObjectId 时间。
- renderer、tool、snapshot、刷新时间不能覆盖 `createMessageTime`。
- 不能写 `missing_trace`、`missing_session`、`missing_chat`，也不能复用其他轮次 trace。

代码中的对应字段：

- `sessionId`：给表格复制的完整复合串。
- `logTraceId` / `sessionComposite`：同一个复合串的内部备份字段。
- `rawSessionId`：24 位原始 Trae 会话 id。
- `sessionIdQuality`：`real_response_task` 或 `fallback_user_message`。

实现命名兼容：

- `serve_workbench.py` 里历史内部键 `chatMessageId` 等价于本文的 `userMessageId`，表示用户输入对应的 create-message id。
- `taskMessageId` 表示同轮 response/task 消息 id。生成 composite 时顺序必须是 `{chatMessageId}.{taskMessageId}`，也就是对外文档的 `{userMessageId}.{taskMessageId}`。
- 旧文档里的 `responseMessageId` / `responseOrTaskMessageId` 只能作为历史别名理解，不再作为当前列格式命名。

## 会话行保留规则

会话行是否进入列表，看同轮硬证据：

- 必须有有效用户输入。
- 必须能绑定同轮 `create message + traceId`。
- `input_history` 只提供文本和截图候选，不能单独生成正式会话行。
- `input_history` 中的附件/截图时间可以作为弱对齐线索，帮助把已存在的用户输入行匹配到同轮 create-message；但它不能单独创建会话行，不能覆盖 `create message` 的时间，也不能让没有 `create message + traceId` 的输入进入列表。
- 撤回、未发送、自动化状态残留、跨序号端口残留，没有同轮 `create message + traceId` 时不进入列表。
- `reportFrontResponse status=Failed/code=3003`、`TASK Failed/Cancelled` 是执行失败诊断，不删除会话行。
- 用户反馈文本里包含 `ABORTED`、黑屏、报错、`2 条日志` 等内容，本身不是删除依据。

## 刷新与批量读取

- 单项 `↻` 手动刷新必须调用 `/api/refresh-trae-session-rounds`，并发送 `force=true, discover=true`，触发 deep scan 从 Trae workspace 和历史日志重拉。
- deep scan 结果写回同一个序号缓存文件。它不是追加文件，而是重建 rows 后覆盖缓存；新结果为空或行数更少时保留已有有效缓存。
- 如果同一序号队列里有已完成旧任务，新的 `force=true` 请求不能先返回旧任务结果；必须清掉旧 future，并按本次请求创建新刷新任务。
- 轮询请求使用 `force=false`，只领取正在运行或刚完成的结果，不创建新任务。
- `查看批量会话` 只读取现有缓存，不触发刷新。
- `刷新未达标项目` 按每个序号的有效轮次数和 `最低记录数` 比较，只刷新未达标序号，并使用同样的 `force=true, discover=true` deep scan 语义。

## 日志轨迹列

`logTrace` 是执行轨迹正文，不是 Session composite。

允许来源：

- 官方复制或可确认的 Trae 执行正文。
- 项目文件中保存的真实日志轨迹正文。
- 与同轮 trace 精确绑定的本地执行正文。

禁止来源：

- `sessionId` / `logTraceId` / `sessionComposite` 复合串。
- `trae-workspace-state-raw` 中无法精确证明同轮的残留文本。
- 只按文本相似度或 raw SQLite 残留硬挂的日志。

找不到真实正文时，前端显示“未找到真实日志轨迹文件/内容”，不能拿 Session 串顶替。

## 不满意列模型

`/api/annotate-dissatisfaction` 只允许更新：

```text
dissatisfactionReason
annotationHash
annotationVersion
annotationUpdatedAt
annotationSource
```

当前代码支持两类模型入口：

- `deepseek-v4-pro`：需要 `DEEPSEEK_API_KEY`。
- `codex-cli-pinai`：走本机 Codex CLI 默认 pinAI provider；不修改 `~/.codex/config.toml`，不需要 DeepSeek key。

生成格式固定为：

```text
产物不满意：...。过程不满意：...。
```

模型输入包含 `mainRequirement = rows[0].conversation`，防止后续轮次脱离第一轮主需求。
