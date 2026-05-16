# 试跑 02：重置后重新检修与下一步规划

时间：2026-05-14

## 本次范围

这一轮是在 `may-4768` 之后运行痕迹已经重置的前提下重新检修。只做安全的非 UI 自动化：

- 读取批量组配置。
- 扫描 Trae 可见窗口标题。
- 检查项目目录、依赖、端口、HTTP 可达性。
- 用浏览器打开已确认可达的本地前端并截图。
- 生成下一轮反馈草稿。
- 修正探测脚本的误判逻辑。

未执行：

- 未自动点击 Trae 窗口。
- 未自动提交下一轮 prompt。
- 未启动或关闭业务项目进程。
- 未杀死任何全局 Node/Python/Vite/Trae 进程。

## 本次改动

### 1. 端口探测补充 IPv6 loopback

`may-4776` 暴露出一个关键情况：前端 Vite 监听在 `[::1]:24776`，不是 `127.0.0.1:24776`。

旧判断会出现矛盾：

```text
lsof 看到 24776 正在监听
浏览器访问 http://127.0.0.1:24776/ 失败
```

真实原因是绑定地址不同：

```text
node ... TCP [::1]:24776 (LISTEN)
```

因此探测脚本已调整为：

```text
每个端口同时探测：
- http://127.0.0.1:<port>/
- http://[::1]:<port>/
```

并在 `probe.json` 里记录端口监听的 `command/pid/protocol/name`，方便判断端口归属和绑定地址。

修改文件：

```text
solo-coder/workbench/automation/trae_round_probe.py
```

### 2. 下一轮草稿不再把浏览器错误页当作业务页面

旧草稿会把 Chrome 的“无法访问此网站 / ERR_CONNECTION_REFUSED”写进页面正文证据，容易误导下一轮反馈。

现在已过滤这些浏览器错误页：

```text
无法访问此网站
ERR_CONNECTION_REFUSED
ERR_EMPTY_RESPONSE
ERR_CONNECTION_RESET
This site can't be reached
```

如果探测到真实可访问的 IPv6 地址，会优先使用真实可达 URL 生成草稿。

修改文件：

```text
solo-coder/workbench/automation/trae_next_prompt_draft.py
```

## 执行命令

```bash
python3 solo-coder/workbench/automation/trae_round_probe.py \
  --group 'may-4768-may-4771-第12组'

python3 solo-coder/workbench/automation/trae_round_probe.py \
  --group 'may-4776-may-4779-第13组'

node solo-coder/workbench/automation/trae_browser_runtime_check.js \
  --order may-4776 \
  --url 'http://[::1]:24776/' \
  --out-dir 'docs/data/generated/automation_probe/may-4776-may-4779-第13组' \
  --wait-ms 4500

python3 solo-coder/workbench/automation/trae_next_prompt_draft.py \
  --group 'may-4768-may-4771-第12组'

python3 solo-coder/workbench/automation/trae_next_prompt_draft.py \
  --group 'may-4776-may-4779-第13组'
```

## 产物位置

```text
docs/data/generated/automation_probe/may-4768-may-4771-第12组/probe.json
docs/data/generated/automation_probe/may-4768-may-4771-第12组/next_prompt_drafts.json
docs/data/generated/automation_probe/may-4768-may-4771-第12组/next_prompt_drafts.md

docs/data/generated/automation_probe/may-4776-may-4779-第13组/probe.json
docs/data/generated/automation_probe/may-4776-may-4779-第13组/may-4776-browser-report.json
docs/data/generated/automation_probe/may-4776-may-4779-第13组/may-4776-frontend.png
docs/data/generated/automation_probe/may-4776-may-4779-第13组/next_prompt_drafts.json
docs/data/generated/automation_probe/may-4776-may-4779-第13组/next_prompt_drafts.md
```

## 当前状态

### may-4768-may-4771-第12组

当前可见 Trae 窗口里没有这一组：

```text
may-4768: 无 Trae 窗口，47681/47682 未监听
may-4769: 无 Trae 窗口，47691/47692 未监听，前端 node_modules 缺失
may-4770: 无 Trae 窗口，47701/47702 未监听
may-4771: 无 Trae 窗口，47711/47712 未监听，前端 node_modules 缺失
```

判断：

```text
这一组目前不是可继续自动推进的窗口组。
如果要推进它，需要先打开对应 Trae 项目窗口，或先进入“安全启动项目运行态”阶段。
```

### may-4776-may-4779-第13组

当前可见 Trae 窗口可以匹配到这一组：

```text
Home.jsx — may-4776
Profile.jsx — may-4777
test-db.js — may-4778
may-4779
```

当前运行态：

```text
may-4776:
  前端 24776 正在监听 [::1]:24776
  后端 14776 正在监听 *:14776
  http://[::1]:24776/ 返回 200
  http://127.0.0.1:14776/health 返回 200
  浏览器截图成功

may-4777:
  项目目录存在
  前端 47772 / 后端 47771 均未监听

may-4778:
  项目目录存在
  前端 47782 / 后端 47781 均未监听

may-4779:
  项目目录存在
  未识别到标准 frontend/package.json 和 backend/package.json
  未识别到可探测端口
```

## may-4776 浏览器验收结果

访问地址：

```text
http://[::1]:24776/
```

结果：

```text
HTTP 200
页面标题：映客 - 直播社交平台
页面正文包含：首页、推荐、附近、热门、才艺、游戏、聊天、主播列表、底部导航
后端健康检查：http://127.0.0.1:14776/health 返回 200
```

问题：

```text
favicon.ico 返回 404
```

判断：

```text
may-4776 已经具备进入业务验收的基础运行态。
下一步更适合做页面业务检查，而不是再把它归类为“启动失败”。
```

## 关键结论

### 1. 本地地址不能只写 127.0.0.1

部分 Vite 进程可能只监听 IPv6 loopback `[::1]`。后续所有自动化探测必须同时判断：

```text
127.0.0.1
[::1]
localhost
```

页面展示和下一轮 prompt 里，应使用实际可访问的 URL。

### 2. 当前最大阻塞不是 Trae 点击，而是项目运行态不齐

第 13 组有窗口，但只有 `may-4776` 可访问。`may-4777`、`may-4778`、`may-4779` 在进入 Trae UI Operator 前，应先补一个“安全运行态启动器”。

### 3. UI Operator 仍然必须串行

窗口都能看到不等于可以并行点击。Trae 输入、剪贴板、前台焦点、虚拟桌面仍然是单通道资源。下一步仍应坚持：

```text
非 UI 探测并行
Trae GUI 操作串行
```

## 下一步规划

### 第一步：补安全运行态启动器

目标：让 `may-4777`、`may-4778`、`may-4779` 先具备可浏览器验收的前后端运行态。

启动器规则：

```text
1. 只处理当前项目目录。
2. 只检查当前项目配置端口。
3. 禁止 killall node / pkill node / 批量杀全局端口。
4. 端口占用时必须确认进程 cwd 属于当前项目，不能确认就换本项目备用端口。
5. 启动命令显式传入 PORT / FRONTEND_PORT / BACKEND_PORT，避免继承外部 PORT。
6. 启动日志写入 docs/data/generated/automation_probe/<group>/runtime_logs/<order>-*.log。
7. 启动后同时探测 127.0.0.1 和 [::1]，选择实际可访问地址。
```

验收输出：

```text
runtime_start_report.json
每个项目的 frontendUrl/backendHealthUrl
每个项目的日志路径
失败项目的具体失败原因
```

### 第二步：批量浏览器验收

对启动成功的项目执行：

```text
打开前端 URL
等待页面渲染
截图
收集 console
收集 request failed
收集 4xx/5xx response
输出 browser-report.json
```

此阶段仍不点击 Trae。

### 第三步：生成下一轮反馈草稿

草稿必须引用：

```text
项目目录
真实访问 URL
后端健康检查
截图结果
console/network 问题
页面正文或关键 UI 状态
```

避免泛化句式：

```text
功能不完整
缺少验证
上一轮没有闭环
```

要写成可执行反馈：

```text
当前 http://[::1]:24776/ 能打开，但 xxx 页面 yyy 模块没有显示，
后端 health 正常，浏览器控制台出现 zzz。
请优先修复某文件/某接口/某页面状态，并重新用当前项目端口验收。
```

### 第四步：再接 Trae 串行 UI Operator

只有在前三步稳定后，才进入自动点击 Trae：

```text
聚焦目标窗口
粘贴下一轮 prompt
点击运行/确认
等待完成
刷新 session/log trace/screenshot
折叠重复重试轮次，保留最后有效轮
```

串行 UI Operator 的并发保持 1。

## 下一次建议试验

继续用 `may-4776-may-4779-第13组`：

```text
1. 保持 may-4776 作为已运行成功样本。
2. 对 may-4777 和 may-4778 先跑安全运行态启动器。
3. may-4779 先做工程结构识别，确认它是不是非标准单体项目。
4. 启动成功后批量跑浏览器检查。
5. 再生成下一轮 prompt 草稿。
```

这一步完成后，才值得把“自动提交到 Trae”作为实验对象。
