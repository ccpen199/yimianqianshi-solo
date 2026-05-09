#!/usr/bin/env python3
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / 'data' / 'generated'
PROMPTS_FILE = GENERATED / 'generation_prompts.json'
CANDIDATES_FILE = GENERATED / 'zero_to_one_candidates.json'
STATE_FILE = GENERATED / 'prompt_state.json'
REPORT_FILE = GENERATED / 'diverse_rebuild_report.json'

SOURCE_FILES = [
  ('shopping', 'data/chrome_web_store/shopping_extensions.json', 2000),
  ('entertainment', 'data/chrome_web_store/entertainment/entertainment_extensions.json', 1200),
  ('social', 'data/chrome_web_store/social/social_extensions.json', 900),
  ('travel', 'data/chrome_web_store/travel/travel_extensions.json', 900),
  ('game', 'data/chrome_web_store/game_extensions.json', 1200),
  ('health', 'data/chrome_web_store/health/health_extensions.json', 1500),
  ('home', 'data/chrome_web_store/home/home_extensions.json', 1500),
  ('news_weather', 'data/chrome_web_store/news_weather/news_weather_extensions.json', 900),
  ('art_design', 'data/chrome_web_store/art_design_extensions.json', 1000),
  ('fun_leisure', 'data/chrome_web_store/fun_leisure/fun_leisure_extensions.json', 1200),
]

FORBIDDEN_TERMS = ['数据看板', '看板', '界面应用', '全栈应用', '界面']
BUSINESS_MODELS = ['订阅席位', '项目模板售卖', '用量计费', '团队工作区', '审计报告付费', '专业版限制', '托管服务费', '集成服务费']
COMPLEXITIES = ['S', 'M', 'L']
PERSONAS = ['产品经理', '技术负责人', '运营负责人', '独立开发者', '外包甲方', '市场负责人', '客服主管', '研究员', '创业者', '普通使用者']
SUBTONES = ['验收清晰型', '本地优先型', '流程拆解型', '异常处理型', '低成本试错型', '证据留痕型', '协作交接型', '接口预留型', '状态反馈型', '边界场景型']
INTENTS = ['异常排查', '流程编排', '风控校验', '决策演练', '自动巡检', '合规留痕', '协作交接', '成本压测', '验收驱动', '本地优先MVP']
DETAILS = ['brief', 'normal', 'detailed', 'engineering']

MICRO_CONTEXTS = [
  '首单', '复购', '退款前', '导入后', '跨店', '跨区', '夜间', '节假日', '审批中', '交付前',
  '上架前', '结算前', '复核后', '多人协作', '批量导入', '历史回填', '低频', '高频', '新手',
  '老客', '临期', '超预算', '弱网', '离线', '灰度', '回滚前', '申诉中', '预售期', '高峰期',
  '试运营', '归档前', '复盘期', '迁移期', '换季', '月末', '周报前', '权限变更后', '版本升级后', '空结果',
]
DATA_CONDITIONS = [
  '脏数据', '缺字段', '重复记录', '延迟回调', '超时任务', '冲突编辑', '失效链接', '过期规则',
  '错误标签', '重复提醒', '限流接口', '导出失败', '缓存旧值', '时区偏差', '口径不一', '金额偏差',
  '状态漂移', '样本过少', '批次混乱', '权限错配',
]
WORKFLOW_TYPES = [
  '取证', '复核', '巡检', '排障', '编排', '核算', '调度', '回滚', '分流', '归因',
  '稽核', '重排', '验收', '追踪', '预警', '校准', '清洗', '补偿', '对账', '压测',
]
PRODUCT_SUFFIXES = [
  '台', '器', '流', '册', '簿', '舱', '站', '助手', '管线', '工作台',
  '处理器', '复盘器', '审计台', '校验器', '调度器', '诊断器', '沙盘', '清单',
]
OUTCOMES = [
  '闭环', '证据链', '风险单', '决策包', '修复流', '验收单', '交接包', '回放',
  '兜底策略', '异常队列', '审计线', '复盘包', '分层规则', '补救路径',
]
FLOW_STEPS = ['录入或导入对象', '校验关键字段', '识别异常与冲突', '给出处理建议', '人工确认或回滚', '导出结果与留痕']
ACCEPTANCE = ['异常可解释', '冲突可处理', '状态可回放', '结果可导出', '失败有兜底', 'README 可复现']

DOMAIN_BLUEPRINTS = {
  'shopping': {
    'audiences': ['跨境买手', '数码采购', '宝妈采购', '学生省钱党', '亚马逊卖家', 'Shopify运营', 'TikTok小店', '品牌控价员', '企业采购', '高频网购者'],
    'scenarios': ['优惠核销', '价格追踪', '竞品补位', '假评识别', '库存预警', '税费核算', '退货复盘', '采购审批', '同款归并', '结账校验'],
    'forms': ['价格规则引擎', '采购核验助手', '优惠试算器', '订单对账服务', '评论风险审计台', '库存告警机器人', '跨店比价插件', '退货损耗复盘器', '控价巡检台', '结账沙盘'],
    'objects': '商品、报价、优惠、库存、评论、订单、竞品店铺和采购预算',
    'cases': ['跨站价格漂移', '优惠叠加冲突', '退货周期异常', '假评聚集', '税费汇率偏差', '竞品断货补位', '审批超预算', '库存阈值误报'],
    'capabilities': ['价格证据采集', '优惠规则试算', '评论风险分层', '库存阈值校验', '订单差异对账', '竞品价格归因', '采购预算预警', '退货周期复盘'],
  },
  'entertainment': {
    'audiences': ['追剧党', '播客剪辑', '直播房管', '影评作者', '音乐整理者', '家庭影音管家', '二创剪辑师', '字幕校对者'],
    'scenarios': ['同步观影', '弹幕治理', '音轨校准', '歌词对齐', '片单审稿', '进度迁移', '跳片头判定', '素材授权备注'],
    'forms': ['观影同步房', '弹幕处置台', '音轨修复器', '歌词校准器', '片单策划器', '观看进度迁移器', '推荐实验沙盘', '素材版权标注器'],
    'objects': '内容条目、片单、观看记录、弹幕、音轨、歌词、成员和推荐理由',
    'cases': ['多人进度偏移', '字幕音轨错位', '弹幕刷屏', '地区限制提示', '推荐冷启动', '片单重复合并', '跳片头误判', '素材版权缺失'],
    'capabilities': ['同步状态校准', '弹幕优先级处置', '音轨偏移修复', '歌词时间轴复核', '片单重复合并', '观看记录迁移', '推荐理由解释', '版权备注留痕'],
  },
  'social': {
    'audiences': ['社群运营', '品牌社媒', '内容创作者', '粉丝群管理员', 'Twitch观众', 'YouTube运营', '私域客服', '邮件重度使用者'],
    'scenarios': ['评论分流', '私域触达', '内容同步', '粉丝标签', '申诉复核', '消息去重', '素材授权', '增长实验隔离'],
    'forms': ['评论处置队列', '内容同步补偿器', '粉丝分层台账', '私域触达编排器', '申诉复核台', '消息去重网关', '素材授权簿', '实验隔离沙盘'],
    'objects': '账号、粉丝、评论、消息、内容、社群规则、素材和互动事件',
    'cases': ['跨平台同步失败', '评论优先级误判', '粉丝标签漂移', '敏感词申诉', '消息重复提醒', '素材版权缺口', '增长实验污染', '共同观看掉线'],
    'capabilities': ['评论优先级排序', '同步失败补偿', '粉丝标签审计', '申诉证据整理', '重复消息合并', '素材授权备注', '实验组隔离', '互动事件追踪'],
  },
  'travel': {
    'audiences': ['自由行规划者', '商务差旅', '家庭出游组织者', '背包客', '旅行博主', '酒店运营', '机票比价员', '本地探索者'],
    'scenarios': ['行程重排', '机酒追价', '签证核验', '预算偏差', '天气改线', '路线去重', '多人偏好', '本地活动冲突'],
    'forms': ['行程重排器', '机酒价格追踪器', '签证材料核验单', '旅行预算偏差簿', '天气改线助手', '路线冲突解算器', '多人协作确认流', '本地活动排期器'],
    'objects': '行程、航班、酒店、预算、签证材料、天气、路线、成员和收藏地点',
    'cases': ['航班延误重排', '多人偏好冲突', '预算超支', '签证材料缺失', '天气风险改线', '取消政策差异', '路线绕路', '活动时间冲突'],
    'capabilities': ['航班变更重排', '预算偏差归因', '材料缺口检查', '天气风险判断', '路线冲突解算', '多人确认流', '酒店政策对比', '活动时间排重'],
  },
  'game': {
    'audiences': ['Steam玩家', '硬核玩家', '手游队长', '游戏主播', '电竞领队', '社区运营', '家长', 'MOD作者'],
    'scenarios': ['战绩复盘', '组队匹配', 'MOD冲突', '折扣追踪', '赛事排程', '攻略校验', '时长守护', '直播互动'],
    'forms': ['战绩复盘器', '组队规则器', 'MOD依赖检查器', '折扣历史追踪器', '赛事时区排程器', '攻略版本校验册', '游戏时长守护器', '直播互动延迟探针'],
    'objects': '游戏、玩家、队伍、战绩、成就、MOD、赛事、价格和攻略条目',
    'cases': ['战绩口径不一致', '队伍位置冲突', 'MOD依赖缺失', '折扣历史回填', '赛事时区换算', '攻略版本过期', '未成年人时长限制', '直播互动延迟'],
    'capabilities': ['战绩口径映射', '组队约束匹配', 'MOD依赖诊断', '折扣曲线回填', '赛事时区换算', '攻略版本标注', '时长限制提醒', '直播事件排队'],
  },
  'health': {
    'audiences': ['慢病随访员', '家庭照护者', '医生助理', '营养师', '睡眠改善者', '心理咨询助理', '企业健康专员', '康复训练师'],
    'scenarios': ['用药补救', '康复随访', '饮食复盘', '睡眠干预', '风险分层', '情绪波动', '家庭交接', '报告复核'],
    'forms': ['用药补救助手', '康复随访工作台', '营养复盘器', '睡眠干预记录器', '风险分层引擎', '情绪事件复核台', '照护交接册', '健康报告校验器'],
    'objects': '用户档案、体征记录、用药计划、饮食运动、睡眠、随访任务和风险提示',
    'cases': ['漏服补救路径', '异常指标复核', '康复动作依从性', '家庭照护交接', '高风险人群分层', '情绪波动干预', '报告口径追溯', '提醒疲劳'],
    'capabilities': ['用药计划核对', '体征异常复核', '康复动作打卡', '照护交接记录', '风险等级解释', '情绪事件标注', '报告口径追踪', '提醒频率控制'],
  },
  'home': {
    'audiences': ['租房住户', '房东', '物业维修', '装修业主', '家庭采购', '收纳爱好者', '智能家居管家', '家庭协作者'],
    'scenarios': ['维修报价', '设备保养', '预算追加', '耗材补货', '账单分摊', '租客交接', '菜谱采购', '家务排班'],
    'forms': ['维修报价复核台', '设备履历册', '装修预算变更簿', '耗材补货助手', '账单分摊校验器', '租务交接证据包', '菜谱库存联动器', '家务排班调度器'],
    'objects': '房间、设备、耗材、账单、维修记录、家庭成员、预算和采购清单',
    'cases': ['多人任务冲突', '设备保修到期', '维修报价分歧', '预算追加审批', '耗材过期', '租客交接留痕', '菜谱库存缺口', '账单分摊争议'],
    'capabilities': ['维修报价对比', '设备保修提醒', '预算变更审批', '耗材库存盘点', '账单分摊核算', '交接照片留痕', '菜谱缺口计算', '家务任务排班'],
  },
  'news_weather': {
    'audiences': ['新闻编辑', '投资观察者', '天气敏感人群', '研究员', '户外作业者', '本地生活运营', '媒体运营', '事实核查员'],
    'scenarios': ['来源巡检', '新闻去重', '事实核查', '天气预警', '本地事件', '舆情峰值', '主题追踪', '简报审阅'],
    'forms': ['来源评分器', '新闻合并流', '事实核查证据包', '天气预警分发器', '本地事件提醒器', '舆情追踪线', '主题订阅服务', '简报审阅单'],
    'objects': '信息源、主题、事件、地点、天气预警、引用证据、订阅和简报任务',
    'cases': ['来源可信度降级', '重复新闻合并', '极端天气阈值', '事实核查冲突', '本地事件误报', '引用链接失效', '简报时效控制', '舆情峰值解释'],
    'capabilities': ['来源可信度评分', '重复事件合并', '引用证据核验', '天气阈值预警', '本地事件筛重', '链接失效检测', '简报时效提醒', '舆情峰值解释'],
  },
  'art_design': {
    'audiences': ['品牌设计师', '电商美工', '插画师', '摄影修图师', '自媒体运营', '产品经理', 'UI设计师', '设计审稿人'],
    'scenarios': ['素材授权', '批量导出', '色彩复核', '图片去重', '审稿冲突', '品牌规范', '多尺寸裁切', '交付命名'],
    'forms': ['素材授权簿', '批量导出管线', '配色复核器', '图片去重采集器', '审稿流转单', '品牌一致性检查器', '多尺寸裁切校验器', '交付打包器'],
    'objects': '图片、图层、色板、品牌素材、审稿意见、授权信息和导出规格',
    'cases': ['批量导出失败', '色彩口径漂移', '素材授权缺失', '审稿意见冲突', '图片重复采集', '品牌规范违规', '裁切偏差', '文件命名混乱'],
    'capabilities': ['授权信息标注', '批量导出重试', '色板差异对比', '图片相似去重', '审稿意见合并', '品牌规范检测', '裁切尺寸校验', '交付命名检查'],
  },
  'fun_leisure': {
    'audiences': ['办公室减压者', '桌宠爱好者', '学生放松者', '动漫收藏者', '浏览器个性化玩家', '宠物爱好者', '音乐电台听众', '休息提醒使用者'],
    'scenarios': ['休息节律', '桌宠互动', '主题切换', '随机推荐', '轻游戏任务', '音乐电台', '分享审核', '偏好迁移'],
    'forms': ['休息节律调度器', '桌宠互动事件簿', '主题资源诊断器', '随机内容去重流', '轻游戏任务器', '音乐电台控制器', '分享文案审核单', '偏好迁移包'],
    'objects': '主题、互动事件、播放列表、休息计划、收藏、分享内容和用户偏好',
    'cases': ['提醒打扰控制', '互动奖励衰减', '主题资源缺失', '随机内容重复', '离线状态保留', '分享文案风险', '连续使用疲劳', '音乐版权标注'],
    'capabilities': ['休息频率调度', '互动事件记录', '主题资源检查', '随机内容去重', '离线状态恢复', '分享文案审核', '疲劳阈值提醒', '音乐版权备注'],
  },
}


def read_json(path):
  with path.open(encoding='utf-8') as file:
    return json.load(file)


def write_json(path, payload):
  with path.open('w', encoding='utf-8') as file:
    json.dump(payload, file, ensure_ascii=False, indent=2)
    file.write('\n')


def pick(items, seed):
  return items[seed % len(items)]


def slugify(value):
  text = re.sub(r'[™®★()\[\]:,，。、&/]+', ' ', str(value).lower())
  text = re.sub(r'[^a-z0-9\u4e00-\u9fa5]+', '-', text).strip('-')
  return text[:90] or 'item'


def clean_text(value):
  result = str(value or '')
  replacements = {
    '数据看板': '指标诊断',
    '看板': '诊断台',
    '界面应用': '流程工具',
    '全栈应用': '本地应用',
    '界面': '交互流程',
  }
  for old, new in replacements.items():
    result = result.replace(old, new)
  return result.strip()


def load_source_refs(domain, file_name):
  path = ROOT / file_name
  payload = read_json(path)
  items = payload.get('items') or payload.get('extensions') or payload
  refs = []
  for index, item in enumerate(items if isinstance(items, list) else [], 1):
    name = clean_text(item.get('name', f'{domain} reference {index}'))
    refs.append({
      'id': f'{domain}_atom_{index:04d}_{slugify(name)}',
      'name': name,
      'rating': item.get('rating'),
      'description': clean_text(item.get('description', '')),
    })
  return refs or [{'id': f'{domain}_atom_0001_fallback', 'name': f'{domain} reference', 'rating': 0, 'description': ''}]


def completed_ids(state):
  return {
    prompt_id
    for prompt_id, info in state.get('completed', {}).items()
    if isinstance(info, dict) and info.get('completed')
  }


def domain_ranges():
  start = 1
  ranges = {}
  for domain, _file, target in SOURCE_FILES:
    end = start + target - 1
    ranges[domain] = range(start, end + 1)
    start = end + 1
  return ranges


def make_name(domain, order, used):
  kit = DOMAIN_BLUEPRINTS[domain]
  audience = pick(kit['audiences'], order + 1)
  scenario = pick(kit['scenarios'], order * 3)
  form = pick(kit['forms'], order * 5)
  case = pick(kit['cases'], order * 7)
  capability = pick(kit['capabilities'], order * 11)
  micro = pick(MICRO_CONTEXTS, order * 13)
  condition = pick(DATA_CONDITIONS, order * 17)
  action = pick(WORKFLOW_TYPES, order * 19)
  suffix = pick(PRODUCT_SUFFIXES, order * 23)
  outcome = pick(OUTCOMES, order * 29)
  patterns = [
    f'{micro}{scenario}{suffix}',
    f'{condition}{case}{outcome}',
    f'{audience}{scenario}{suffix}',
    f'{form}{case}版',
    f'{capability}{micro}{outcome}',
    f'{case}{action}{suffix}',
    f'{micro}{form}',
    f'{scenario}{condition}{outcome}',
    f'{audience}{case}{outcome}',
    f'{condition}{capability}{suffix}',
    f'{form}{action}流',
    f'{micro}{case}{suffix}',
  ]
  for offset in range(len(patterns) * 2):
    candidate = clean_text(patterns[(order + offset) % len(patterns)])
    if candidate and candidate not in used:
      used.add(candidate)
      return candidate
  while True:
    candidate = f'{pick(MICRO_CONTEXTS, order + len(used))}{pick(DATA_CONDITIONS, order + len(used))}{pick(WORKFLOW_TYPES, order + len(used))}{pick(PRODUCT_SUFFIXES, order + len(used))}'
    if candidate not in used:
      used.add(candidate)
      return candidate


def make_candidate(domain, order, domain_index, refs, used_names):
  kit = DOMAIN_BLUEPRINTS[domain]
  name = make_name(domain, order, used_names)
  ref_seed = order + domain_index
  ref_items = [pick(refs, ref_seed + step * 3) for step in range(5)]
  capabilities = []
  for step in range(3):
    capabilities.append(pick(kit['capabilities'], order + step * 5 + domain_index))
  capabilities = list(dict.fromkeys(capabilities))[:3]
  scenario = pick(kit['scenarios'], order + domain_index * 2)
  case = pick(kit['cases'], order + domain_index * 3)
  form = pick(kit['forms'], order + domain_index * 5)
  audience = pick(kit['audiences'], order + domain_index * 7)
  condition = pick(DATA_CONDITIONS, order + domain_index * 11)
  micro = pick(MICRO_CONTEXTS, order + domain_index * 13)
  candidate_id = f'{domain}_rebuilt_{domain_index:05d}_{slugify(name)}'
  return {
    'id': candidate_id,
    'business_domain': domain,
    'name': name,
    'target_user': audience,
    'scenario': scenario,
    'product_form': form,
    'core_pain_point': f'{audience}在{scenario}时容易遇到{case}和{condition}，需要能复核、留痕并推动下一步动作',
    'capability_bundle': capabilities,
    'differentiation': f'围绕{micro}场景设计，重点处理{case}、{condition}、人工确认和失败兜底，而不是静态展示信息',
    'monetization': pick(BUSINESS_MODELS, order + len(name)),
    'complexity': pick(COMPLEXITIES, order + len(capabilities)),
    'domain_object': kit['objects'],
    'mvp_features': [
      f'{scenario}对象录入与批量导入',
      f'{condition}校验',
      f'{case}识别',
      f'{capabilities[0]}执行',
      '人工确认、撤销与操作留痕',
      '导出结果与 README',
    ],
    'pages': ['任务入口', '对象清单', '处理详情', '规则配置', '历史记录', '导出结果'],
    'data_models': ['Actor', 'DomainObject', 'Rule', 'Finding', 'ActionLog', 'ExportJob'],
    'reference_products': [item['name'] for item in ref_items],
    'source_atom_ids': [item['id'] for item in ref_items],
    'business_complexity': {
      'micro_context': micro,
      'real_world_case': case,
      'data_condition': condition,
      'primary_flow': FLOW_STEPS,
      'acceptance_focus': ACCEPTANCE,
    },
    '_case': case,
    '_condition': condition,
    '_micro': micro,
  }


def make_prompt(candidate, order):
  persona = pick(PERSONAS, order + len(candidate['name']))
  subtone = pick(SUBTONES, order + len(candidate['scenario']))
  intent = pick(INTENTS, order + len(candidate['product_form']))
  detail = pick(DETAILS, order)
  flow = ' -> '.join(FLOW_STEPS)
  caps = '、'.join(candidate['capability_bundle'])
  prompt = (
    f"{candidate['name']}先做一个本地可运行版本，给{candidate['target_user']}处理{candidate['scenario']}。\n\n"
    f"原始参考来自这些同类产品或插件：{'、'.join(candidate['reference_products'][:3])}。只借鉴问题和能力，不照搬品牌、页面和文案。\n\n"
    f"业务对象包括{candidate['domain_object']}。主流程按{flow}实现。核心能力是{caps}，必须在流程里产生可检查的结果。\n\n"
    f"复杂场景放进去：{candidate['_micro']}时出现{candidate['_case']}，同时 mock 一组{candidate['_condition']}数据。"
    f"页面需要看到异常原因、处理建议、人工确认、撤销或回滚、历史记录和导出结果。\n\n"
    f"用本地 mock 数据实现正常、边界、冲突、失败四组样例。README 写清启动方式、主要文件、测试路径和后续接真实接口的位置。"
  )
  return {
    'id': f"prompt_{order:05d}_{candidate['id']}",
    'candidate_id': candidate['id'],
    'business_domain': candidate['business_domain'],
    'name': candidate['name'],
    'target_user': candidate['target_user'],
    'scenario': candidate['scenario'],
    'product_form': candidate['product_form'],
    'capability_bundle': candidate['capability_bundle'],
    'monetization': candidate['monetization'],
    'complexity': candidate['complexity'],
    'prompt_persona': persona,
    'prompt_subtone': subtone,
    'prompt_intent': intent,
    'prompt_detail': detail,
    'prompt_tone_id': f'{persona}-{subtone}-{intent}-{detail}',
    'status': 'draft',
    'prompt': prompt,
    'global_order': order,
    'scene_folder': candidate['business_domain'],
    'order_folder': str(order),
  }


def strip_internal(candidate):
  return {key: value for key, value in candidate.items() if not key.startswith('_')}


def main():
  old_prompts = read_json(PROMPTS_FILE)
  old_candidates = read_json(CANDIDATES_FILE)
  state = read_json(STATE_FILE)
  done = completed_ids(state)
  old_prompt_by_id = {item['id']: item for item in old_prompts}
  old_candidate_by_id = {item['id']: item for item in old_candidates}

  kept_prompts = {prompt_id: old_prompt_by_id[prompt_id] for prompt_id in done if prompt_id in old_prompt_by_id}
  kept_candidate_ids = {item['candidate_id'] for item in kept_prompts.values()}
  kept_candidates = {candidate_id: old_candidate_by_id[candidate_id] for candidate_id in kept_candidate_ids if candidate_id in old_candidate_by_id}

  refs_by_domain = {
    domain: load_source_refs(domain, file_name)
    for domain, file_name, _target in SOURCE_FILES
  }
  ranges = domain_ranges()
  completed_orders = {int(item.get('global_order')) for item in kept_prompts.values()}
  used_names = {item['name'] for item in kept_prompts.values()}
  prompts = []
  candidates = []
  domain_counts = Counter()

  for domain, _file_name, _target in SOURCE_FILES:
    for order in ranges[domain]:
      if order in completed_orders:
        prompt = next(item for item in kept_prompts.values() if int(item.get('global_order')) == order)
        candidate = kept_candidates.get(prompt['candidate_id'])
        if candidate:
          candidates.append(candidate)
        prompts.append(prompt)
        continue
      domain_counts[domain] += 1
      candidate = make_candidate(domain, order, domain_counts[domain], refs_by_domain[domain], used_names)
      prompt = make_prompt(candidate, order)
      candidates.append(strip_internal(candidate))
      prompts.append(prompt)

  prompts.sort(key=lambda item: int(item.get('global_order') or 0))
  candidate_ids = {item['candidate_id'] for item in prompts}
  candidates = [item for item in candidates if item['id'] in candidate_ids]

  state['completed'] = {prompt_id: state.get('completed', {}).get(prompt_id, {'completed': True}) for prompt_id in kept_prompts}
  state['orders'] = {prompt_id: order for prompt_id, order in state.get('orders', {}).items() if prompt_id in kept_prompts}

  write_json(PROMPTS_FILE, prompts)
  write_json(CANDIDATES_FILE, candidates)
  write_json(STATE_FILE, state)

  uncompleted = [item for item in prompts if item['id'] not in kept_prompts]
  report = {
    'total_prompts': len(prompts),
    'total_candidates': len(candidates),
    'completed_preserved': len(kept_prompts),
    'uncompleted_rebuilt': len(uncompleted),
    'duplicate_names': len(prompts) - len({item['name'] for item in prompts}),
    'forbidden_terms_in_uncompleted_names': {
      term: sum(term in item['name'] for item in uncompleted)
      for term in FORBIDDEN_TERMS
    },
    'top_product_forms': Counter(item['product_form'] for item in uncompleted).most_common(20),
    'top_scenarios': Counter(item['scenario'] for item in uncompleted).most_common(20),
    'completed_prompt_ids': sorted(kept_prompts),
  }
  write_json(REPORT_FILE, report)
  print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
  main()
