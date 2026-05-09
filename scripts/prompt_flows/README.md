# Prompt Flow 分层说明

当前 Prompt 工厂已经把数据、方案、表达口吻和前端状态拆开，后续不同业务场景可以分别调整流程。

## 当前流程

1. `source domain config`：业务域配置，例如购物、社交、娱乐、旅游。
2. `candidate generation`：根据用户、场景、平台、能力组合生成 0-1 方案。
3. `tone context`：为每条方案选择角色、细分口吻、需求意图和详细程度。
4. `renderer`：把方案渲染成自然语言 Prompt。
5. `prompt state`：前端完成状态写入 `data/generated/prompt_state.json`，不污染原始 Prompt 数据。

## 后续拆分方向

后续你可以按业务域或提示词类型分别指导，例如：

- `shopping`：电商、比价、返现、竞品、商品管理。
- `social`：内容增长、社群、创作者、粉丝互动。
- `entertainment`：视频、音乐、同步观看、播放器增强。
- `travel`：行程、机酒、预算、天气风险。
- `health`：打卡、健康记录、提醒、报告。

每个业务域都可以独立维护：

- 用户分层
- 场景列表
- 能力组合
- 禁用词
- Prompt 结构模板
- 口吻偏好
