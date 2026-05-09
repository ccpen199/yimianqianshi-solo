# Trae 会话刷新规则复盘

更新时间：2026-05-03

本文记录 `xm-12232` 到 `xm-12244` 这轮排错后确定下来的 Trae 会话刷新规则。以后再出现 `missing_trace`、sessionId 缩短、时间错位、刷新后只剩一条、前端显示空行时，先按本文判断，不要重新发明提取逻辑。

## 结论

当前最终规则应以最早确认正确的逻辑为准：

1. 以 Trae `create message` 用户消息创建行为主链路。
2. sessionId 复合结构固定为：

```text
.{userId}:{traceId}_{rawSessionId}.{userMessageId}.{userMessageId}:Trae CN.T(YYYY/M/D HH:MM:SS)
```

3. 时间取用户消息创建时间，也就是 `create message` 对应时间。
4. 后续 tool、plan、block、renderer 日志只能补 `traceId`，不能覆盖用户消息的 `messageId` 和时间。
5. 没有真实 32 位 `trace_id` 的轮次不能写入表格行。
6. 不能生成 `missing_trace`、`missing_session`、`missing_chat`。
7. 不能复用别的轮次 trace，也不能生成重复 composite sessionId。
8. 新刷新结果为空时，不能覆盖旧的有效缓存。
9. `input_history` 只提供会话文本；它可能重复、可能残缺，不能反过来决定 trace 或 messageId。

如果规则之间冲突，按上面的顺序取舍。尤其是第 1-4 条优先级最高。

## 三轮逻辑对比

### 第一轮：不要丢有效轮次

确认的问题：

- 按 `input_history` 和有效 messageId 硬配，会在重复输入时丢掉有效轮次。
- 按媒体时间或最近记录重新映射，会导致会话文本和 sessionId 错配。
- `ChatStore` 可能不完整，不能只依赖 `ChatStore`。
- 直接搜 `rg sessionId -m 200` 会被大量 tool/renderer 日志截断，导致只剩 1 条。

最终保留逻辑：

- 直接搜索 `create message, chat_session_id: 当前session`。
- 用用户消息创建行重建轮次列表。
- 输入历史去掉连续重复无媒体输入后，只按时间顺序对齐。
- 不用媒体时间重排。

### 第二轮：时间和结构必须来自 create message

确认的问题：

- `17:06:42` 是后续 tool/block 时间，不是用户消息创建时间。
- 补 trace 时如果优先吃到 tool 行，会把 taskMessageId 和时间都取错。

最终保留逻辑：

- 优先 `create message`。
- `sessionId` 结构用 `trace_sessionId.userMessageId.userMessageId`。
- 时间用用户消息创建时间。
- 后续 tool/task 行只补 trace，不覆盖时间。
- 不生成 `missing_trace`。
- 不复用别的轮次 trace。

### 第三轮：不污染缓存

确认的问题：

- 为了凑行数写 `missing_trace` 是错误的。
- 为了凑行数复用别的轮次 trace 也是错误的。
- Trae 的 `input_history` 里可能天然有重复文本。

最终保留逻辑：

- 没有真实 32 位 `trace_id` 的行跳过。
- 重复 composite 跳过。
- 刷新时如果新结果缺 trace 或为空，不覆盖旧的真实缓存。
- 读缓存时清理旧 `missing_trace` 污染。

这轮逻辑不应推翻第一、第二轮。也就是说，不能因为“跳过无 trace”而把本来可从 `create message` 恢复的有效轮次丢掉。

## 当前程序对照

文件：`solo-coder/workbench/serve_workbench.py`

已经符合的部分：

- `normalize_trae_session_rows()` 会清理包含 `missing_trace` 的旧缓存行。
- `refresh_trae_session_cache()` 在新结果为空且旧缓存有有效 rows 时，会返回旧缓存并标记 `refreshSkippedEmpty`，避免空刷新覆盖。
- `_rg_session_create_message_ids()` 已经改为直接搜索 `create message, chat_session_id: 当前session`，避免普通 `rg sessionId` 被 tool/renderer 日志截断。
- 生成 rows 时，缺少真实 32 位 `traceId` 会 `continue`，不会再写 `missing_trace`。
- `used_composites` 会跳过重复 composite。
- `effective_input_items` 会跳过连续重复且无媒体的输入，降低重复 input_history 对对齐的影响。

仍不完全符合的风险点：

- 复合 ID 生成处仍使用 `taskMessageId`：

```python
task_message_id = meta.get('taskMessageId') or fallback_chat_message_id
time_text = (
  _object_id_time_text(task_message_id)
  or meta.get('time')
  or ...
)
composite = f".{trace_user}:{trace_id}_{fallback_session_id}.{task_message_id}.{fallback_chat_message_id}:{app_name}.T({time_text})"
```

这与“`userMessageId.userMessageId` + create message 时间”的前置规则存在冲突。如果 `taskMessageId` 被后续 tool/block 日志改成响应消息或任务消息，程序仍可能生成：

```text
trace_sessionId.taskMessageId.userMessageId
```

并且时间可能来自 `taskMessageId` 的 ObjectId 内嵌时间，而不是用户 `create message` 时间。

因此，当前程序是“多数保护规则已具备，但复合 ID 生成优先级仍有遗留风险”。后续修复应优先把 composite 生成固定为：

```python
user_message_id = chat_message_id
time_text = meta.get('time') or _object_id_time_text(user_message_id)
composite = f".{trace_user}:{trace_id}_{session_id}.{user_message_id}.{user_message_id}:{app_name}.T({time_text})"
```

并确保 tool/block 只补 `traceId`，不改 `user_message_id` 和 `time_text`。

## `xm-12233` 到 `xm-12235` 为什么为空

这几个项目不是前端链路错误。

核查结果：

| 序号 | 映射名称 | workspace db | input_history | ChatStore messageId | Trae 日志 trace |
|---|---|---:|---:|---:|---:|
| `xm-12233` | 人力资源管理 | 有 | 4 条 | 有 24 位 id | 无 |
| `xm-12234` | 任务管理系统 | 有 | 2 条 | 有 24 位 id | 无 |
| `xm-12235` | 企业网站系统 | 有 | 3 条 | 有 24 位 id | 无 |

它们缺少可组成规范 sessionId 的真实 `create message + trace_id` 链路。因此按当前规则不能写行：

- 不能写 `missing_trace`。
- 不能只显示 24 位短 session id。
- 不能伪造 32 位 trace。

所以前端显示“暂无会话输入记录”是缓存 rows 为空的结果，不是渲染失败。

## 排错顺序

以后遇到某个序号显示异常，按这个顺序查：

1. 查接口：

```bash
python3 - <<'PY'
import json, urllib.request
order='xm-12239'
with urllib.request.urlopen(f'http://127.0.0.1:8090/api/trae-session-rounds?order={order}') as r:
    p=json.load(r)
rows=p.get('rows') or []
print(order, 'rows=', len(rows), 'session=', p.get('sessionId'), 'cached=', p.get('cached'))
for row in rows:
    print(row.get('sessionId'), '|', (row.get('conversation') or '')[:60])
PY
```

2. 查缓存是否被污染：

```bash
python3 - <<'PY'
import json
order='xm-12239'
p=json.load(open(f'data/generated/trae_session_rounds/{order}.json', encoding='utf-8'))
ids=[r.get('sessionId') or '' for r in p.get('rows') or []]
print('rows', len(ids), 'missing_trace', sum('missing_trace' in x for x in ids), 'dups', len(ids)-len(set(ids)))
PY
```

3. 查 workspace db 是否有输入历史。
4. 查 Trae 日志是否有 `create message, chat_session_id: 当前session`。
5. 查对应 messageId 是否能找到真实 32 位 `trace_id`。
6. 如果没有真实 trace，保持 rows 为空或保留旧有效缓存，不写假数据。

## 回归样本

`xm-12232` 是当前核心回归样本。正确结果：

- `rows=3`
- 无 `missing_trace`
- 无重复 sessionId
- 第一条时间为 `2026/5/3 17:06:37`
- 第一条结构为：

```text
.3792634309254663:fe9e11cbc5f4c07ee92dcfcf55f7a1cb_69f69ba685d83e4a45efa594.69f7566d4b0ba7a39131f3e7.69f7566d4b0ba7a39131f3e7:Trae CN.T(2026/5/3 17:06:37)
```

`xm-12239` 是前端读取链路样本。正确结果：

- 后端接口 `rows=3`
- 前端打开 `xm-12239` 应显示 3 条
- 如果前端截图显示 `xm-12233 | 轮次: 0`，说明当前打开的不是 `xm-12239`

## 后续修复建议

只改一处核心规则，避免再引入映射错位：

- composite 生成时禁用 `taskMessageId` 作为第二段。
- 第二段和第三段都使用用户 `chat_message_id`。
- 时间优先 `meta['time']`，也就是 `create message` 时间。
- tool/block/renderer 日志只允许补 `traceId`，不得覆盖 `sessionId`、`chatMessageId`、`time`。

修改后必须重新验证：

```bash
python3 -m py_compile solo-coder/workbench/serve_workbench.py
node --check solo-coder/workbench/app.js
python3 scripts/check_trae_session_rounds.py
```
