# 飞书多维表格写入测试记录

记录时间：2026-05-05

## 背景

本次测试的目标页面是：

`https://my.feishu.cn/app/FDM7bz1Oma8AyEs39gJcDxMin0e?pageId=pgeAyIHH2ZzxpA8H`

目标是在飞书多维表格页面中验证：Codex 是否能在已登录浏览器里填写表格信息。

最终确认：可以写入已有字段，尤其是通过选中表格列后批量粘贴数值。不能依赖普通 DOM 方式读取或修改表格单元格，因为飞书表格主体使用 canvas 渲染。

## 成功路径

可行方式不是 headless 浏览器，也不是重新登录，而是复用本机已经登录的 Google Chrome。

核心技术：

- macOS AppleScript：控制 Google Chrome，定位目标飞书标签页。
- System Events：模拟键盘粘贴。
- 系统剪贴板：把多行数据写入剪贴板，再通过 `Cmd+V` 粘贴到飞书表格。
- macOS `screencapture`：截图确认页面状态。
- Chrome 页面 JavaScript：读取当前 URL、标题、页面文本、toast 提示和 canvas 布局信息。

关键点是必须先锁定目标飞书 tab，避免输入落到本地控制台或其他网页。

## 标签页定位

使用 AppleScript 遍历 Chrome 所有窗口和标签页，找到 URL 包含目标飞书 app token 的标签页：

```applescript
tell application "Google Chrome"
  activate
  set foundTab to false
  repeat with w in windows
    repeat with i from 1 to count of tabs of w
      if (URL of tab i of w) contains "my.feishu.cn/app/FDM7bz1Oma8AyEs39gJcDxMin0e" then
        set active tab index of w to i
        set index of w to 1
        set foundTab to true
        exit repeat
      end if
    end repeat
    if foundTab then exit repeat
  end repeat
end tell
```

这个步骤非常重要。之前出现误写或读取到 `localhost:3000`，就是因为前台活动标签页不是飞书页面。

## 页面读取方式

可以用 AppleScript 在 Chrome 当前 tab 执行少量 JavaScript：

```applescript
tell application "Google Chrome"
  set js to "JSON.stringify({url:location.href,title:document.title,text:document.body.innerText.slice(0,1200)})"
  return execute active tab of front window javascript js
end tell
```

这种方式可以确认：

- 当前 URL 是否为目标飞书页面。
- 页面标题是否为 `经营分析 - 飞书云文档`。
- 页面是否出现 `粘贴成功` 等提示。

但不能稳定读取表格里的每个单元格值，因为表格主体是 canvas。

## 为什么不能普通 DOM 读写单元格

检查 `document.elementsFromPoint()` 时，表格数据区域命中的主要元素是：

```text
CANVAS
DIV.faster-view
DIV.faster-dom-wrapper
DIV.bitable-table-view--content
```

这说明飞书多维表格把单元格绘制在 canvas 上，单元格文字不是普通 HTML 节点。因此这些方法不可靠：

- `querySelectorAll("td")`
- 读取 `innerText` 获取所有单元格值
- 直接改 DOM 节点文本

可读取到的是工具栏、筛选器、toast 文案等普通页面结构；表格主体需要按用户操作方式处理。

## 写入方式

对于数值列，最稳定方式是：

1. 在飞书页面中选中目标列或目标列第一个单元格。
2. 将多行数据写入系统剪贴板。
3. 通过 `Cmd+V` 粘贴。
4. 等待飞书提示 `粘贴成功`。
5. 截图确认可视结果。

示例：

```applescript
set valuesText to "10000
20000
5000
15000
18000
60000
20000
30000
10000"
set the clipboard to valuesText

tell application "Google Chrome" to activate
delay 0.4
tell application "System Events"
  keystroke "v" using command down
end tell
```

飞书返回 `粘贴成功` 后，说明写入动作被页面接受。

## 截图确认

用 `screencapture` 保存当前屏幕：

```bash
screencapture -x /tmp/feishu-after-paste.png
```

截图用于确认：

- 当前在目标飞书页面，而不是本地控制台。
- 选中的列是否是 `项目总金额（元）`。
- 页面是否显示 `粘贴成功`。
- 表格可视值是否符合预期。

## 踩坑记录

1. 不要使用 headless 浏览器打开飞书页面。

   飞书登录态、扫码、钥匙串 cookie 导入都会增加不确定性。本项目已有的“领取题目”功能是通过 AppleScript 控制已登录 Chrome，因此这里也应使用同样方式。

2. 不要只依赖“当前活动标签页”。

   用户可能在本地控制台、其他飞书页面和目标飞书页面之间切换。每次写入前必须重新遍历 Chrome 标签页并锁定目标 URL。

3. 不要把 canvas 表格当成 HTML 表格。

   单元格内容无法通过普通 DOM 稳定读取。应该使用剪贴板和键盘事件，按用户真实操作路径写入。

4. 粘贴前必须确认选区。

   如果当前活动选区不是目标列顶部，粘贴会落到错误分组或错误行。写入前最好先截图确认选区。

5. 测试记录应与业务记录隔离。

   本次测试创建过 `Codex测试-可填写...` 记录，后续写入应优先使用测试记录或明确指定目标列，避免误改业务数据。

## 推荐的后续封装

可以把这个流程封装成脚本：

1. 输入飞书 URL、目标 app token、列名、待粘贴多行文本。
2. AppleScript 锁定目标 Chrome tab。
3. 截图给操作者确认选区。
4. 写入剪贴板并执行 `Cmd+V`。
5. 读取页面 toast，确认是否包含 `粘贴成功`。
6. 再截图保存证据。

对于更强的自动化，应优先研究飞书内部接口或官方开放平台 API；但在没有稳定 API token 和字段 ID 的情况下，当前最实用的方式是 AppleScript + 剪贴板 + 人工可视选区确认。
