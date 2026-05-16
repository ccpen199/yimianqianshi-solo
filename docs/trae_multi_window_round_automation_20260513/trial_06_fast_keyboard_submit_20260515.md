# 试跑 06：快捷键快速提交与轮次输入队列校准

时间：2026-05-15

## 本次目标

验证不依赖坐标点击的 Trae 提交方式，并校准下一步真正要做的业务闭环。

结论是：窗口操作链路已经能跑通，但提交内容必须从“浏览器检查草稿”升级为“批量会话列表驱动的轮次输入队列”。

## 快捷键提交结果

已确认的稳定动作：

```text
1. 根据窗口标题匹配 may-4777。
2. 聚焦目标 Trae/Electron 窗口。
3. 发送 Cmd+U，切到 SOLO 输入框。
4. 读取当前焦点，确认 role=AXTextArea。
5. 写入剪贴板并 Cmd+V。
6. 读取输入框 value 长度，确认 pastedLength > 0。
7. 只有确认粘贴成功后才按 Enter 运行。
```

本次 `may-4777` 返回：

```text
focusRole=AXTextArea
pastedLength=521
ran=true
耗时约 1.9 秒
```

这说明快捷键链路比坐标点击更稳定。后续 UI Operator 应继续使用“窗口标题匹配 + Cmd+U + AXTextArea 校验 + 粘贴长度校验 + Enter”的方案。

## 已新增 Workbench 能力

新增按钮：

```text
Trae 多轮自动化 -> 快速粘贴运行
```

新增 API：

```text
POST /api/trae-round-automation-fast-submit
```

行为：

```text
读取已有 submit_queue.json
-> 不重新探测
-> 不重新生成草稿
-> 不重建队列
-> 不截图
-> 写剪贴板
-> 聚焦窗口
-> Cmd+U
-> 校验 AXTextArea
-> 粘贴
-> 校验 pastedLength
-> Enter
```

如果提交队列不存在，快速提交直接报错，要求先生成队列，避免隐藏慢链路。

## 关键校准

当前 `submit_queue.json` 来自：

```text
运行态探测
浏览器检查
下一轮反馈草稿
```

这只解决“项目当前页面有什么问题”，还不能完整替代人工多轮输入。

真实的下一轮输入必须来自批量会话列表：

```text
上一轮 conversation
上一轮 dissatisfactionReason
上一轮 logTrace
上一轮结果截图
当前前端/API 复验结果
```

因此下一步应新增“轮次输入队列”：

```text
docs/data/generated/automation_probe/<group>/round_prompt_queue.json
```

已新增脚本和 API：

```text
solo-coder/workbench/automation/trae_round_prompt_queue.py
POST /api/trae-round-automation-round-prompt-queue
```

Workbench 新增按钮：

```text
Trae 多轮自动化 -> 生成轮次输入
```

建议结构：

```json
{
  "group": "may-4776-may-4779-第13组",
  "targetRounds": 5,
  "queue": [
    {
      "order": "may-xxxx",
      "currentRoundCount": 4,
      "nextRoundIndex": 5,
      "sourceRowIndex": 3,
      "sessionId": "...",
      "conversation": "...",
      "dissatisfactionReason": "产物不满意：...。过程不满意：...。",
      "logTraceDigest": "...",
      "hasScreenshots": true,
      "prompt": "这是 may-xxxx 的第 5 轮。请先核对上一轮问题是否已解决..."
    }
  ],
  "skipped": [
    {
      "order": "may-yyyy",
      "reason": "已达到 5 轮"
    }
  ]
}
```

## 目标轮次统一

已将前端目标轮次抽成统一概念：

```text
DEFAULT_TARGET_ROUNDS = 5
```

需要共用这个数字的模块：

```text
批量会话弹窗最低记录数
首页自动检测目标轮次
多轮自动化目标轮次
批量复制每个序号最多复制前 N 轮
自动化调度每个序号最多输入 N 轮
```

## 下一步

下一步不再继续优化坐标或截图确认，而是落地“轮次输入队列”：

```text
读取 docs/data/generated/trae_session_rounds/<order>.json
-> 折叠重复/失败轮次
-> 判断当前有效轮次是否小于目标轮次
-> 读取最后有效轮的 conversation / dissatisfactionReason / logTrace / screenshots
-> 生成第 N+1 轮 prompt
-> 快速提交接口改为优先读取 round_prompt_queue.json
```

完成后，多轮自动化才真正替代人工在批量会话列表里逐轮判断、复制、粘贴的工作。

## 首次队列验证

用 `xxxx` 组验证目标轮次判断：

```bash
python3 solo-coder/workbench/automation/trae_round_prompt_queue.py \
  --group xxxx \
  --target-rounds 5
```

结果：

```text
queued=0
skipped=5
原因：may-979 到 may-983 均已达到 5 轮或超过 5 轮
```

把目标轮次临时改成 6 时，队列会生成 `may-979/may-980/may-981/may-982` 的第 6 轮 prompt，`may-983` 因已有 6 轮跳过。验证后已把 `xxxx` 队列重新生成回目标 5 轮，避免误提交第 6 轮。

## 首轮规则修正

`may-33333`、`may-44444` 用来验证空项目首轮逻辑：

```text
项目目录存在
Trae 窗口可枚举/可恢复
workspace DB 可定位
会话行为空
数据列表中没有对应业务 prompt
```

修正后的行为：

```text
effectiveRoundCount=0
nextRoundIndex=1
status=missing_first_prompt
```

这两个序号不会再因为“没有上一轮”而触发长时间深扫，也不会被误判为异常重试。首轮只有两种合法结果：

```text
1. 找到数据列表原始业务 prompt：直接生成第 1 轮输入队列。
2. 找不到数据列表原始业务 prompt：只记录 nextRoundIndex=1 并跳过提交。
```

重复/撤回/错误重试的会话折叠规则也已明确：相同 conversation 只算一个业务轮次，保留最后一个有最新 session/logTrace 的行作为该轮事实源。

## 双序号 5 轮循环实测

测试对象：

```text
may-33333
may-44444
```

调度方式调整为“提交后立即切换下一个序号”：

```text
1. 每个序号维护当前已确认轮次。
2. 一旦某个序号提交成功，不原地等待模型回复。
3. 立即切到下一个序号，检查它是否能提交下一轮。
4. 下一次轮到同一序号时，先查 Trae Modular 日志。
5. 只有确认上一轮助手回复已落盘，才提交下一轮。
6. 如果只看到提交动作但没有输入日志/助手回复，不计入完成轮次。
```

实测结果：

```text
may-44444：完成 5/5 轮。
may-33333：完成 5/5 轮。
```

关键日志证据：

```text
may-44444 第 2 轮：
输入日志包含“这是 may-44444 的第 2 轮自动化链路烟测”
回复日志包含“已收到 may-44444 第 2 轮自动化烟测。”

may-33333 第 5 轮：
输入日志包含“这是 may-33333 的第 5 轮自动化链路烟测”
回复日志包含“已收到 may-33333 第 5 轮自动化烟测。”
```

本次暴露出一个重要判断：

```text
AXTextArea + pastedLength + Enter 只能证明动作层提交成功；
必须继续检查 Trae 日志里的 user_input 和 assistant reply，才能证明该轮真正落盘完成。
```

因此正式调度器不能把“按键已发送”当作轮次完成，只能当作 submitted/pending 状态。

## 快提交稳定性修正

本次把 `POST /api/trae-round-automation-fast-submit` 的底层执行方式改为：

```text
1. 不再依赖外部 pbcopy 先写剪贴板。
2. 在同一个 AppleScript 内执行 `set the clipboard to promptText`。
3. 匹配窗口后记录 matchedProcess，避免后续读取焦点时拿错进程。
4. Cmd+U 后最多循环 5 次读取 AXFocusedUIElement。
5. 只有 role 为 AXTextArea/AXTextField 且 pastedLength > 20 时才 Enter。
6. 返回里增加 process、clipLength、queueSource，便于判断失败原因。
```

这次修正来自实测问题：

```text
直接 shell pbcopy 在当前执行环境里可能写不进系统剪贴板；
旧版 fast-submit 偶发匹配到窗口但焦点为空；
提交动作成功后也可能没有形成 Trae 任务，必须用日志确认。
```

## 调度器落地要求

正式多轮自动化需要新增一个循环调度层，而不是只点击“快速粘贴运行”单项按钮：

```text
ready：上一轮已确认完成，可以提交下一轮
submitted：本轮动作层已提交，等待 Trae 日志出现 user_input
running：已出现 user_input，等待 assistant reply
completed：assistant reply 已确认，轮次 +1
blocked：窗口不可见、焦点不是输入框、粘贴长度不足、日志超时或任务失败
```

调度循环应按序号轮转：

```text
for order in selectedOrders:
  if order.completedRounds >= targetRounds:
    continue
  if order.state in submitted/running:
    check logs only
    continue
  if previous round completed:
    submit next round
    immediately continue to next order
```

日志读取不能每次全量 `rg` 全目录。实测到第 5 轮时，全量扫描开始变慢。生产版应维护每个日志文件的 offset 或至少只扫描最新 `Modular/ai-agent_*_stdout.log` 的增量内容。

## 2026-05-15 补充：完成判断改为快速网页闭环

固定等待 10 秒或 20 秒会拖慢多项目轮转，不作为主链路。新的判断方式：

```text
某序号第 N 轮已提交
-> 立即切换下一个序号
-> 下一次轮到该序号
-> 先做快速网页访问和截图
-> URL 可打开且截图生成成功
-> 记为 web_verified
-> 允许调度器准备第 N+1 轮
```

注意：

- `web_verified` 是调度状态，不是 Trae 会话真实轮次。
- 真实轮次仍由 Trae 缓存/DB 校准，防止会话列被伪造。
- 如果第 N+1 轮粘贴或运行失败，下一次检测仍会看到真实轮次没有增加，调度器会回到当前轮次继续处理。
- 快速网页闭环会把上一轮提交 prompt、网页 URL、截图路径和报告路径写入 `automation_round_state.json`，仅用于下一轮 prompt 的过渡上下文。
