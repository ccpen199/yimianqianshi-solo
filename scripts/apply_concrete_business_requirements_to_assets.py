#!/usr/bin/env python3
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROMPTS_FILE = ROOT / 'data/generated/generation_prompts.json'
CANDIDATES_FILE = ROOT / 'data/generated/zero_to_one_candidates.json'
ATOMS_FILE = ROOT / 'data/normalized/product_atoms.json'
REPORT_FILE = ROOT / 'data/generated/concrete_business_requirements_report.json'


ARCHETYPES = [
  {
    'id': 'coupon_conflict',
    'keywords': ['coupon', 'promo', 'code', '优惠券', '优惠码', 'coupons'],
    'name': '优惠码失败原因排查台',
    'user': '电商运营与高频购物者',
    'scenario': '优惠码适用规则排查',
    'form': '优惠规则诊断台',
    'capabilities': ['门槛规则解释', '互斥优惠识别', '客服回复建议'],
    'problem': '用户反馈优惠码不能用时，运营需要知道到底是品类限制、地区限制、会员等级、最低消费、过期还是互斥规则导致失败。',
    'cases': ['老用户使用新客专属码失败', '购物车金额含排除品类导致门槛不足', '优惠码可用但取消包邮导致实际更贵'],
    'acceptance': ['输出失败原因而不是只给可用状态', '按失败原因聚合问题订单', '生成面向用户的解释文案'],
  },
  {
    'id': 'cashback_claim',
    'keywords': ['cash back', 'cashback', 'rebate', 'rewards', '返现'],
    'name': '返现不到账申诉工作台',
    'user': '返现平台重度用户',
    'scenario': '返现追踪与申诉',
    'form': '返现证据工作台',
    'capabilities': ['激活记录核对', '到账周期追踪', '申诉材料生成'],
    'problem': '用户完成订单后返现长期不入账，平台又要求提供激活时间、订单金额、排除品类和截图证据，缺一项就容易申诉失败。',
    'cases': ['激活时间晚于下单时间', '订单包含返现排除品类', '返现金额按税前金额计算导致用户误判'],
    'acceptance': ['能判断订单是否具备申诉资格', '能列出缺失证据', '能生成申诉说明'],
  },
  {
    'id': 'price_history',
    'keywords': ['price tracker', 'price history', 'price compare', 'price comparison', '价格', '比价', '史低', 'deal', 'bestprice', 'overpaying'],
    'name': '假降价采购证据台',
    'user': '企业采购与理性消费者',
    'scenario': '价格历史采购判断',
    'form': '价格证据台',
    'capabilities': ['历史中位价对比', '先涨后降识别', '采购建议导出'],
    'problem': '采购看到限时降价时无法判断是否真的便宜，可能遇到先涨后降、低价缺货、卖家切换或短时异常价。',
    'cases': ['当前价低于昨日但高于 90 天中位价', '低价商品库存不足无法批量采购', '卖家从自营切换成低评分第三方'],
    'acceptance': ['展示历史低价和中位价', '解释是否真实降价', '导出采购审批证据'],
  },
  {
    'id': 'product_review_risk',
    'keywords': ['review', 'reviews', 'rating', 'ratings', 'unbiased reviews', 'trustpilot'],
    'name': '评论风险采购拦截台',
    'user': '谨慎购物者与采购负责人',
    'scenario': '购买前评论风险识别',
    'form': '评论证据工作台',
    'capabilities': ['评论主题聚类', '近期差评识别', '采购风险解释'],
    'problem': '商品评分看起来不错，但近期差评可能集中在售后、质量或物流，采购者需要知道风险是不是刚刚出现。',
    'cases': ['总评分 4.7 但最近一周差评集中在破损', '好评集中在赠品而不是商品本身', '同一类差评被商家客服模板回复掩盖'],
    'acceptance': ['按风险主题整理评论', '区分长期问题和近期问题', '输出买/不买/人工确认建议'],
  },
  {
    'id': 'seller_product_import',
    'keywords': ['product import', '产品采集', '采集产品', 'upseller', 'alibaba', '1688'],
    'name': '跨平台商品上架差错台',
    'user': '跨境卖家与店铺运营',
    'scenario': '商品采集到上架',
    'form': '上架差错处理台',
    'capabilities': ['字段映射检查', '图片授权提示', '库存价格差异'],
    'problem': '卖家从 1688、AliExpress 或 Alibaba 采集商品上架时，标题、规格、图片、价格和库存字段容易映射错误，导致违规或亏损。',
    'cases': ['供应价变化但店铺售价未更新', '采集图片缺少授权备注', '规格单位从件变成箱导致库存错误'],
    'acceptance': ['展示采集前后字段差异', '标出高风险图片和价格', '生成上架前处理清单'],
  },
  {
    'id': 'wishlist_budget',
    'keywords': ['wishlist', 'gift list', 'registry', 'babylist', 'myregistry', 'cart', '购物车'],
    'name': '心愿单预算纪律助手',
    'user': '家庭采购与礼物清单用户',
    'scenario': '心愿单购买时机管理',
    'form': '心愿单决策助手',
    'capabilities': ['目标价判断', '预算占用提醒', '重复购买拦截'],
    'problem': '用户把商品加入心愿单后容易被短期促销打断预算计划，实际需要判断是否达到目标价、是否超预算、是否重复购买。',
    'cases': ['商品降价但仍高于目标价', '达到目标价但本月预算已用完', '同类商品已经买过仍重复加入'],
    'acceptance': ['每个心愿商品给出买或等的理由', '能设置目标价和冷静期', '能解释预算不足或重复购买'],
  },
  {
    'id': 'image_product_search',
    'keywords': ['image search', 'search by image', '图片搜索', '以图搜', '同款', 'lens'],
    'name': '同款采购可信度判断器',
    'user': '跨境采购与小卖家',
    'scenario': '图片同款采购判断',
    'form': '同款可信度工作台',
    'capabilities': ['图片匹配分级', '卖家风险解释', '替代商品推荐'],
    'problem': '图片搜同款会返回大量低价商品，但低价可能来自低评分卖家、标题品类不一致、物流慢或退货政策差。',
    'cases': ['最低价卖家评分过低', '图片相似但品类不一致', '更贵商品支持退货且物流稳定'],
    'acceptance': ['输出可信采购等级', '展示同款价格和卖家风险', '给出选低价或选稳妥的建议'],
  },
  {
    'id': 'video_sync',
    'keywords': ['party', 'watch together', 'watch2gether', 'sync watch', 'scener', 'teleparty'],
    'name': '异地共同观影掉线补偿台',
    'user': '异地朋友与社群观影组织者',
    'scenario': '共同观影同步维护',
    'form': '观影同步控制台',
    'capabilities': ['播放进度对齐', '掉线重连补偿', '成员状态提示'],
    'problem': '多人一起看视频时，经常有人掉线、延迟或进度偏移，组织者需要知道谁不同步、是否要暂停、如何补偿进度。',
    'cases': ['一名成员网络恢复后落后 90 秒', '主持人暂停但部分成员未收到事件', '成员加入时需要追到当前进度'],
    'acceptance': ['能显示每个成员进度偏移', '能给出暂停或追帧建议', '能保存观影事件记录'],
  },
  {
    'id': 'video_download',
    'keywords': ['download video', 'video downloader', 'm3u8', 'hls', 'save video', '视频下载', '下载器', 'downloader'],
    'name': '授权视频素材下载交接单',
    'user': '内容剪辑与运营素材管理员',
    'scenario': '视频素材下载合规交接',
    'form': '素材下载交接台',
    'capabilities': ['下载任务记录', '授权状态标注', '失败重试说明'],
    'problem': '运营下载公开视频素材时，最容易丢失来源、授权状态和下载失败原因，后续剪辑或发布时无法确认能否使用。',
    'cases': ['同一素材下载了多个清晰度版本', '素材来源链接过期', '授权状态未标注导致发布风险'],
    'acceptance': ['每个素材保留来源和用途', '标注授权状态和风险', '导出给剪辑人员的交接清单'],
  },
  {
    'id': 'audio_playback',
    'keywords': ['equalizer', 'audio', 'volume booster', 'bass booster', 'sound', '音频', '均衡器', '音量'],
    'name': '多平台音量失衡处理单',
    'user': '播客剪辑与线上娱乐用户',
    'scenario': '音量与音质一致性处理',
    'form': '音频体验调节台',
    'capabilities': ['响度差异记录', '场景预设管理', '刺耳频段提示'],
    'problem': '不同网站、视频和直播的音量差异很大，用户频繁调音量，剪辑人员也需要记录哪段素材存在爆音或低频过重。',
    'cases': ['片头广告音量明显高于正片', '直播人声过小但背景音乐过大', '低频增强导致耳机用户不适'],
    'acceptance': ['按来源记录音量问题', '提供人声/音乐/直播预设', '标出需要人工确认的爆音片段'],
  },
  {
    'id': 'streaming_playback',
    'keywords': ['skip ads', 'skip intros', 'credits', 'aspect ratio', 'black bars', 'video maximizer', 'streaming', 'netflix hidden', 'prime video'],
    'name': '流媒体观看中断处理台',
    'user': '追剧用户与家庭影音管理员',
    'scenario': '片头广告和画面比例处理',
    'form': '播放体验规则台',
    'capabilities': ['片头片尾规则', '比例异常记录', '平台差异配置'],
    'problem': '家庭观影时，片头广告、黑边、比例错误、跳过片尾误判会打断体验，不同平台规则还不一致。',
    'cases': ['跳过片头误跳过正片开场', '超宽屏视频被拉伸变形', '儿童账号不应自动跳过片尾彩蛋'],
    'acceptance': ['按平台保存播放规则', '记录误跳过案例', '支持一键恢复原始比例'],
  },
  {
    'id': 'youtube_growth',
    'keywords': ['youtube', 'vidiq', 'shorts', 'dislike', 'comments', 'magic actions'],
    'name': 'YouTube 内容决策证据台',
    'user': '视频创作者与频道运营',
    'scenario': '视频表现与内容调整',
    'form': '频道运营证据台',
    'capabilities': ['互动信号整理', '评论风险识别', '内容调整建议'],
    'problem': '创作者不能只看播放量，需要把点赞、点踩、评论风险、标题主题和观看体验放在一起判断下一步内容是否要调整。',
    'cases': ['播放高但负面评论集中', '点踩异常上升但评论没有解释', 'Shorts 干扰长视频观看路径'],
    'acceptance': ['整理视频互动信号', '标出需要人工复查的评论主题', '输出下一条内容建议'],
  },
  {
    'id': 'email_sla',
    'keywords': ['gmail', 'mail', 'email', 'inbox', 'checker'],
    'name': '重要邮件漏处理 SLA 台',
    'user': '客服主管与商务负责人',
    'scenario': '收件箱优先级处理',
    'form': '邮件 SLA 队列',
    'capabilities': ['未读优先级分层', '超时提醒', '处理结果记录'],
    'problem': '邮件未读数本身没有业务价值，真正的问题是重要客户、投诉或合同邮件被普通通知淹没，导致超时未处理。',
    'cases': ['VIP 客户邮件超过 4 小时未回复', '合同附件邮件被归入促销分类', '同一客户连续催促但没有工单记录'],
    'acceptance': ['按客户和主题识别优先级', '显示 SLA 剩余时间', '记录回复或转交动作'],
  },
  {
    'id': 'education_annotation',
    'keywords': ['insertlearning', 'annotation', 'annotate', 'highlight', 'hypothesis', 'pdf annotation', 'instructional'],
    'name': '课堂网页批注交付单',
    'user': '教师与教研负责人',
    'scenario': '网页资料批注教学',
    'form': '课堂批注工作台',
    'capabilities': ['批注任务分发', '学生回应收集', '引用来源留痕'],
    'problem': '教师把网页或 PDF 发给学生时，需要知道学生是否看了关键段落、批注是否偏题、引用来源是否可靠。',
    'cases': ['学生只回复结论没有引用原文', '多人批注集中在无关段落', '网页内容更新后批注位置错位'],
    'acceptance': ['按段落展示批注', '标出缺少证据的回答', '导出课堂讨论记录'],
  },
  {
    'id': 'social_export',
    'keywords': ['instagram', 'follower export', 'story saver', 'tiktok', 'reels', 'export tool', 'download photos'],
    'name': '社媒素材与粉丝导出交接单',
    'user': '社媒运营与达人商务',
    'scenario': '社媒素材和粉丝名单交接',
    'form': '社媒交接工作台',
    'capabilities': ['导出来源记录', '粉丝名单去重', '素材授权备注'],
    'problem': '社媒运营导出故事、短视频或粉丝名单后，经常缺少来源、授权、时间范围和去重说明，交给商务或剪辑时容易出错。',
    'cases': ['重复导出同一批粉丝', '故事素材过期但未标注', 'Reels 下载后缺少原链接'],
    'acceptance': ['记录导出时间和来源', '去重并标注新增粉丝', '生成素材交接清单'],
  },
  {
    'id': 'creator_influencer',
    'keywords': ['influencer', 'creator discovery', 'creator', 'analytics by', 'profile insights'],
    'name': '达人投放名单尽调台',
    'user': '品牌投放负责人',
    'scenario': '达人筛选与投放风险',
    'form': '达人尽调工作台',
    'capabilities': ['账号画像整理', '异常粉丝提示', '投放匹配建议'],
    'problem': '品牌投放达人前，需要判断账号粉丝是否真实、内容是否匹配、近期互动是否异常，避免预算浪费。',
    'cases': ['粉丝增长异常但互动没有同步增长', '内容主题和品牌不匹配', '近期评论出现争议话题'],
    'acceptance': ['输出达人风险等级', '解释匹配和不匹配原因', '导出投放候选名单'],
  },
  {
    'id': 'focus_blocker',
    'keywords': ['block', 'focus', 'distract', 'untrap', 'stay focused', 'hide feeds', 'shorts'],
    'name': '分心网站复发干预计划',
    'user': '备考学生与远程办公者',
    'scenario': '注意力复发控制',
    'form': '专注干预记录器',
    'capabilities': ['诱因记录', '复发次数追踪', '替代动作建议'],
    'problem': '单纯屏蔽网站很容易被用户手动关闭，真正难点是识别什么时候复发、为什么复发、下一次如何降低复发概率。',
    'cases': ['午休后连续打开 Shorts', '临近截止日期反而频繁刷社交媒体', '用户多次临时解除限制'],
    'acceptance': ['记录解除限制原因', '统计复发时段和触发源', '生成下一周干预计划'],
  },
  {
    'id': 'posture_break',
    'keywords': ['posture', 'break', 'reminder', 'sit', '休息'],
    'name': '久坐姿势风险干预表',
    'user': '长时间办公者',
    'scenario': '久坐与姿势提醒',
    'form': '健康提醒计划表',
    'capabilities': ['提醒节奏配置', '忽略原因记录', '风险趋势提示'],
    'problem': '提醒坐直或休息本身不难，难点是用户经常忽略提醒，系统需要判断提醒是否过密、是否在会议中、是否真的改善习惯。',
    'cases': ['用户连续 5 次忽略提醒', '会议时段不适合弹窗', '下午提醒有效但上午无效'],
    'acceptance': ['支持设置工作时段', '记录忽略和完成原因', '输出提醒策略调整建议'],
  },
  {
    'id': 'recipe_meal',
    'keywords': ['recipe', 'recipes', 'food', 'meal', 'kitchen', '食谱', '菜谱'],
    'name': '菜谱到采购清单缺口表',
    'user': '家庭做饭者与备餐用户',
    'scenario': '菜谱采购与库存缺口',
    'form': '食材采购计划器',
    'capabilities': ['菜谱食材拆解', '库存缺口识别', '采购清单生成'],
    'problem': '收藏菜谱之后，用户真正卡在家里有哪些食材、还缺什么、替代食材能不能用、采购量是否过多。',
    'cases': ['菜谱用量单位和库存单位不同', '缺少关键食材但有可替代食材', '多人份量变化导致采购量变化'],
    'acceptance': ['把菜谱拆成食材和用量', '比对家庭库存', '生成按超市分区排列的采购清单'],
  },
  {
    'id': 'todo_habit',
    'keywords': ['todo', 'todolist', 'task', 'checklist', 'catadoo', 'gimkit'],
    'name': '任务拖延原因复盘表',
    'user': '学生与轻量团队负责人',
    'scenario': '待办任务执行复盘',
    'form': '任务复盘工作台',
    'capabilities': ['拖延原因记录', '任务拆分建议', '完成激励设计'],
    'problem': '待办清单本身不能解决拖延，用户需要知道任务为什么没完成，是太大、太模糊、缺资料还是没有截止压力。',
    'cases': ['任务连续三天延期', '任务描述过大无法开始', '完成奖励太弱导致放弃'],
    'acceptance': ['记录延期原因', '把大任务拆成下一步动作', '输出本周完成复盘'],
  },
  {
    'id': 'unit_conversion',
    'keywords': ['unit converter', 'metric', 'converter', 'conversion', '单位', 'currency', '货币转换'],
    'name': '跨单位报价误差拦截表',
    'user': '跨境采购与家庭维修报价用户',
    'scenario': '单位换算与报价误差',
    'form': '单位报价换算表',
    'capabilities': ['单位换算', '报价口径解释', '异常差异提示'],
    'problem': '跨境采购或维修报价里经常混用英制、公制、单价和总价，用户容易因为单位换算错误付错钱。',
    'cases': ['平方英尺报价被误认为平方米', '盎司和克换算导致食材采购量错误', '含税价和未税价混在一起'],
    'acceptance': ['保留原始单位和换算单位', '解释换算公式', '标出明显偏离市场价的报价'],
  },
  {
    'id': 'tab_restore',
    'keywords': ['undo close', 'tab', 'new tab', 'tabs', 'session', 'bookmark'],
    'name': '误关资料恢复清单',
    'user': '研究员与多任务办公者',
    'scenario': '浏览资料恢复',
    'form': '资料会话恢复台',
    'capabilities': ['关闭记录分组', '资料来源恢复', '任务上下文备注'],
    'problem': '用户误关标签页后，问题不只是恢复一个页面，而是恢复当时的研究任务、来源顺序和哪些页面已经看过。',
    'cases': ['一次关闭多个同主题资料页', '恢复页面但忘记当时研究目的', '重复打开已读资料'],
    'acceptance': ['按任务分组关闭记录', '恢复页面时带备注', '标记已读和待读状态'],
  },
  {
    'id': 'theme_accessibility',
    'keywords': ['dark mode', 'theme', 'custom themes', 'cursor', 'background', 'custom calendar', 'stylish', 'dark', 'font'],
    'name': '夜间浏览可读性配置单',
    'user': '长时间浏览者与视觉敏感用户',
    'scenario': '夜间可读性与视觉疲劳',
    'form': '视觉偏好配置器',
    'capabilities': ['颜色对比检查', '站点偏好保存', '可读性回滚'],
    'problem': '换深色主题或光标不只是好看，真实问题是某些站点对比度不足、按钮看不清、主题影响工作阅读。',
    'cases': ['深色模式下链接颜色不可读', '自定义光标遮挡小按钮', '日间和夜间需要不同配置'],
    'acceptance': ['按站点保存视觉配置', '检测低对比度元素', '支持一键回滚到默认配置'],
  },
  {
    'id': 'image_asset',
    'keywords': ['image', 'photo', 'photoshop', 'screenshot', 'background remover', 'download all images', '图片', '图像'],
    'name': '图片素材授权交付台',
    'user': '设计师与电商美工',
    'scenario': '图片素材采集与交付',
    'form': '图片素材交接台',
    'capabilities': ['素材来源记录', '授权状态标注', '尺寸规格检查'],
    'problem': '批量采集或编辑图片后，团队经常丢失来源、授权、尺寸和用途说明，导致交付返工或版权风险。',
    'cases': ['同一图片重复下载多个尺寸', '图片缺少授权说明', '交付尺寸不符合平台要求'],
    'acceptance': ['每张图保留来源和用途', '标注授权风险', '按平台规格生成交付清单'],
  },
  {
    'id': 'design_inspiration',
    'keywords': ['design inspiration', 'muzli', 'color', 'palette', 'dribbble', 'behance'],
    'name': '设计灵感落地筛选表',
    'user': '品牌设计师与产品经理',
    'scenario': '灵感筛选到设计任务',
    'form': '设计参考筛选台',
    'capabilities': ['参考图归类', '品牌适配判断', '落地任务拆解'],
    'problem': '设计灵感收藏很多，但真正难点是判断哪些适合当前品牌、能转化成哪些页面或组件任务。',
    'cases': ['灵感风格好看但不符合品牌色', '参考图无法落到当前组件库', '多人审稿意见冲突'],
    'acceptance': ['给灵感打标签和适配等级', '输出可执行设计任务', '记录采用和放弃理由'],
  },
  {
    'id': 'rss_news',
    'keywords': ['rss', 'feed', 'news', 'washington post', 'inoreader'],
    'name': '信息源可信简报工作台',
    'user': '研究员与内容编辑',
    'scenario': '信息源订阅与简报',
    'form': '来源简报工作台',
    'capabilities': ['来源分级', '重复新闻合并', '简报证据引用'],
    'problem': '订阅源太多时，编辑需要知道哪些来源可信、哪些新闻重复、哪些主题需要进入当天简报。',
    'cases': ['多个来源报道同一事件但标题不同', '来源链接失效', '同一主题被低可信来源放大'],
    'acceptance': ['按主题合并重复新闻', '保留引用来源', '输出可审阅简报草稿'],
  },
  {
    'id': 'weather_risk',
    'keywords': ['weather', 'forecast', 'gismeteo', 'uv weather', 'radar'],
    'name': '天气风险改期决策单',
    'user': '户外工作者与出行组织者',
    'scenario': '天气风险安排调整',
    'form': '天气风险决策台',
    'capabilities': ['地点天气跟踪', '风险阈值判断', '改期建议'],
    'problem': '天气预报本身不够，用户需要判断活动是否要改期、哪些地点受影响、风险阈值是否达到。',
    'cases': ['同城不同地点降雨概率差异大', '紫外线过高影响户外活动', '分钟级降雨导致出发时间调整'],
    'acceptance': ['按地点展示风险等级', '解释触发阈值', '输出继续/改期/换地点建议'],
  },
  {
    'id': 'fact_check',
    'keywords': ['fake news', 'debunker', 'bias checker', 'verify', 'fact'],
    'name': '可疑新闻证据核查单',
    'user': '事实核查员与媒体运营',
    'scenario': '新闻真实性核查',
    'form': '证据核查工作台',
    'capabilities': ['来源交叉验证', '证据缺口提示', '核查结论记录'],
    'problem': '可疑新闻不能只标真假，需要列出哪些证据支持、哪些来源冲突、哪些关键事实还缺验证。',
    'cases': ['图片来源和新闻时间不一致', '多个媒体引用同一未证实来源', '标题夸大但正文证据不足'],
    'acceptance': ['按主张拆解证据', '标出来源冲突', '输出可复查核查结论'],
  },
  {
    'id': 'game_play',
    'keywords': ['game', 'snake', '2048', 'arcade', 'roblox', 'minecraft', 'boxel', 'stacker', 'hacker', 'hack', 'server finder'],
    'name': '轻游戏关卡留存分析台',
    'user': '小游戏开发者与运营',
    'scenario': '关卡流失与难度调整',
    'form': '关卡运营分析台',
    'capabilities': ['关卡失败点记录', '难度曲线判断', '调整建议'],
    'problem': '小游戏上线后，开发者需要知道玩家在哪一关放弃、是否因为难度突增、是否需要调整奖励和提示。',
    'cases': ['第三关失败率突然升高', '玩家重复失败但没有提示', '高分用户很快流失说明缺少后续目标'],
    'acceptance': ['记录关卡开始/失败/完成', '计算流失点', '输出关卡调整建议'],
  },
  {
    'id': 'fantasy_sports',
    'keywords': ['fantasy', 'league', 'sports'],
    'name': '梦幻联赛阵容风险板',
    'user': '梦幻体育玩家',
    'scenario': '阵容选择与伤停风险',
    'form': '阵容决策板',
    'capabilities': ['球员状态跟踪', '阵容冲突提示', '替补建议'],
    'problem': '梦幻联赛玩家临近比赛前需要判断首发、伤停、赛程冲突和替补，不是单纯看专家推荐。',
    'cases': ['球员出战成疑但仍在首发', '多个球员同一轮轮休风险高', '替补分数更稳定'],
    'acceptance': ['展示每个球员风险', '给出替换建议', '保留决策记录'],
  },
  {
    'id': 'sports_score',
    'keywords': ['box score', 'cricket score', 'live score', 'f1 now', 'formula one', 'score bar', 'standings'],
    'name': '赛事比分异常提醒台',
    'user': '体育内容运营与赛事关注者',
    'scenario': '赛事比分和排名跟踪',
    'form': '赛事跟踪工作台',
    'capabilities': ['比分变化记录', '排名影响解释', '关键事件提醒'],
    'problem': '比分和排名变化本身很多，用户真正需要知道哪些变化会影响晋级、投注、内容选题或赛后复盘。',
    'cases': ['比赛延期导致提醒时间错误', '实时比分和官方结果不一致', '排名变化影响晋级但用户没注意'],
    'acceptance': ['记录比分来源', '解释排名影响', '输出关键赛事提醒'],
  },
  {
    'id': 'ai_companion',
    'keywords': ['ai companion', 'ai mate', 'chat', 'companion', 'virtual pet', 'shimeji', 'pet'],
    'name': 'AI 陪伴边界设置台',
    'user': '轻陪伴产品运营',
    'scenario': 'AI 陪伴互动边界',
    'form': '陪伴互动管理台',
    'capabilities': ['互动频率控制', '敏感话题拦截', '关系状态记录'],
    'problem': 'AI 陪伴和虚拟宠物容易过度打扰用户，或者进入敏感话题，产品需要管理互动边界而不是只做聊天。',
    'cases': ['用户工作时段频繁被打扰', 'AI 回复涉及敏感情绪支持', '多人共同养成时状态冲突'],
    'acceptance': ['设置互动时段和频率', '标记敏感话题', '记录用户接受或拒绝互动'],
  },
  {
    'id': 'travel_hotel',
    'keywords': ['hotel', 'hotels', 'booking', 'airbnb', 'lodging', 'stay', 'travel deals', 'ratepunk', 'directo'],
    'name': '酒店预订隐性成本检查单',
    'user': '差旅预订人与自由行用户',
    'scenario': '酒店价格和差评风险判断',
    'form': '酒店预订决策台',
    'capabilities': ['跨平台价格对比', '取消政策解释', '差评风险提示'],
    'problem': '酒店标价便宜不代表总成本低，用户还要考虑税费、取消政策、差评风险、直订优惠和返现。',
    'cases': ['OTA 价格低但不可取消', '直订贵一点但含早餐和延迟退房', '差评集中在噪音或臭虫'],
    'acceptance': ['展示总成本而非裸价', '解释取消政策差异', '标出高风险差评主题'],
  },
  {
    'id': 'flight_points',
    'keywords': ['flight', 'flights', 'points', 'miles', 'qantas', 'aa hotels', 'frequent flyer'],
    'name': '机票积分兑换决策单',
    'user': '常旅客与差旅负责人',
    'scenario': '现金票与积分票选择',
    'form': '积分价值判断台',
    'capabilities': ['现金积分换算', '里程价值解释', '兑换机会提示'],
    'problem': '用户看到积分价格时不知道是否值得兑换，真实问题是现金价、积分价、税费、里程价值和库存限制要一起判断。',
    'cases': ['积分票税费过高不划算', '现金价低于积分价值', '积分库存即将不足'],
    'acceptance': ['计算每点价值', '给出现买或兑换建议', '保留查询记录'],
  },
  {
    'id': 'route_planning',
    'keywords': ['maps', 'route', 'routes', 'directions', 'google maps'],
    'name': '多点路线绕路成本表',
    'user': '骑行者、差旅者与本地配送负责人',
    'scenario': '多点路线优化',
    'form': '路线成本分析台',
    'capabilities': ['多点顺序比较', '绕路成本解释', '导出路线清单'],
    'problem': '路线规划不只是画线，用户需要知道多点顺序改变会增加多少时间、油费或风险，是否值得绕路。',
    'cases': ['看似最近路线包含收费路段', '骑行路线绕开坡度后时间增加', '临时新增地点导致整体路线重排'],
    'acceptance': ['比较多个顺序方案', '解释时间和成本差异', '导出可执行路线'],
  },
  {
    'id': 'meeting_effects',
    'keywords': ['google meet', 'zoom', 'virtual background', 'green screen', 'blur'],
    'name': '远程会议形象检查清单',
    'user': '远程办公者与培训主持人',
    'scenario': '会议前形象与设备检查',
    'form': '会议准备检查台',
    'capabilities': ['背景风险检查', '设备状态记录', '会议场景预设'],
    'problem': '视频会议滤镜和背景不是娱乐功能，正式会议前需要避免背景穿帮、设备异常、滤镜误开。',
    'cases': ['客户会议误用娱乐滤镜', '背景虚化遮挡白板', '摄像头或麦克风状态未确认'],
    'acceptance': ['按会议类型保存配置', '会前生成检查清单', '记录异常和修复动作'],
  },
  {
    'id': 'browser_privacy',
    'keywords': ['adblock', 'privacy', 'cookie', 'tracker', 'spam blocker', 'shield', 'blocker', 'allow', 'permission'],
    'name': '浏览隐私例外规则台',
    'user': '隐私敏感用户与 IT 管理员',
    'scenario': '站点权限与拦截例外',
    'form': '隐私规则工作台',
    'capabilities': ['拦截规则分级', '站点例外管理', '误拦截回滚'],
    'problem': '广告拦截、Cookie、权限放行经常在隐私和可用性之间冲突，用户需要知道哪些站点为什么被放行、哪些规则导致页面不可用。',
    'cases': ['支付页被拦截导致无法结账', 'Cookie 放行后跨站追踪风险升高', '误封验证码脚本导致登录失败'],
    'acceptance': ['按站点展示放行原因', '标出高风险权限', '支持误拦截回滚和历史记录'],
  },
  {
    'id': 'text_clipboard',
    'keywords': ['copy', 'selected text', 'text', 'clipboard', 'edit anything', 'word replacer', 'spealex'],
    'name': '网页文本改写风险清单',
    'user': '内容运营与资料整理者',
    'scenario': '网页文本摘录与改写',
    'form': '文本摘录审稿台',
    'capabilities': ['摘录来源记录', '改写前后对照', '引用风险提示'],
    'problem': '复制、改写或替换网页文本时，容易丢失来源、改坏含义或把临时修改当成真实内容，后续写作和审核会出问题。',
    'cases': ['摘录没有来源链接', '改写后丢失限定条件', '页面临时替换文字被误当作原文'],
    'acceptance': ['保留原文和来源', '展示改写差异', '标出需要人工确认的引用风险'],
  },
  {
    'id': 'local_project_delivery',
    'keywords': ['project', 'api', 'router', 'agent', 'template', 'crawler', 'preview', 'sync', 'sqlite', 'angular', 'python', 'react', 'vue', 'node'],
    'name': '本机项目交付风险拆解台',
    'user': '技术负责人和外包甲方',
    'scenario': '本机项目验收与改造',
    'form': '项目交付审视台',
    'capabilities': ['运行路径确认', '依赖风险定位', '验收任务拆解'],
    'problem': '本机项目目录很多，但交付时最容易卡在依赖跑不起来、README 不可信、脚本入口不清、业务目标和代码结构对不上。',
    'cases': ['package scripts 缺失或启动失败', '环境变量缺失导致接口不可用', 'README 写法和实际目录不一致'],
    'acceptance': ['列出可运行入口和失败原因', '生成改造任务清单', '输出验收包和后续接 CI 的位置'],
  },
  {
    'id': 'fallback',
    'keywords': [],
    'name': 'MVP 交付验收风险台',
    'user': '小团队产品负责人和外包甲方',
    'scenario': 'MVP 交付验收',
    'form': '验收风险工作台',
    'capabilities': ['业务目标确认', '异常样例补齐', '交付风险记录'],
    'problem': '很多小工具只描述功能点，交付时才发现目标用户不清、异常状态缺失、README 跑不起来、验收标准无法判断是否完成。',
    'cases': ['功能能打开但没有真实业务样例', '异常状态没有页面呈现', 'README 启动步骤和实际文件不一致'],
    'acceptance': ['明确第一版服务谁和解决什么损失', '补齐正常/边界/冲突/失败样例', '输出可运行验收清单'],
  },
]


def read(path):
  with path.open(encoding='utf-8') as file:
    return json.load(file)


def write(path, data):
  with path.open('w', encoding='utf-8') as file:
    json.dump(data, file, ensure_ascii=False, indent=2)
    file.write('\n')


def pick_archetype(reference, description):
  text = f'{reference} {description}'.lower()
  for archetype in ARCHETYPES:
    if archetype['id'] == 'fallback':
      continue
    if any(keyword.lower() in text for keyword in archetype['keywords']):
      return archetype
  return ARCHETYPES[-1]


def clean_slug(value):
  text = re.sub(r'[™®★()\[\]:,，。、&/|]+', ' ', str(value).lower())
  text = re.sub(r'[^a-z0-9\u4e00-\u9fa5]+', '-', text).strip('-')
  return text[:90] or 'item'


def concrete_name(archetype, used, reference, order):
  base = archetype['name']
  if base not in used:
    used.add(base)
    return base
  variants = [
    '运营版', '申诉版', '采购版', '团队版', '证据版', '异常版', '交付版', '策略版',
    '商家版', '订单版', '客服版', '风控版', '预算版', '排期版', '回滚版', '审计版',
    '低价版', '权限版', '协作版', '导出版', '历史版', '移动版', '桌面版', '批量版',
    '新客版', '老客版', '跨境版', '素材版', '会议版', '内容版', '活动版', '验收版',
  ]
  for variant in variants:
    candidate = f'{base}{variant}'
    if candidate not in used:
      used.add(candidate)
      return candidate
  # Fall back to a short source hint only after business variants are exhausted.
  source_hint = re.sub(r'[^A-Za-z0-9\u4e00-\u9fa5]+', '', reference)[:10]
  candidate = f'{source_hint}{base}' if source_hint else f'{base}扩展版'
  if candidate not in used:
    used.add(candidate)
    return candidate
  candidate = f'{base}{order}'
  used.add(candidate)
  return candidate


def build_prompt(name, archetype, reference, description):
  cases = '\n'.join(f'- {case}' for case in archetype['cases'])
  acceptance = '\n'.join(f'- {item}' for item in archetype['acceptance'])
  return (
    f"做一个本地可运行的「{name}」。\n\n"
    f"原始参考产品是 {reference}。不要复制它的品牌、页面或文案，只借鉴它暴露出来的业务问题：{description or '原产品描述较少，需要从能力方向抽象业务场景'}。\n\n"
    f"具体业务难题：{archetype['problem']}\n\n"
    f"目标用户：{archetype['user']}。\n"
    f"业务场景：{archetype['scenario']}。\n"
    f"第一版产品形态：{archetype['form']}。\n\n"
    f"必须做出的业务样例：\n{cases}\n\n"
    f"验收标准：\n{acceptance}\n\n"
    f"实现要求：用 mock 数据先做正常、边界、冲突、失败四类案例。页面至少包含任务入口、对象清单、详情页、异常解释、人工处理动作、历史记录和导出结果。README 写清启动方式、主要文件、测试路径和后续接真实接口的位置。"
  )


def main():
  prompts = read(PROMPTS_FILE)
  candidates = read(CANDIDATES_FILE)
  atoms = read(ATOMS_FILE)
  candidate_by_id = {item['id']: item for item in candidates}
  atom_by_id = {item['id']: item for item in atoms}
  used_names = set()
  archetype_counts = Counter()

  for prompt in prompts:
    candidate = candidate_by_id[prompt['candidate_id']]
    atom_id = (candidate.get('source_atom_ids') or [''])[0]
    atom = atom_by_id.get(atom_id)
    reference = (atom or {}).get('reference_product') or (candidate.get('reference_products') or [candidate.get('name')])[0]
    description = (atom or {}).get('raw_description') or candidate.get('core_pain_point', '')
    archetype = pick_archetype(reference, description)
    archetype_counts[archetype['id']] += 1
    name = concrete_name(archetype, used_names, reference, int(prompt['global_order']))
    prompt_text = build_prompt(name, archetype, reference, description)

    candidate['name'] = name
    candidate['target_user'] = archetype['user']
    candidate['scenario'] = archetype['scenario']
    candidate['product_form'] = archetype['form']
    candidate['core_pain_point'] = archetype['problem']
    candidate['capability_bundle'] = archetype['capabilities']
    candidate['differentiation'] = f"从 {reference} 的原始能力中抽取具体业务难题，围绕真实损失、规则冲突、异常样例和验收标准设计，而不是做泛化工具。"
    candidate['mvp_features'] = [
      archetype['scenario'],
      *archetype['capabilities'],
      '正常/边界/冲突/失败样例',
      '人工处理动作',
      '历史记录与导出',
    ]
    candidate['pages'] = ['任务入口', '对象清单', '详情页', '异常解释', '人工处理', '历史记录', '导出结果']
    candidate['business_complexity'] = {
      'source_reference': reference,
      'business_problem': archetype['problem'],
      'required_cases': archetype['cases'],
      'acceptance': archetype['acceptance'],
    }

    prompt['name'] = name
    prompt['target_user'] = archetype['user']
    prompt['scenario'] = archetype['scenario']
    prompt['product_form'] = archetype['form']
    prompt['capability_bundle'] = archetype['capabilities']
    prompt['prompt_intent'] = '具体业务需求'
    prompt['prompt_subtone'] = '业务难题型'
    prompt['prompt_tone_id'] = f"{prompt['prompt_persona']}-业务难题型-具体业务需求-{prompt['prompt_detail']}"
    prompt['prompt'] = prompt_text

  write(CANDIDATES_FILE, candidates)
  write(PROMPTS_FILE, prompts)
  report = {
    'prompts_updated': len(prompts),
    'archetype_counts': archetype_counts,
    'duplicate_names': len(prompts) - len({item['name'] for item in prompts}),
    'top_names': Counter(item['name'] for item in prompts).most_common(20),
  }
  write(REPORT_FILE, report)
  print(json.dumps(report, ensure_ascii=False, indent=2))


from pathlib import Path

PROMPTS_FILE = Path('/Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi/data/generated/generation_prompts.json')
CANDIDATES_FILE = Path('/Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi/data/generated/zero_to_one_candidates.json')
ATOMS_FILE = Path('/Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi/data/normalized/product_atoms.json')
REPORT_FILE = Path('/Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi/data/generated/concrete_business_requirements_report.json')

if __name__ == '__main__':
  main()
