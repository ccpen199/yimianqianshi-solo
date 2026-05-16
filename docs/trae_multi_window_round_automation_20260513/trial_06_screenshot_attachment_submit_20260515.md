# 试跑 06：下一轮会话携带上一轮截图附件

时间：2026-05-15

## 目标

验证多轮自动化在提交下一轮 prompt 时，不只粘贴文字，还会把上一轮浏览器验收截图作为图片附件粘进 Trae SOLO 输入框。

## 测试对象

- 序号：`may-4791`
- 操作模式：`run=false`，只粘贴不发送，避免额外生成新轮次
- 附件来源：最近一次浏览器验收生成的 `may-4791-frontend.png`

## 测试结论

测试通过。

接口返回显示：

```text
matched=true
focusRole=AXTextArea
pastedLength=707
imagePasted=true
ran=false
```

屏幕确认结果：

- Trae 窗口已聚焦到 `may-4791` 的 SOLO 输入框。
- 下一轮文字 prompt 已进入输入框。
- 输入框中出现图片附件缩略图。
- 未触发运行，符合本次只测附件粘贴的要求。

## 已修复的问题

第一次测试失败的原因是 AppleScript 在 `tell application "System Events"` 作用域内读取 `POSIX file`，导致 PNG 无法写入系统剪贴板。修复后把 PNG 读取逻辑移到脚本级 handler，再回到 System Events 执行 `Cmd+V`。

## 链路要求

后续正式提交必须按以下规则执行：

1. 先粘贴下一轮 prompt。
2. 如果存在上一轮截图，必须粘贴截图附件。
3. 只有 `imagePasted=true` 时，带截图的提交才算成功。
4. 如果截图附件粘贴失败，本轮进入 blocked，不能继续当作已提交。
5. 事件日志必须记录截图路径、是否包含截图、是否粘贴成功。

