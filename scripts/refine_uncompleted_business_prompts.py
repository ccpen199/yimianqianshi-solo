#!/usr/bin/env python3
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / 'data' / 'generated'
PROMPTS_FILE = GENERATED / 'generation_prompts.json'
CANDIDATES_FILE = GENERATED / 'zero_to_one_candidates.json'
STATE_FILE = GENERATED / 'prompt_state.json'
REPORT_FILE = GENERATED / 'refine_uncompleted_business_report.json'


DOMAIN_KITS = {
  'shopping': {
    'forms': ['浏览器比价插件', '卖家巡检工具', '采购核验助手', '订单对账服务', '价格规则引擎', '优惠策略模拟器', '库存告警机器人', '评论风险审计器'],
    'objects': '商品、报价、优惠、库存、评论、订单、竞品店铺和采购预算',
    'cases': ['跨站价格漂移', '优惠叠加冲突', '退货周期异常', '假评聚集识别', '税费汇率偏差', '竞品断货补位', '采购审批超预算', '库存阈值误报'],
    'artifacts': ['规则核验器', '异常工单流', '价格证据链', '采购决策包', '店铺风险雷达', '结账模拟器'],
  },
  'health': {
    'forms': ['照护计划助手', '用药提醒服务', '康复随访系统', '风险分层引擎', '营养复盘工具', '睡眠干预记录器', '家庭共享档案', '体征异常告警器'],
    'objects': '用户档案、体征记录、用药计划、饮食运动、睡眠、随访任务和风险提示',
    'cases': ['漏服补救路径', '异常指标复核', '康复动作依从性', '家庭照护交接', '高风险人群分层', '情绪波动干预', '报告口径追溯', '提醒疲劳控制'],
    'artifacts': ['随访闭环', '风险复核单', '照护交接册', '计划调整器', '异常事件流', '干预建议包'],
  },
  'home': {
    'forms': ['家庭资产台账', '维修工单系统', '家务排班助手', '装修预算核算器', '库存补货工具', '设备保养提醒器', '租务协作空间', '菜谱采购联动器'],
    'objects': '房间、设备、耗材、账单、维修记录、家庭成员、预算和采购清单',
    'cases': ['多人任务冲突', '设备保修到期', '维修报价分歧', '预算追加审批', '耗材过期提醒', '租客交接留痕', '菜谱库存缺口', '账单分摊争议'],
    'artifacts': ['家庭工单流', '预算变更簿', '设备履历册', '协作清单', '库存缺口单', '交接证据包'],
  },
  'entertainment': {
    'forms': ['观影同步房', '片单策划工具', '音频修复器', '内容推荐实验器', '弹幕治理助手', '创作者素材整理器', '观看进度同步器', '歌词校准工具'],
    'objects': '内容条目、片单、观看记录、弹幕、音轨、歌词、成员和推荐理由',
    'cases': ['多人进度偏移', '字幕音轨错位', '弹幕刷屏治理', '版权地区限制提示', '推荐冷启动', '片单重复合并', '跳过片头误判', '创作素材版权备注'],
    'artifacts': ['同步校准器', '片单审稿流', '弹幕处置台', '推荐实验单', '音轨修复包', '观看交接记录'],
  },
  'game': {
    'forms': ['战绩复盘工具', '组队匹配服务', 'MOD冲突检查器', '折扣追踪插件', '赛事排程助手', '攻略知识库', '游戏时间守护器', '直播互动控件'],
    'objects': '游戏、玩家、队伍、战绩、成就、MOD、赛事、价格和攻略条目',
    'cases': ['战绩口径不一致', '队伍位置冲突', 'MOD依赖缺失', '折扣历史回填', '赛事时区换算', '攻略版本过期', '未成年人时长限制', '直播互动延迟'],
    'artifacts': ['复盘任务流', '组队规则器', '冲突诊断单', '赛事提醒器', '攻略校验册', '互动延迟探针'],
  },
  'fun_leisure': {
    'forms': ['减压互动小工具', '桌面陪伴程序', '随机内容采集器', '主题配置器', '休息节律提醒器', '轻游戏任务器', '音乐电台控制器', '社交分享生成器'],
    'objects': '主题、互动事件、播放列表、休息计划、收藏、分享内容和用户偏好',
    'cases': ['提醒打扰控制', '互动奖励衰减', '主题资源缺失', '随机内容去重', '离线状态保留', '分享文案审核', '连续使用疲劳', '音乐版权标注'],
    'artifacts': ['节律调度器', '互动事件簿', '主题诊断器', '内容去重流', '偏好迁移包', '分享审核单'],
  },
  'art_design': {
    'forms': ['素材审稿工具', '批量修图管线', '品牌资产库', '配色实验器', '图片采集插件', '作品集整理器', '版权标注助手', '设计交付检查器'],
    'objects': '图片、图层、色板、品牌素材、审稿意见、授权信息和导出规格',
    'cases': ['批量导出失败重试', '色彩口径漂移', '素材授权缺失', '审稿意见冲突', '图片重复采集', '品牌规范违规', '多尺寸裁切偏差', '交付文件命名混乱'],
    'artifacts': ['审稿流转单', '导出校验器', '素材授权簿', '配色对照器', '品牌一致性检查', '交付打包器'],
  },
  'news_weather': {
    'forms': ['信息源巡检器', '事实核查助手', '天气风险告警器', '主题追踪服务', '简报生成器', '舆情证据链', '本地事件提醒器', 'RSS清洗工具'],
    'objects': '信息源、主题、事件、地点、天气预警、引用证据、订阅和简报任务',
    'cases': ['来源可信度降级', '重复新闻合并', '极端天气阈值', '事实核查冲突', '本地事件误报', '引用链接失效', '简报时效控制', '舆情峰值解释'],
    'artifacts': ['来源评分器', '事件合并流', '核查证据包', '预警分发器', '简报审阅单', '舆情追踪线'],
  },
  'social': {
    'forms': ['社群运营助手', '评论处置队列', '内容同步服务', '粉丝关系台账', '表情素材管理器', '互动增长实验器', '消息聚合工具', '共同观看房'],
    'objects': '账号、粉丝、评论、消息、内容、社群规则、素材和互动事件',
    'cases': ['跨平台同步失败', '评论优先级误判', '粉丝标签漂移', '敏感词申诉处理', '消息重复提醒', '素材版权备注', '增长实验污染', '共同观看掉线重连'],
    'artifacts': ['处置队列', '同步补偿器', '粉丝分层簿', '申诉复核单', '消息去重器', '实验隔离器'],
  },
  'travel': {
    'forms': ['行程编排助手', '机酒价格追踪器', '签证材料核验器', '路线优化工具', '旅行预算管家', '天气风险提醒器', '多人协作计划器', '本地活动发现器'],
    'objects': '行程、航班、酒店、预算、签证材料、天气、路线、成员和收藏地点',
    'cases': ['航班延误重排', '多人偏好冲突', '预算超支预警', '签证材料缺失', '天气风险改线', '酒店取消政策差异', '路线绕路修正', '本地活动时间冲突'],
    'artifacts': ['行程重排器', '材料核验单', '预算偏差簿', '路线冲突解算器', '风险改线包', '协作确认流'],
  },
}

GENERIC_INTENTS = [
  '异常排查', '流程编排', '风控校验', '决策演练', '验收驱动', '运营诊断',
  '成本压测', '自动巡检', '合规留痕', '协作交接', '边界场景修复', '本地优先MVP',
]

BUG_CHALLENGES = [
  '处理重复提交、离线恢复和乐观更新回滚',
  '处理分页加载、筛选条件串联和空结果解释',
  '处理导入脏数据、字段缺失和批量校验失败',
  '处理时区换算、过期状态和定时提醒偏差',
  '处理接口限流、重试退避和幂等写入',
  '处理权限分层、误操作撤销和操作审计',
  '处理缓存过期、并发编辑和冲突合并',
  '处理导出失败、文件命名和历史版本追溯',
]

FLOW_STEPS = [
  '采集或录入对象', '校验关键字段', '识别异常与冲突', '给出下一步建议',
  '生成可复核记录', '支持导出或继续跟进',
]

NAME_ACTIONS = [
  '取证', '复核', '巡检', '排障', '编排', '核算', '调度', '回滚', '分流', '归因',
  '稽核', '重排', '验收', '追踪', '预警', '校准', '清洗', '补偿', '对账', '压测',
]

NAME_SUFFIXES = [
  '台', '器', '流', '册', '簿', '舱', '站', '助手', '管线', '工作台',
  '处理器', '复盘器', '审计台', '校验器', '调度器', '诊断器', '沙盘', '清单',
]

NAME_SCOPES = [
  '本地', '离线', '多人', '跨端', '批量', '轻量', '自动', '人工复核',
  '灰度', '夜间', '高频', '低成本', '应急', '长期跟踪', '运营侧', '交付前',
]

NAME_OUTCOMES = [
  '闭环', '证据链', '风险单', '决策包', '修复流', '验收单', '交接包', '回放',
  '兜底策略', '异常队列', '审计线', '复盘包', '分层规则', '补救路径',
]

NAME_MICRO_CONTEXTS = [
  '首单', '复购', '退款前', '导入后', '跨店', '跨区', '夜间', '节假日', '审批中',
  '交付前', '上架前', '结算前', '复核后', '多人协作', '批量导入', '历史回填',
  '低频', '高频', '新手', '老客', '临期', '超预算', '断点续传', '弱网',
  '离线', '灰度', '回滚前', '申诉中', '预售期', '高峰期', '试运营', '归档前',
  '复盘期', '迁移期', '换季', '月末', '周报前', '权限变更后', '版本升级后', '空结果',
]

NAME_DATA_CONDITIONS = [
  '脏数据', '缺字段', '重复记录', '延迟回调', '超时任务', '冲突编辑', '失效链接',
  '过期规则', '错误标签', '重复提醒', '限流接口', '导出失败', '缓存旧值', '时区偏差',
  '口径不一', '金额偏差', '状态漂移', '样本过少', '批次混乱', '权限错配',
]

AUDIENCE_REPLACEMENTS = {
  '用户': '',
  '消费者': '',
  '店主': '店铺',
  '卖家': '卖家',
  '采购员': '采购',
  '运营': '运营',
}

FORBIDDEN_NAME_TERMS = ['数据看板', '看板', '界面', '全栈应用', '界面应用']
TEXT_REPLACEMENTS = {
  '数据看板型': '指标诊断型',
  '管理看板型': '运营诊断型',
  '界面质感型': '交互质感型',
  '数据看板': '指标诊断',
  '创作者指标诊断': '创作者表现诊断',
  '看板': '诊断台',
  '界面应用': '流程工具',
  '全栈应用': '本地应用',
  '界面': '交互流程',
}


def load_json(path):
  with path.open(encoding='utf-8') as file:
    return json.load(file)


def write_json(path, data):
  with path.open('w', encoding='utf-8') as file:
    json.dump(data, file, ensure_ascii=False, indent=2)
    file.write('\n')


def pick(items, seed):
  return items[seed % len(items)]


def completed_prompt_ids(state):
  return {
    prompt_id
    for prompt_id, info in state.get('completed', {}).items()
    if isinstance(info, dict) and info.get('completed')
  }


def clean_name(text):
  result = str(text or '').strip()
  for old, new in TEXT_REPLACEMENTS.items():
    result = result.replace(old, new)
  for term in FORBIDDEN_NAME_TERMS:
    result = result.replace(term, '')
  return result.strip(' -_·')


def sanitize_text(text):
  result = str(text)
  for old, new in TEXT_REPLACEMENTS.items():
    result = result.replace(old, new)
  return result


def sanitize_value(value):
  if isinstance(value, str):
    return sanitize_text(value)
  if isinstance(value, list):
    return [sanitize_value(item) for item in value]
  if isinstance(value, dict):
    return {key: sanitize_value(item) for key, item in value.items()}
  return value


def sanitize_record(item, skip_keys):
  for key in list(item.keys()):
    if key in skip_keys:
      continue
    item[key] = sanitize_value(item[key])


def unique_name(base, used, order):
  name = clean_name(base)
  if name and name not in used:
    used.add(name)
    return name
  suffix = 1
  while True:
    candidate = (
      f'{pick(NAME_MICRO_CONTEXTS, order + suffix)}'
      f'{name or pick(NAME_DATA_CONDITIONS, order + suffix)}'
      f'{pick(NAME_ACTIONS, order + suffix)}'
      f'{pick(NAME_SUFFIXES, order + suffix)}'
    )
    if candidate not in used:
      used.add(candidate)
      return candidate
    suffix += 1


def compact_audience(text):
  result = clean_name(text)
  for old, new in AUDIENCE_REPLACEMENTS.items():
    result = result.replace(old, new)
  return result or '业务'


def build_business_context(item):
  domain = item.get('business_domain') or 'shopping'
  kit = DOMAIN_KITS.get(domain, DOMAIN_KITS['shopping'])
  order = int(item.get('global_order') or 0)
  caps = item.get('capability_bundle') or []
  cap_a = caps[0] if caps else item.get('scenario', '核心流程')
  cap_b = caps[1] if len(caps) > 1 else pick(kit['cases'], order + 1)
  case = pick(kit['cases'], order + len(str(item.get('id', ''))))
  artifact = pick(kit['artifacts'], order // 3)
  form = pick(kit['forms'], order + len(caps))
  bug = pick(BUG_CHALLENGES, order + len(item.get('target_user', '')))
  intent = pick(GENERIC_INTENTS, order + len(item.get('scenario', '')))
  flow = pick(FLOW_STEPS, order)
  return {
    'kit': kit,
    'form': form,
    'case': case,
    'artifact': artifact,
    'bug': bug,
    'intent': intent,
    'cap_a': cap_a,
    'cap_b': cap_b,
    'flow': flow,
  }


def build_name(item, context, used):
  order = int(item.get('global_order') or 0)
  user = compact_audience(item.get('target_user', ''))
  scenario = clean_name(item.get('scenario', '核心场景'))
  case = clean_name(context['case'])
  artifact = clean_name(context['artifact'])
  cap = clean_name(context['cap_a'])
  action = pick(NAME_ACTIONS, order + len(scenario))
  suffix = pick(NAME_SUFFIXES, order + len(user))
  scope = pick(NAME_SCOPES, order + len(case))
  outcome = pick(NAME_OUTCOMES, order + len(artifact))
  micro = pick(NAME_MICRO_CONTEXTS, order + len(cap))
  condition = pick(NAME_DATA_CONDITIONS, order + len(user) + len(case))
  form = clean_name(context['form'])
  patterns = [
    f'{micro}{case}{action}{suffix}',
    f'{scenario}{condition}{outcome}',
    f'{scope}{cap}{suffix}',
    f'{user}{micro}{outcome}',
    f'{artifact}{condition}工作台',
    f'{form}{case}版',
    f'{scope}{scenario}{action}流',
    f'{condition}{case}{artifact}',
    f'{cap}{micro}{outcome}',
    f'{user}{scenario}{suffix}',
    f'{scope}{artifact}{condition}',
    f'{scenario}{case}{suffix}',
  ]
  base = patterns[order % len(patterns)]
  return unique_name(base, used, item.get('global_order', 0))


def build_features(item, context):
  scenario = item.get('scenario', '核心场景')
  return [
    f"{scenario}对象录入与批量导入",
    f"{context['case']}异常识别",
    f"{context['cap_a']}执行模块",
    f"{context['cap_b']}复核模块",
    '冲突处理与操作留痕',
    '本地 mock 数据、导出和 README',
  ]


def build_prompt(item, context):
  name = item['name']
  user = item.get('target_user', '目标用户')
  scenario = item.get('scenario', '核心场景')
  caps = '、'.join(item.get('capability_bundle') or [context['cap_a'], context['cap_b']])
  objects = context['kit']['objects']
  flow = ' -> '.join(FLOW_STEPS)
  return (
    f"{name}先做一个本地可运行版本，服务对象是{user}，用于处理{scenario}里的真实业务阻塞。\n\n"
    f"业务对象围绕{objects}。不要只做静态展示，核心流程要覆盖{flow}，并且让{caps}在流程中产生明确结果。\n\n"
    f"复杂场景必须落进去：{context['case']}。工程侧同时处理一个常见项目难题：{context['bug']}。"
    f"需要能看到异常原因、处理建议、人工确认入口、历史记录和导出结果。\n\n"
    f"先用 mock 数据实现，但数据结构要方便替换真实接口。至少准备正常、边界、冲突、失败四组样例，"
    f"并在 README 写清本地启动、主要文件、测试方式和后续接真实服务的位置。"
  )


def refine_candidate(item, context):
  item['name'] = context['name']
  item['product_form'] = context['form']
  item['core_pain_point'] = (
    f"{item.get('target_user')}在{item.get('scenario')}中经常遇到{context['case']}，"
    f"需要把{context['cap_a']}、{context['cap_b']}和人工复核串成可追溯流程"
  )
  item['differentiation'] = (
    f"围绕{context['case']}设计，不停留在信息展示，重点处理冲突、失败重试、证据留痕和下一步动作"
  )
  item['domain_object'] = context['kit']['objects']
  item['mvp_features'] = build_features(item, context)
  item['pages'] = ['任务入口', '对象清单', '处理详情', '规则配置', '历史记录', '导出结果']
  item['data_models'] = ['Actor', 'DomainObject', 'Rule', 'Finding', 'ActionLog', 'ExportJob']
  item['business_complexity'] = {
    'real_world_case': context['case'],
    'engineering_challenge': context['bug'],
    'primary_flow': FLOW_STEPS,
    'acceptance_focus': ['异常可解释', '冲突可处理', '操作可追溯', '结果可导出'],
  }


def refine_prompt(item, context):
  item['name'] = context['name']
  item['product_form'] = context['form']
  item['prompt_intent'] = context['intent']
  parts = [item.get('prompt_persona', ''), item.get('prompt_subtone', ''), item.get('prompt_intent', ''), item.get('prompt_detail', '')]
  item['prompt_tone_id'] = '-'.join(part for part in parts if part)
  item['prompt'] = build_prompt(item, context)


def main():
  prompts = load_json(PROMPTS_FILE)
  candidates = load_json(CANDIDATES_FILE)
  state = load_json(STATE_FILE)
  done_prompts = completed_prompt_ids(state)
  prompt_by_candidate = {item.get('candidate_id'): item for item in prompts}
  done_candidates = {item.get('candidate_id') for item in prompts if item.get('id') in done_prompts}

  used_names = set()
  for item in prompts:
    if item.get('id') in done_prompts:
      used_names.add(item.get('name', ''))

  contexts = {}
  for item in prompts:
    if item.get('id') in done_prompts:
      continue
    sanitize_record(item, {'id', 'candidate_id'})
    context = build_business_context(item)
    context['name'] = build_name(item, context, used_names)
    contexts[item.get('candidate_id')] = context
    refine_prompt(item, context)

  for item in candidates:
    candidate_id = item.get('id')
    if candidate_id in done_candidates:
      continue
    sanitize_record(item, {'id', 'source_atom_ids'})
    context = contexts.get(candidate_id)
    if not context:
      source_prompt = prompt_by_candidate.get(candidate_id, item)
      context = build_business_context(source_prompt)
      context['name'] = build_name(item, context, used_names)
    refine_candidate(item, context)

  write_json(PROMPTS_FILE, prompts)
  write_json(CANDIDATES_FILE, candidates)

  name_counts = Counter(item.get('name', '') for item in prompts)
  completed_names_with_legacy_terms = {
    term: sum(term in item.get('name', '') for item in prompts if item.get('id') in done_prompts)
    for term in FORBIDDEN_NAME_TERMS
  }
  report = {
    'total_prompts': len(prompts),
    'completed_preserved': len(done_prompts),
    'prompts_refined': len(prompts) - len(done_prompts),
    'candidates_refined': len(candidates) - len(done_candidates),
    'duplicate_prompt_names_after': sum(1 for count in name_counts.values() if count > 1),
    'forbidden_name_terms_after_uncompleted': {
      term: sum(term in item.get('name', '') for item in prompts)
      - completed_names_with_legacy_terms[term]
      for term in FORBIDDEN_NAME_TERMS
    },
    'completed_names_with_legacy_terms_preserved': completed_names_with_legacy_terms,
    'product_form_top_after': Counter(item.get('product_form', '') for item in prompts).most_common(20),
    'prompt_intent_top_after': Counter(item.get('prompt_intent', '') for item in prompts).most_common(20),
    'completed_prompt_ids': sorted(done_prompts),
  }
  write_json(REPORT_FILE, report)
  print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
  main()
