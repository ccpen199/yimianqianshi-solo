# 试跑 05：提交前 AX 窗口探测

时间：2026-05-14

## 本次目标

在提交队列之后，验证 Trae UI Operator 能否稳定定位目标窗口内部的输入区和运行按钮。

本阶段仍然不自动粘贴、不点击运行。

## 新增能力

新增脚本：

```text
solo-coder/workbench/automation/trae_ui_ax_probe.py
```

新增 API：

```text
POST /api/trae-round-automation-ax-probe
```

新增按钮：

```text
Trae 多轮自动化 -> 探测首项窗口
```

脚本行为：

```text
1. 读取队列首项，默认是 may-4777。
2. 扫描 macOS Accessibility 中的 Trae/Electron 窗口。
3. 输出有限深度的 AX 树到 <order>-ax-tree.txt。
4. 不粘贴。
5. 不点击。
6. 不提交 prompt。
```

## 探测结果

第一次在窗口仍可枚举时，`may-4777` 能匹配到窗口：

```text
WINDOW=Profile.jsx — may-4777
role=AXWindow
  ...
  role=AXWebArea
```

聚焦后窗口标题变为：

```text
WINDOW=index.html — may-4777
```

AX 树能看到：

```text
AXWindow
AXWebArea
AXApplicationDialog
AXToolbar
AXButton desc=关闭对话框
```

但没有稳定暴露出聊天输入框或运行按钮。

随后再次探测时，macOS 当前可枚举 Trae 窗口数变成 0：

```text
MATCHED=false
```

Workbench API 已验证能正常返回这个状态，而不是报 500：

```text
POST /api/trae-round-automation-ax-probe
ok=False
action=ax-probe
order=may-4777
matched=False
lineCount=1
```

## 结论

当前还不能直接做“自动粘贴 + 点击运行”。

原因：

```text
1. Trae 窗口在不同 macOS Space 下会出现不可枚举状态。
2. 即使窗口可枚举，当前 AX 树只稳定到 Electron WebArea。
3. 输入框和运行按钮没有稳定暴露出来。
4. 窗口里可能存在 AXApplicationDialog，盲目 Cmd+V/Enter 有误操作风险。
```

## 当前可用链路

已经稳定：

```text
生成提交队列
准备首项 dry-run
安全复制 prompt 到剪贴板的代码路径
窗口聚焦函数
AX 探测函数
窗口不可见时的失败返回
```

还没有开放自动提交：

```text
粘贴到 Trae 输入框
点击运行/确认
等待完成
刷新下一轮
```

## 下一步

下一步应该先做“窗口可见性恢复/确认”机制，而不是直接点运行：

```text
1. 如果 AX 探测返回 MATCHED=false，在页面提示“请切到包含目标 Trae 窗口的桌面后重试”。
2. 如果只看到 AXWebArea，但没有输入框，先要求人工打开 Trae 对话输入区。
3. 再次探测，确认能看到可输入元素或稳定快捷键。
4. 只有定位输入区成功后，才允许进入“粘贴但不运行”。
5. 粘贴稳定后，再进入“粘贴 + 点击运行”。
```

这一步是 GUI 自动化能否闭环的关键。如果绕过它直接 `Cmd+V/Enter`，很容易把 prompt 粘到代码编辑器或错误窗口里。
