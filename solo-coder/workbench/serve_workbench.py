#!/usr/bin/env python3
import base64
import concurrent.futures
import datetime
import glob
import hashlib
import json
import fnmatch
import os
import re
import shlex
import shutil
import sqlite3
import subprocess
import sys
import threading
import time
import traceback
import urllib.error
import urllib.request
try:
  from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
except ImportError:
  from http.server import HTTPServer, SimpleHTTPRequestHandler
  from socketserver import ThreadingMixIn

  class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
from urllib.parse import parse_qs, quote, unquote, urlparse


def _expand_local_path(value: str) -> str:
  return os.path.abspath(os.path.expandvars(os.path.expanduser(str(value or '').strip())))


def _env_path(name: str) -> str:
  value = os.environ.get(name)
  return _expand_local_path(value) if value else ''


def _default_trae_root() -> str:
  configured = _env_path('TRAE_ROOT')
  if configured:
    return configured
  home = os.path.expanduser('~')
  documents = os.path.join(home, 'Documents')
  base = documents if os.path.isdir(documents) or sys.platform == 'darwin' or os.name == 'nt' else home
  return os.path.join(base, 'trae_projects')


def _default_trae_app_support_dir() -> str:
  configured = _env_path('TRAE_APP_SUPPORT_DIR') or _env_path('TRAE_SUPPORT_DIR')
  if configured:
    return configured
  home = os.path.expanduser('~')
  if sys.platform == 'darwin':
    return os.path.join(home, 'Library', 'Application Support', 'Trae CN')
  if os.name == 'nt':
    appdata = os.environ.get('APPDATA') or os.path.join(home, 'AppData', 'Roaming')
    return os.path.join(appdata, 'Trae CN')
  xdg_config = os.environ.get('XDG_CONFIG_HOME') or os.path.join(home, '.config')
  return os.path.join(xdg_config, 'Trae CN')


def _candidate_trae_cli_paths():
  yielded = set()

  def _yield(path):
    text = _expand_local_path(path) if path else ''
    if text and text not in yielded:
      yielded.add(text)
      yield text

  for binary in ('trae-cn', 'trae'):
    found = shutil.which(binary)
    if found:
      yield from _yield(found)

  if sys.platform == 'darwin':
    yield from _yield('/Applications/Trae CN.app/Contents/Resources/app/bin/trae-cn')
    yield from _yield('/Applications/Trae.app/Contents/Resources/app/bin/trae')
  elif os.name == 'nt':
    roots = [
      os.environ.get('LOCALAPPDATA'),
      os.environ.get('ProgramFiles'),
      os.environ.get('ProgramFiles(x86)'),
    ]
    for root in roots:
      if not root:
        continue
      for rel in (
        os.path.join('Programs', 'Trae CN', 'Trae CN.exe'),
        os.path.join('Programs', 'Trae CN', 'trae-cn.exe'),
        os.path.join('Programs', 'Trae', 'Trae.exe'),
        os.path.join('Programs', 'Trae', 'trae.exe'),
        os.path.join('Trae CN', 'Trae CN.exe'),
        os.path.join('Trae CN', 'trae-cn.exe'),
        os.path.join('Trae', 'Trae.exe'),
        os.path.join('Trae', 'trae.exe'),
      ):
        yield from _yield(os.path.join(root, rel))


def _default_trae_cli() -> str:
  configured = _env_path('TRAE_CLI')
  if configured:
    return configured
  for path in _candidate_trae_cli_paths():
    if os.path.isfile(path):
      return path
  return ''


def _candidate_codex_cli_paths():
  yielded = set()

  def _add(path):
    text = _expand_local_path(path) if path else ''
    if text and text not in yielded:
      yielded.add(text)
      return text
    return ''

  for name in ('CODEX_CLI', 'CODEX_CLI_PATH'):
    configured = _env_path(name)
    if configured:
      value = _add(configured)
      if value:
        yield value

  found = shutil.which('codex')
  if found:
    value = _add(found)
    if value:
      yield value

  home = os.path.expanduser('~')
  patterns = [
    os.path.join(home, '.nvm', 'versions', 'node', '*', 'bin', 'codex'),
    os.path.join(home, '.npm-global', 'bin', 'codex'),
    os.path.join(home, '.local', 'bin', 'codex'),
    '/opt/homebrew/bin/codex',
    '/usr/local/bin/codex',
  ]
  if os.name == 'nt':
    appdata = os.environ.get('APPDATA') or os.path.join(home, 'AppData', 'Roaming')
    patterns.extend([
      os.path.join(appdata, 'npm', 'codex.cmd'),
      os.path.join(appdata, 'npm', 'codex.ps1'),
      os.path.join(appdata, 'npm', 'codex'),
    ])
  for pattern in patterns:
    for path in glob.glob(pattern):
      value = _add(path)
      if value:
        yield value


def codex_cli_path() -> str:
  for path in _candidate_codex_cli_paths():
    if os.path.isfile(path) and os.access(path, os.X_OK):
      return path
  return ''


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(ROOT_DIR, '../..'))


def _strip_env_value(value: str) -> str:
  text = str(value or '').strip()
  if len(text) >= 2 and text[0] == text[-1] and text[0] in {'"', "'"}:
    text = text[1:-1]
  return text


def load_env_file(path: str, override: bool = False, protected_keys=None) -> int:
  if not path or not os.path.isfile(path):
    return 0
  protected = protected_keys or set()
  loaded = 0
  try:
    with open(path, 'r', encoding='utf-8') as file:
      lines = file.readlines()
  except OSError:
    return 0
  for raw_line in lines:
    line = raw_line.strip()
    if not line or line.startswith('#'):
      continue
    if line.startswith('export '):
      line = line[len('export '):].strip()
    if '=' not in line:
      continue
    key, value = line.split('=', 1)
    key = key.strip()
    if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', key or ''):
      continue
    if key in protected:
      continue
    if key in os.environ and not override:
      continue
    os.environ[key] = _strip_env_value(value)
    loaded += 1
  return loaded


def _split_env_file_list(value: str):
  if not value:
    return []
  paths = []
  for part in str(value).split(os.pathsep):
    text = part.strip()
    if text:
      paths.append(_expand_local_path(text))
  return paths


def load_workbench_env_files():
  protected_keys = set(os.environ.keys())
  explicit_env_files = []
  for name in ('WORKBENCH_ENV_FILE', 'YMQS_ENV_FILE'):
    explicit_env_files.extend(_split_env_file_list(os.environ.get(name) or ''))

  loaded_paths = set()
  for path in (
    os.path.join(PROJECT_DIR, '.env'),
    os.path.join(ROOT_DIR, '.env'),
    os.path.join(PROJECT_DIR, '.env.local'),
    os.path.join(ROOT_DIR, '.env.local'),
    *explicit_env_files,
  ):
    normalized = os.path.normcase(os.path.abspath(path))
    if normalized in loaded_paths:
      continue
    loaded_paths.add(normalized)
    load_env_file(path, override=True, protected_keys=protected_keys)


load_workbench_env_files()

PROJECT_DATA_DIR = os.path.join(PROJECT_DIR, 'data')
DOCS_DATA_DIR = os.path.join(PROJECT_DIR, 'docs', 'data')


def _data_dir_has_prompt_seed(data_dir: str) -> bool:
  generated_dir = os.path.join(data_dir, 'generated')
  return (
    os.path.isfile(os.path.join(generated_dir, 'generation_prompts.json'))
    and os.path.isfile(os.path.join(generated_dir, 'prompt_state.json'))
  )


def _default_data_dir() -> str:
  configured = _env_path('WORKBENCH_DATA_DIR') or _env_path('YMQS_DATA_DIR')
  if configured:
    return configured
  return PROJECT_DATA_DIR


DATA_DIR = _default_data_dir()
STATE_FILE = os.path.join(DATA_DIR, 'generated', 'prompt_state.json')
PROMPTS_FILE = os.path.join(DATA_DIR, 'generated', 'generation_prompts.json')
TRAE_SESSION_CACHE_DIR = os.path.join(DATA_DIR, 'generated', 'trae_session_rounds')
FEISHU_SCREENSHOT_PASTE_DIR = os.path.join(DATA_DIR, 'generated', 'feishu_screenshot_paste')
FEISHU_PASTE_LOCK = threading.RLock()
TRAE_ROOT = _default_trae_root()
TRAE_APP_SUPPORT_DIR = _default_trae_app_support_dir()
TRAE_WORKSPACE_STORAGE_DIR = _env_path('TRAE_WORKSPACE_STORAGE_DIR') or os.path.join(TRAE_APP_SUPPORT_DIR, 'User', 'workspaceStorage')
TRAE_APP_NAME = os.environ.get('TRAE_APP_NAME') or 'Trae CN'
TRAE_CLI = _default_trae_cli()
TRAE_LOG_SCAN_LIMIT = 128
TRAE_REFRESH_LOG_SCAN_LIMIT = 24
TRAE_LOG_TAIL_BYTES = 8 * 1024 * 1024
TRAE_REFRESH_LOG_TAIL_BYTES = 1024 * 1024
TRAE_REFRESH_TIMEOUT_SECONDS = 12
TRAE_DEEP_REFRESH_TIMEOUT_SECONDS = 120
TRAE_REFRESH_TASK_TTL_SECONDS = 180
TRAE_DEEP_REFRESH_TASK_TTL_SECONDS = 420
TRAE_RG_CHAT_TIMEOUT_SECONDS = 4
TRAE_RG_SESSION_TIMEOUT_SECONDS = 45
TRAE_RECONSTRUCTED_LOG_TRACE_PREFIX = '[reconstructed: true]'
TRAE_UNAVAILABLE_LOG_TRACE_PREFIX = '[reconstructed: unavailable]'
TRAE_RECONSTRUCTED_LOG_TRACE_VERSION = '20260509_v13_trace_time_locator'
TRAE_RECONSTRUCTED_LOG_MAX_EVENTS = 220
TRAE_RECONSTRUCTED_LOG_MAX_CHARS = 50000
TRAE_RECONSTRUCTED_LOG_WINDOW_BEFORE_MINUTES = 15
TRAE_RECONSTRUCTED_LOG_WINDOW_AFTER_MINUTES = 240
TRAE_RECONSTRUCTED_LOG_TOOL_ID_LIMIT = 120
TRAE_OFFICIAL_COPY_TEXT_MAX_CHARS = 80000
TRAE_LOG_TRACE_NOT_FOUND_SOURCE = 'not-found-real-file'
TRAE_LOG_TRACE_NOT_FOUND_REASON = 'official_copied_text_not_found_in_local_storage'
TRAE_REFRESH_MAX_WORKERS = 3
TRAE_REFRESH_EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=TRAE_REFRESH_MAX_WORKERS)
TRAE_REFRESH_TASKS = {}
TRAE_REFRESH_TASKS_LOCK = threading.Lock()
DEFAULT_GITHUB_REPO_URL = os.environ.get('YIMIANQIANSHI_GITHUB_REPO_URL') or 'git@github.com:ccpen199/yimianqianshi-solo.git'
GITHUB_MIRROR_ROOT = os.path.join(TRAE_ROOT, '_github_sync_mirrors')
SYNC_EXCLUDES = [
  '.git/',
  'node_modules/',
  '.next/',
  '.nuxt/',
  'dist/',
  'build/',
  'coverage/',
  '.cache/',
  '.turbo/',
  '.vite/',
  '.DS_Store',
  '*.log',
  '.env',
  '.env.*',
]
SYNC_EXCLUDED_DIR_NAMES = {'node_modules', '.next', '.nuxt', 'dist', 'build', 'coverage', '.cache', '.turbo', '.vite'}
SYNC_EXCLUDED_FILE_NAMES = {'.DS_Store'}
SYNC_EXCLUDED_FILE_PATTERNS = {'*.log', '.env', '.env.*'}
DEFAULT_FEISHU_TASK_URL = 'https://bcnrsnl3m9wk.feishu.cn/app/P4E0bo0tPaPybqsgyStczUahnvc?pageId=pgeidcHHGbeMEfhP'
SCENE_PREFIX = {
  'shopping': 'g',
  'social': 's',
  'entertainment': 'yl',
  'travel': 'l',
  'game': 'yx',
  'health': 'jk',
  'home': 'jj',
  'news_weather': 'xw',
  'art_design': 'ys',
  'fun_leisure': 'qx',
  'local_projects': 'xm',
}
SCENE_NAME_ALIASES = {
  '购物': 'shopping',
  '社交': 'social',
  '娱乐': 'entertainment',
  '旅游': 'travel',
  '游戏': 'game',
  '健康': 'health',
  '家居': 'home',
  '新闻与天气': 'news_weather',
  '艺术与设计': 'art_design',
  '趣味休闲': 'fun_leisure',
  '本机项目': 'local_projects',
}
MODELSCOPE_API_BASE = os.environ.get('MODELSCOPE_API_BASE') or 'https://api-inference.modelscope.cn/v1'
MODELSCOPE_CHAT_COMPLETIONS_URL = MODELSCOPE_API_BASE.rstrip('/') + '/chat/completions'
MODELSCOPE_API_KEY = os.environ.get('MODELSCOPE_API_KEY') or ''
MODELSCOPE_TEXT_MODEL = os.environ.get('MODELSCOPE_TEXT_MODEL') or 'Qwen/Qwen3-235B-A22B-Instruct-2507'
DEEPSEEK_API_BASE = os.environ.get('DEEPSEEK_API_BASE') or 'https://api.deepseek.com'
DEEPSEEK_CHAT_COMPLETIONS_URL = DEEPSEEK_API_BASE.rstrip('/') + '/chat/completions'
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY') or ''
DEEPSEEK_TEXT_MODEL = os.environ.get('DEEPSEEK_TEXT_MODEL') or 'deepseek-v4-pro'
CODEX_DEEPSEEK_WIRE_API = os.environ.get('CODEX_DEEPSEEK_WIRE_API') or 'chat'
TRAE_SESSION_ANNOTATION_MODELS = [
  model.strip()
  for model in (
    os.environ.get('TRAE_SESSION_ANNOTATION_MODELS')
    or os.environ.get('TRAE_SESSION_ANNOTATION_MODEL')
    or DEEPSEEK_TEXT_MODEL
  ).split(',')
  if model.strip()
]
TRAE_SESSION_ANNOTATION_PROVIDER = os.environ.get('TRAE_SESSION_ANNOTATION_PROVIDER') or 'deepseek'
TRAE_SESSION_ANNOTATION_PROMPT_VERSION = '20260512_v11_llm_dual_axis'
TRAE_SESSION_ANNOTATION_TIMEOUT_SECONDS = 45
TRAE_SESSION_ANNOTATION_MAX_CONVERSATION_CHARS = 2400
RG_CANDIDATES = [
  shutil.which('rg'),
  '/opt/homebrew/bin/rg',
  '/usr/local/bin/rg',
  '/usr/bin/rg',
  '/Users/chen/.nvm/versions/node/v22.22.0/lib/node_modules/@openai/codex/node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/path/rg',
]


def rg_binary():
  for candidate in RG_CANDIDATES:
    if candidate and os.path.exists(candidate) and os.access(candidate, os.X_OK):
      return candidate
  return ''


def read_json(path: str, fallback):
  try:
    with open(path, 'r', encoding='utf-8') as file:
      return json.load(file)
  except FileNotFoundError:
    return fallback
  except (json.JSONDecodeError, UnicodeDecodeError) as exc:
    corrupt_path = f'{path}.corrupt-{time.strftime("%Y%m%d-%H%M%S")}'
    try:
      shutil.copy2(path, corrupt_path)
      print(f'[WARN] JSON state unreadable, backed up to {corrupt_path}: {exc}', file=sys.stderr)
    except Exception as backup_exc:
      print(f'[WARN] JSON state unreadable and backup failed for {path}: {backup_exc}; original error: {exc}', file=sys.stderr)
    return fallback


def write_json(path: str, payload):
  os.makedirs(os.path.dirname(path), exist_ok=True)
  tmp = f'{path}.tmp'
  with open(tmp, 'w', encoding='utf-8') as file:
    json.dump(payload, file, ensure_ascii=False, indent=2)
    file.write('\n')
  os.replace(tmp, path)


def ensure_local_data_files():
  os.makedirs(os.path.join(DATA_DIR, 'generated'), exist_ok=True)
  if os.path.abspath(DATA_DIR) == os.path.abspath(DOCS_DATA_DIR):
    return
  seed_generated_dir = os.path.join(DOCS_DATA_DIR, 'generated')
  for filename, fallback_payload in (
    ('generation_prompts.json', []),
    ('prompt_state.json', {'completed': {}, 'orders': {}, 'trae_groups': {}}),
  ):
    target = os.path.join(DATA_DIR, 'generated', filename)
    if os.path.exists(target):
      continue
    seed = os.path.join(seed_generated_dir, filename)
    if os.path.isfile(seed):
      shutil.copy2(seed, target)
    else:
      write_json(target, fallback_payload)


def safe_segment(value: str) -> str:
  value = str(value or '').strip()
  value = re.sub(r'[\\/:*?"<>|\s]+', '_', value)
  value = value.strip('._')
  return value or '未分类'


def scene_segment(value: str) -> str:
  key = str(value or '').strip()
  if key in SCENE_PREFIX:
    return key
  return SCENE_NAME_ALIASES.get(key, safe_segment(value))


def migrate_legacy_scene_dirs():
  for legacy, canonical in SCENE_NAME_ALIASES.items():
    legacy_dir = os.path.join(TRAE_ROOT, legacy)
    canonical_dir = os.path.join(TRAE_ROOT, canonical)
    if os.path.isdir(legacy_dir) and not os.path.exists(canonical_dir):
      os.rename(legacy_dir, canonical_dir)


def load_prompts():
  prompts = read_json(PROMPTS_FILE, [])
  return prompts if isinstance(prompts, list) else []


def default_order_token(prompt):
  if str(prompt.get('id') or '').startswith('prd_300_may_'):
    return f"may-{prompt.get('global_order')}"
  scene = scene_segment(prompt.get('business_domain'))
  return f"{SCENE_PREFIX.get(scene, 'x')}-{prompt.get('global_order')}"


def normalize_order_token(prompt, order_value):
  scene = scene_segment(prompt.get('business_domain'))
  prefix = 'may' if str(prompt.get('id') or '').startswith('prd_300_may_') else SCENE_PREFIX.get(scene, 'x')
  if order_value is None:
    return default_order_token(prompt)
  if isinstance(order_value, int):
    return f'{prefix}-{order_value}'

  text = str(order_value).strip()
  if not text:
    return default_order_token(prompt)
  if re.fullmatch(r'\d+', text):
    return f'{prefix}-{int(text)}'
  match = re.fullmatch(r'([A-Za-z][A-Za-z0-9]*)-(\d+)', text)
  if match:
    return f'{match.group(1).lower()}-{int(match.group(2))}'
  return text


def extract_order_number(order_value):
  text = str(order_value or '').strip()
  if re.fullmatch(r'\d+', text):
    return int(text)
  match = re.fullmatch(r'[A-Za-z][A-Za-z0-9]*-(\d+)', text)
  if match:
    return int(match.group(1))
  return None


def image_extension_from_mime(mime_type: str) -> str:
  normalized = str(mime_type or '').split(';', 1)[0].strip().lower()
  return {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  }.get(normalized, '.png')


def safe_image_filename(filename: str, mime_type: str) -> str:
  base = os.path.basename(str(filename or '').strip())
  base = re.sub(r'[\\/:*?"<>|\s]+', '_', base).strip('._')
  ext = os.path.splitext(base)[1].lower()
  allowed = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'}
  if not base or ext not in allowed:
    base = f'map_{time.strftime("%Y%m%d_%H%M%S")}{image_extension_from_mime(mime_type)}'
  return base


def _single_line_text(value: str, limit: int = 36) -> str:
  text = re.sub(r'\s+', ' ', str(value or '').strip())
  if limit and len(text) > limit:
    return f"{text[:max(limit - 3, 0)].rstrip()}..."
  return text


def _annotation_row_hash(row: dict, reason_conversation: str = None) -> str:
  raw = '\n'.join([
    TRAE_SESSION_ANNOTATION_PROMPT_VERSION,
    str(reason_conversation if reason_conversation is not None else (row or {}).get('conversation') or ''),
  ])
  return hashlib.sha1(raw.encode('utf-8')).hexdigest()


def _normalize_dissatisfaction_reason(value: str) -> str:
  text = _single_line_text(value, limit=320)
  text = re.sub(r'^不满意原因[:：]?\s*', '', text)
  text = re.sub(r'^(用户|客户)(表示|提出|认为|觉得|反馈|抱怨|指出|说)?[:：]?\s*', '', text)
  text = re.sub(r'(用户|客户)(表示|提出|认为|觉得|反馈|抱怨|指出|说|要求|强调|再次强调)?', '', text)
  text = re.sub(r'(抱怨|反馈)', '', text)
  text = re.sub(r'未见新的?具体?(页面|功能)?缺陷?', '', text)
  text = re.sub(r'暂无明确的?新的?(页面|功能)?缺陷?', '', text)
  text = re.sub(r'暂无下一轮确认|暂无下一轮|下一轮确认|下一轮反馈', '', text)
  text = re.sub(r'当前诉求集中在|当前诉求是|主要问题转为', '', text)
  text = re.sub(r'(第[一二三四五六七八九十0-9]+轮|最后一轮)[，,。；;:\s]*(请|麻烦|继续|务必).*$' , '', text)
  text = re.sub(r'(请|麻烦)(继续|尽快|直接|优先)?(完成|修复|处理|解决|保证|注意).*$' , '', text)
  text = re.sub(r'\s+', ' ', text).strip(' ，,。；;：:')
  if text in {'无', '暂无', '无明显不满意反馈', '无明显问题', '未发现明显不满意反馈', '暂无明显不满意', '产物不满意', '过程不满意'}:
    text = ''
  return text


def _terminal_round_dissatisfaction_reason(row: dict) -> str:
  current = str((row or {}).get('conversation') or '').strip()
  trace = str((row or {}).get('logTrace') or '').strip()
  screenshots = row.get('screenshots') if isinstance(row, dict) else []
  has_trace = bool(trace and not trace.startswith('未找到真实日志轨迹'))
  has_start = bool(re.search(r'启动|端口|localhost|http://|https://|npm run|nohup|uvicorn|vite', trace, re.IGNORECASE))
  has_browser = bool(re.search(r'open_preview|截图|浏览器|Playwright|页面.*验证|点击.*验证', trace, re.IGNORECASE) or screenshots)
  has_api = bool(re.search(r'curl|接口|api/|health|请求', trace, re.IGNORECASE))
  if not has_trace:
    return (
      '产物不满意：当前轮交付缺少可追溯的页面、接口和主流程验收依据，业务功能是否稳定可用无法形成可靠结论。'
      '过程不满意：日志轨迹缺失，无法核对文件修改、启动命令、端口归属、浏览器验收和异常处理闭环。'
    )
  if has_start and has_api and not has_browser:
    return (
      '产物不满意：当前轮交付仍需要用浏览器页面和核心 API 共同确认，主流程可访问性、关键交互和视觉资源加载没有形成完整证据。'
      '过程不满意：日志偏向启动命令和接口请求，缺少页面级点击、刷新、空数据和异常场景验收，不能只用服务已启动替代业务闭环。'
    )
  if has_start and not has_api:
    return (
      '产物不满意：当前轮重点停留在服务启动，业务页面、接口数据和关键操作是否真正打通仍缺少直接证据。'
      '过程不满意：日志缺少核心 API 请求、前后端联通检查和页面操作验收，启动地址打印不能替代主链路验证。'
    )
  if current:
    issue = _conversation_core_issue(current)
    if issue:
      return (
        f'产物不满意：{issue}，该问题仍需要结合当前页面、接口和截图完成闭环确认。'
        '过程不满意：当前轮需要把修复文件、启动状态、复现路径和验收结果串起来，避免只给完成结论而缺少可核对证据。'
      )
  return (
    '产物不满意：当前轮交付还需要围绕页面完整性、核心 API、关键交互和数据一致性做最终验收，业务闭环证据不够充分。'
    '过程不满意：日志需要明确修改范围、启动方式、端口安全、页面操作和失败场景处理，不能只停留在完成说明。'
  )


def _looks_like_detailed_issue(text: str) -> bool:
  value = re.sub(r'\s+', ' ', str(text or '').strip())
  if not value:
    return False
  issue_hits = len(re.findall(r'没|没有|无|不|失败|错误|报错|缺失|不可用|不显示|没显示|无响应|没反应|异常|中断|问题|不能|无法|要求登录|需要登录|强制登录|未登录|404|401|500|CLOSED', value, re.IGNORECASE))
  has_connector = bool(re.search(r'，|,|、|而且|并且|同时|另外|还有|且|也', value))
  has_multiple_nouns = len(re.findall(r'按钮|点击|加入购物车|图片|商品|页面|接口|登录|报错|提示|订单|个人中心|公告|目的地|游客|接单|权限|需求', value)) >= 2
  return issue_hits >= 1 and (has_connector or has_multiple_nouns)


def _conversation_core_issue(conversation: str) -> str:
  text = re.sub(r'\s+', ' ', str(conversation or '').strip())
  if not text:
    return ''
  text = re.sub(r'^(第[一二三四五六七八九十0-9]+轮|最后一轮)[，,。；;:\s]*', '', text)
  text = re.sub(r'^(继续|请|麻烦|帮我)[：:,，\s]*', '', text)
  text = re.sub(r'[，,。；;:\s]*(第[一二三四五六七八九十0-9]+轮|最后一轮)[，,。；;:\s]*(请|麻烦|继续|务必).*$' , '', text).strip()
  text = re.sub(r'[，,。；;:\s]*(请|麻烦)(继续|尽快|直接|优先)?(完成|修复|处理|解决|保证|注意).*$' , '', text).strip()
  candidates = [item.strip(' ，,。；;：:') for item in re.split(r'[\n。！？!?；;]', text) if item.strip()]
  problem_pattern = r'没|不|无|错|错误|问题|不可用|不可达|死循环|失败|太长|卡死|缺失|取消|重复|异常|显示|链路|杂糅|字体'
  for candidate in candidates:
    if not re.search(problem_pattern, candidate):
      continue
    candidate = re.sub(r'^(第[一二三四五六七八九十0-9]+轮|最后一轮)[，,。；;:\s]*', '', candidate).strip()
    candidate = re.sub(r'[，,。；;:\s]*(请|麻烦)(继续|尽快|直接|优先)?(完成|修复|处理|解决|保证|注意).*$' , '', candidate).strip()
    candidate = candidate.strip(' ，,。；;：:')
    if _looks_like_detailed_issue(candidate):
      return _normalize_dissatisfaction_reason(candidate)
    replacements = [
      (r'.*net::ERR_CONNECTION_CLOSED.*', '接口连接中断'),
      (r'.*showToast.*not defined.*', 'showToast未定义'),
      (r'.*ReferenceError.*', '前端脚本报错'),
      (r'.*加入购物车.*没有.*反应.*', '加入购物车无响应'),
      (r'.*点击.*没有.*反应.*', '关键按钮无响应'),
      (r'.*第三方登录.*失败.*', '第三方登录失败'),
      (r'.*微信.*qq.*微博.*失败.*', '第三方登录失败'),
      (r'.*无法输入目的地.*401.*', '目的地输入401错误'),
      (r'.*公告.*无法浏览.*目的地.*无法.*', '公告和目的地不可用'),
      (r'.*未登录.*不能回复消息.*游客.*', '游客模式权限错误'),
      (r'.*游客.*可以接单.*要求登录.*', '需求明确表示游客可以接单，但点击接单后却要求登录'),
      (r'.*个人信息资料失败.*没有提醒.*', '资料完善失败无提示'),
      (r'.*没有按照要求启动项目.*', '项目未按要求启动'),
      (r'.*个人中心.*订单.*优惠.*收藏.*没反应.*', '个人中心入口无响应'),
      (r'.*数据链路.*没做好.*', '数据链路没做好'),
      (r'.*订单数据.*显示.*问题.*', '订单数据显示有问题'),
      (r'.*数据显示.*问题.*', '数据显示有问题'),
      (r'.*页面.*模块.*字体.*杂糅.*', '页面各个模块的字体杂糅在一起了'),
      (r'.*字体.*杂糅.*', '字体杂糅在一起'),
      (r'.*思考.*死循环.*', '陷入思考死循环'),
      (r'.*服务.*不可用.*', '服务不可用'),
      (r'.*运行时间.*太长.*', '运行时间太长'),
      (r'.*没有.*取消.*选项.*', '没有订单取消选项'),
      (r'.*取消.*选项.*', '订单取消选项缺失'),
      (r'.*同一时间.*重复购买.*', '同一时间重复购买'),
      (r'.*重复购买.*', '重复购买'),
    ]
    for pattern, replacement in replacements:
      if re.match(pattern, candidate):
        return replacement
    if len(candidate) <= 18:
      return _normalize_dissatisfaction_reason(candidate)
    if len(candidate) <= 28:
      return _normalize_dissatisfaction_reason(candidate)
    return _normalize_dissatisfaction_reason(candidate[:18])
  return ''


def _fallback_dissatisfaction_reason(conversation: str) -> str:
  text = str(conversation or '').strip()
  core_issue = _conversation_core_issue(text)
  if core_issue:
    return core_issue
  mapping = [
    (r'重复购买|重复下单|同一时间.*重复购买', '同一时间可重复购买'),
    (r'取消.*选项|没有.*取消', '订单取消选项缺失'),
    (r'服务不可用|服务不可达|不可用|打不开', '服务不可用'),
    (r'全景.*没反应|转发.*没反应|按钮.*没反应|无反应', '关键按钮无响应'),
    (r'语法错误|编译错误', '语法或编译错误'),
    (r'没反应|无反应|不生效|按钮|点击', '关键交互无响应'),
    (r'死循环|卡死|思考了一夜', '执行卡死或长时间无结果'),
    (r'数据链路|数据显示|数据.*问题', '数据链路或展示不正确'),
    (r'字体|渲染黑|样式|页面.*黑', '页面样式或渲染异常'),
    (r'慢|性能|一个多小时|超时|运行时间太长', '运行时间过长'),
    (r'不可达|不可用|服务.*异常|服务.*不可达', '服务链路不可用'),
  ]
  for pattern, label in mapping:
    if re.search(pattern, text, re.IGNORECASE):
      return _normalize_dissatisfaction_reason(label)
  return ''


def _fallback_session_annotation(row: dict) -> dict:
  conversation = str((row or {}).get('reasonConversation') or (row or {}).get('conversation') or '')
  return {
    'dissatisfactionReason': _fallback_dissatisfaction_reason(conversation),
    'annotationSource': 'fallback',
  }


def _extract_json_payload(text: str):
  raw = str(text or '').strip()
  if raw.startswith('```'):
    raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.IGNORECASE)
    raw = re.sub(r'\s*```$', '', raw)
  for opening, closing in (('[', ']'), ('{', '}')):
    start = raw.find(opening)
    end = raw.rfind(closing)
    if start == -1 or end <= start:
      continue
    candidate = raw[start:end + 1]
    try:
      return json.loads(candidate)
    except Exception:
      continue
  return json.loads(raw)


def _call_modelscope_chat(messages, model: str = ''):
  if not MODELSCOPE_API_KEY:
    raise RuntimeError('MODELSCOPE_API_KEY is empty')
  payload = json.dumps({
    'model': model or MODELSCOPE_TEXT_MODEL,
    'messages': messages,
    'temperature': 0.1,
    'stream': False,
  }).encode('utf-8')
  request = urllib.request.Request(
    MODELSCOPE_CHAT_COMPLETIONS_URL,
    data=payload,
    headers={
      'Authorization': f'Bearer {MODELSCOPE_API_KEY}',
      'Content-Type': 'application/json',
    },
    method='POST',
  )
  try:
    with urllib.request.urlopen(request, timeout=TRAE_SESSION_ANNOTATION_TIMEOUT_SECONDS) as response:
      body = response.read().decode('utf-8')
  except urllib.error.HTTPError as exc:
    error_body = ''
    try:
      error_body = exc.read().decode('utf-8')
    except Exception:
      error_body = str(exc)
    raise RuntimeError(f'ModelScope HTTP {exc.code}: {error_body}')
  except Exception as exc:
    raise RuntimeError(f'ModelScope request failed: {exc}')
  parsed = json.loads(body or '{}')
  choices = parsed.get('choices') if isinstance(parsed, dict) else None
  if not isinstance(choices, list) or not choices:
    raise RuntimeError(f'ModelScope response missing choices: {body[:400]}')
  message = choices[0].get('message') if isinstance(choices[0], dict) else {}
  content = message.get('content') if isinstance(message, dict) else ''
  if not isinstance(content, str) or not content.strip():
    raise RuntimeError(f'ModelScope response missing content: {body[:400]}')
  return content


def _call_deepseek_chat(messages, model: str = ''):
  if not DEEPSEEK_API_KEY:
    raise RuntimeError('DEEPSEEK_API_KEY is empty')
  payload = json.dumps({
    'model': model or DEEPSEEK_TEXT_MODEL,
    'messages': messages,
    'temperature': 0,
    'stream': False,
    'response_format': {'type': 'json_object'},
  }).encode('utf-8')
  request = urllib.request.Request(
    DEEPSEEK_CHAT_COMPLETIONS_URL,
    data=payload,
    headers={
      'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
      'Content-Type': 'application/json',
    },
    method='POST',
  )
  try:
    with urllib.request.urlopen(request, timeout=TRAE_SESSION_ANNOTATION_TIMEOUT_SECONDS) as response:
      body = response.read().decode('utf-8')
  except urllib.error.HTTPError as exc:
    error_body = ''
    try:
      error_body = exc.read().decode('utf-8')
    except Exception:
      error_body = str(exc)
    raise RuntimeError(f'DeepSeek HTTP {exc.code}: {error_body}')
  except Exception as exc:
    raise RuntimeError(f'DeepSeek request failed: {exc}')
  parsed = json.loads(body or '{}')
  choices = parsed.get('choices') if isinstance(parsed, dict) else None
  if not isinstance(choices, list) or not choices:
    raise RuntimeError(f'DeepSeek response missing choices: {body[:400]}')
  message = choices[0].get('message') if isinstance(choices[0], dict) else {}
  content = message.get('content') if isinstance(message, dict) else ''
  if not isinstance(content, str) or not content.strip():
    raise RuntimeError(f'DeepSeek response missing content: {body[:400]}')
  return content


def _call_annotation_chat(messages, model: str, provider: str = ''):
  provider = str(provider or TRAE_SESSION_ANNOTATION_PROVIDER or '').strip().lower()
  if provider in {'deepseek', 'deepseek-v4', 'deepseek-v4-pro'}:
    return _call_deepseek_chat(messages, model=model)
  if provider in {'modelscope', 'qwen'}:
    return _call_modelscope_chat(messages, model=model)
  if model.startswith('deepseek-'):
    return _call_deepseek_chat(messages, model=model)
  return _call_modelscope_chat(messages, model=model)


def _request_session_annotations(pending_rows, model_config=None):
  row_items = []
  for item in pending_rows:
    index, row = item[0], item[1]
    next_conversation = str(item[2] if len(item) > 2 else '').strip()
    current_conversation = str((row or {}).get('conversation') or '').strip()
    current_trace = str((row or {}).get('logTrace') or '').strip()
    screenshots = row.get('screenshots') if isinstance(row, dict) else []
    row_items.append({
      'index': index,
      'currentConversation': current_conversation[:1200],
      'nextConversation': next_conversation[:TRAE_SESSION_ANNOTATION_MAX_CONVERSATION_CHARS],
      'currentLogTrace': current_trace[:2400],
      'hasScreenshots': bool(screenshots),
    })
  messages = [
    {
      'role': 'system',
      'content': (
        '你是 Trae 产物验收标注助手，输出要像人工质检结论，不要像模型在解释证据是否存在。'
        '每条数据包含 currentConversation、nextConversation、currentLogTrace、hasScreenshots。'
        'nextConversation 是下一轮验收输入，可用于判断上一轮产物缺陷；如果 nextConversation 为空，必须直接根据 currentConversation、currentLogTrace 和截图状态总结当前仍需验收或未闭环的问题。'
        '请只输出 JSON 对象，不要输出解释。'
        '字段要求：dissatisfactionReason 必须是“产物不满意：...。过程不满意：...。”双轴结构。'
        '产物不满意要写页面/接口/模块/按钮/数据/业务规则的具体问题、影响和需求偏差。'
        '过程不满意要写执行过程的问题，例如只验证接口未看页面、启动证据不足、端口归属不清、缺少截图、没有复现路径、反复试错、日志缺失、没有异常场景验收。'
        '禁止出现“暂无”“未见”“暂无下一轮反馈”“没有下一轮反馈”“暂无明确的新功能缺陷反馈”“未见新的具体页面功能缺陷反馈”“当前诉求”“用户要求”“用户再次强调”“用户反馈”“用户指出”等表达。'
        '不要把证据缺失写成“没有反馈”，而要根据已有信息直接判断产物和过程问题。'
        '不要使用“用户”作为叙述主体；需要指代时写“业务要求”“验收要求”“页面表现”“交付过程”。'
        '如果同一句包含多个问题，用“、”“而且”“同时”等连接，不要只抽取第一个问题，也不要压缩成过短标签。'
        '例如原句是“点击加入购物车没有任何反应，也没有报错，而且商品图片没有显示”，产物不满意部分应完整保留为“点击加入购物车没有任何反应，也没有报错，而且商品图片没有显示”，不要写成“加入购物车无响应”。'
        '例如原句是“个人中心点击我的订单、优惠券、行程收藏等都没反应”，产物不满意部分应写成“个人中心我的订单、优惠券、行程收藏等入口均无响应”。'
        '例如原句是“需求一明确表示游客是可以接单的，但是点击接单后却要求登录，理解存在问题”，产物不满意部分应写成“业务要求明确支持游客接单，但点击接单后却要求登录”，不要写成“游客接单权限错误”。'
        '可以去掉“你/我/用户/客户/抱怨/反馈/麻烦继续修复”等话术，但不能丢掉具体故障现象、页面、按钮、报错、缺失项。'
        '返回格式固定为 {"items":[{"index":0,"dissatisfactionReason":"产物不满意：点击加入购物车没有任何反应，也没有报错，而且商品图片没有显示。过程不满意：日志缺少对购物车按钮、Toast 引入和图片资源加载的浏览器级验收，导致交互和视觉问题同时遗漏。"}]}。'
      ),
    },
    {
      'role': 'user',
      'content': json.dumps(row_items, ensure_ascii=False),
    },
  ]
  model_config = model_config if isinstance(model_config, dict) else {}
  provider = str(model_config.get('provider') or TRAE_SESSION_ANNOTATION_PROVIDER or '').strip().lower()
  model_names = [str(model_config.get('model') or '').strip()] if model_config.get('model') else []
  if not model_names:
    model_names = TRAE_SESSION_ANNOTATION_MODELS or [MODELSCOPE_TEXT_MODEL]
  last_error = None
  used_model = ''
  for model in model_names:
    try:
      used_model = model
      parsed = _extract_json_payload(_call_annotation_chat(messages, model=model, provider=provider))
      break
    except Exception as exc:
      last_error = exc
      parsed = None
  else:
    raise RuntimeError(f'annotation models failed: {last_error}')
  if isinstance(parsed, dict):
    parsed = parsed.get('items') or parsed.get('results') or parsed.get('data') or []
  if not isinstance(parsed, list):
    raise RuntimeError(f'annotation response is not a list: {parsed}')
  mapped = {}
  for item in parsed:
    if not isinstance(item, dict):
      continue
    try:
      index = int(item.get('index'))
    except Exception:
      continue
    mapped[index] = {
      'dissatisfactionReason': item.get('dissatisfactionReason'),
      'annotationSource': f'{provider or TRAE_SESSION_ANNOTATION_PROVIDER}:{used_model or (TRAE_SESSION_ANNOTATION_MODELS[0] if TRAE_SESSION_ANNOTATION_MODELS else DEEPSEEK_TEXT_MODEL)}',
    }
  return mapped


def _annotate_session_rows(rows, use_model: bool = True, model_config=None, force: bool = False, strict_model: bool = False):
  if not isinstance(rows, list) or not rows:
    return 0
  pending_rows = []
  for index, row in enumerate(rows):
    if not isinstance(row, dict):
      continue
    if (
      row.get('annotationSource') == 'manual-dual-axis-audit'
      and str(row.get('dissatisfactionReason') or '').strip().startswith('产物不满意：')
      and '过程不满意：' in str(row.get('dissatisfactionReason') or '')
    ):
      continue
    if (
      not str(row.get('rawSessionId') or '').strip()
      and row.get('officialCopiedLogTrace')
      and str(row.get('logTrace') or '').strip()
      and str(row.get('logTraceSource') or '') in {'project-file-log-trace', 'trae-log-acceptCode', 'trae-workspace-state-raw'}
    ):
      continue
    reason_conversation = str((rows[index + 1] or {}).get('conversation') or '') if index + 1 < len(rows) and isinstance(rows[index + 1], dict) else ''
    target_hash = _annotation_row_hash(row, reason_conversation)
    if (
      not force
      and row.get('annotationHash') == target_hash
      and (row.get('dissatisfactionReason') or row.get('annotationSource') == 'next-row-empty')
    ):
      continue
    pending_rows.append((index, row, reason_conversation))
  if not pending_rows:
    return 0

  annotations = {}
  model_pending_rows = []
  for index, row, reason_conversation in pending_rows:
    if use_model:
      model_pending_rows.append((index, row, reason_conversation))
      continue
    if not reason_conversation.strip():
      annotations[index] = {
        'dissatisfactionReason': _terminal_round_dissatisfaction_reason(row),
        'annotationSource': 'terminal-round-fallback',
      }
      continue
    fallback_text = _fallback_dissatisfaction_reason(reason_conversation)
    if fallback_text:
      annotations[index] = {
        'dissatisfactionReason': fallback_text,
        'annotationSource': 'next-row-direct',
      }
    else:
      model_pending_rows.append((index, row, reason_conversation))

  try:
    if model_pending_rows and use_model:
      annotations.update(_request_session_annotations(model_pending_rows, model_config=model_config))
  except Exception as exc:
    if strict_model:
      raise
    print(f'[WARN] session annotation fallback: {exc}', file=sys.stderr)
  if strict_model and model_pending_rows:
    missing_indexes = [index for index, _, _ in model_pending_rows if index not in annotations]
    if missing_indexes:
      raise RuntimeError(f'LLM annotation missing rows: {missing_indexes}')

  changed_count = 0
  annotated_at = datetime.datetime.now().isoformat(timespec='seconds')
  for index, row, reason_conversation in pending_rows:
    target_hash = _annotation_row_hash(row, reason_conversation)
    annotation_row = dict(row)
    annotation_row['conversation'] = reason_conversation
    before = (
      row.get('dissatisfactionReason'),
      row.get('annotationHash'),
      row.get('annotationVersion'),
      row.get('annotationSource'),
    )
    if index in annotations:
      annotation = annotations[index]
    elif not reason_conversation.strip():
      annotation = {
        'dissatisfactionReason': _terminal_round_dissatisfaction_reason(row),
        'annotationSource': 'terminal-round-fallback',
      }
    else:
      annotation = _fallback_session_annotation(annotation_row)
    row.pop('taskType', None)
    row.pop('taskSolution', None)
    normalized_reason = _normalize_dissatisfaction_reason(annotation.get('dissatisfactionReason'))
    row['dissatisfactionReason'] = normalized_reason
    row['annotationHash'] = target_hash
    row['annotationVersion'] = TRAE_SESSION_ANNOTATION_PROMPT_VERSION
    row['annotationUpdatedAt'] = annotated_at
    row['annotationSource'] = annotation.get('annotationSource') or 'fallback'
    after = (
      row.get('dissatisfactionReason'),
      row.get('annotationHash'),
      row.get('annotationVersion'),
      row.get('annotationSource'),
    )
    if after != before:
      changed_count += 1
  return changed_count


def _persist_session_cache(path: str, payload: dict):
  disk_payload = dict(payload or {})
  disk_payload.pop('cache_path', None)
  write_json(path, disk_payload)


def build_used_orders(state, current_prompt_id=None):
  prompts = load_prompts()
  overrides = state.get('orders', {}) if isinstance(state, dict) else {}
  used = {}
  for prompt in prompts:
    prompt_id = prompt.get('id')
    if prompt_id == current_prompt_id:
      continue
    order = normalize_order_token(prompt, overrides.get(prompt_id, default_order_token(prompt)))
    if order is not None:
      used[str(order)] = prompt_id
  return used


def ensure_prompt_folder(scene, order):
  scene_dir = os.path.join(TRAE_ROOT, scene_segment(scene))
  order_dir = os.path.join(scene_dir, str(order))
  os.makedirs(order_dir, exist_ok=True)
  return order_dir


def ensure_all_prompt_folders():
  prompts = load_prompts()
  state = read_json(STATE_FILE, {'completed': {}, 'orders': {}})
  orders = state.get('orders', {})
  count = 0
  for prompt in prompts:
    order = normalize_order_token(prompt, orders.get(prompt.get('id'), default_order_token(prompt)))
    if order is None:
      continue
    if str(order) == default_order_token(prompt):
      scene_dir = os.path.join(TRAE_ROOT, scene_segment(prompt.get('business_domain')))
      old_numeric = os.path.join(scene_dir, str(prompt.get('global_order')))
      new_prefixed = os.path.join(scene_dir, str(order))
      if os.path.isdir(old_numeric) and not os.path.exists(new_prefixed):
        os.rename(old_numeric, new_prefixed)
    ensure_prompt_folder(prompt.get('business_domain'), order)
    count += 1
  return count


def project_folder_for_order(order_token: str):
  order_token = str(order_token or '').strip()
  if not order_token:
    raise RuntimeError('order is required')
  for project_path in project_path_candidates_for_order(order_token):
    if os.path.isdir(project_path):
      return project_path
  project_path = os.path.join(TRAE_ROOT, 'local_projects', order_token)
  os.makedirs(project_path, exist_ok=True)
  return project_path


def _is_order_token_name(value: str) -> bool:
  return bool(re.fullmatch(r'[A-Za-z][A-Za-z0-9]*-\d+', str(value or '').strip()))


def _normalize_order_token_text(value: str) -> str:
  text = str(value or '').strip()
  match = re.fullmatch(r'([A-Za-z][A-Za-z0-9]*)-(\d+)', text)
  if match:
    return f'{match.group(1).lower()}-{int(match.group(2))}'
  return text


def _workspace_json_folder_paths(payload):
  raw_folders = []
  if isinstance(payload, dict):
    raw_folders.extend([payload.get('folder'), payload.get('configuration')])
    if isinstance(payload.get('folders'), list):
      raw_folders.extend(payload.get('folders'))
  paths = []
  for raw_folder in raw_folders:
    folder_path = _workspace_folder_to_path(raw_folder)
    if folder_path and folder_path not in paths:
      paths.append(folder_path)
  return paths


def _iter_workspace_db_records():
  ws_root = TRAE_WORKSPACE_STORAGE_DIR
  if not os.path.isdir(ws_root):
    return
  for ws_hash in os.listdir(ws_root):
    ws_dir = os.path.join(ws_root, ws_hash)
    if not os.path.isdir(ws_dir):
      continue
    ws_json = os.path.join(ws_dir, 'workspace.json')
    db_path = os.path.join(ws_dir, 'state.vscdb')
    if not (os.path.isfile(ws_json) and os.path.isfile(db_path)):
      continue
    try:
      payload = _safe_json_loads(open(ws_json, 'r', encoding='utf-8').read(), {})
    except Exception:
      payload = {}
    for folder_path in _workspace_json_folder_paths(payload):
      yield {
        'workspaceDir': ws_dir,
        'workspaceJson': ws_json,
        'dbPath': db_path,
        'folderPath': folder_path,
        'folderRealPath': os.path.realpath(folder_path),
        'order': _normalize_order_token_text(os.path.basename(folder_path.rstrip('/'))),
      }


def project_path_candidates_for_order(order_token: str):
  order_token = _normalize_order_token_text(order_token)
  if not order_token:
    return []
  candidates = []

  def _add(path):
    text = str(path or '').rstrip('/')
    if text and text not in candidates:
      candidates.append(text)

  _add(os.path.join(TRAE_ROOT, 'local_projects', order_token))
  if os.path.isdir(TRAE_ROOT):
    for scene_name in os.listdir(TRAE_ROOT):
      scene_path = os.path.join(TRAE_ROOT, scene_name)
      if not os.path.isdir(scene_path):
        continue
      _add(os.path.join(scene_path, order_token))

  for record in _iter_workspace_db_records() or []:
    if record.get('order') == order_token:
      _add(record.get('folderPath') or '')
  return candidates


def _order_path_markers(order_token: str):
  order_token = _normalize_order_token_text(order_token)
  markers = []
  if not order_token:
    return markers
  markers.append(f'/{order_token}/')
  markers.append(f'/{order_token}')
  for path in project_path_candidates_for_order(order_token):
    for value in (path, os.path.realpath(path)):
      value = str(value or '').rstrip('/')
      if value and value not in markers:
        markers.append(value)
        markers.append(value + '/')
  return markers


def parse_order_tokens(raw_orders):
  if isinstance(raw_orders, list):
    parts = raw_orders
  else:
    parts = str(raw_orders or '').split(',')
  orders = []
  seen = set()
  for item in parts:
    text = str(item or '').strip()
    if not text:
      continue
    if re.fullmatch(r'\d+', text):
      text = f'xm-{int(text)}'
    match = re.fullmatch(r'([A-Za-z][A-Za-z0-9]*)-(\d+)', text)
    if match:
      text = f'{match.group(1).lower()}-{int(match.group(2))}'
    if text not in seen:
      seen.add(text)
      orders.append(text)
  return orders


def load_trae_groups():
  state = read_json(STATE_FILE, {'completed': {}, 'orders': {}})
  groups = state.get('trae_groups', {}) if isinstance(state, dict) else {}
  if not isinstance(groups, dict):
    groups = {}
  normalized = {}
  for name, orders in groups.items():
    safe_name = str(name or '').strip()
    if not safe_name:
      continue
    normalized[safe_name] = parse_order_tokens(orders)
  return normalized


def save_trae_group(name: str, raw_orders):
  group_name = str(name or '').strip()
  if not group_name:
    raise RuntimeError('group name is required')
  orders = parse_order_tokens(raw_orders)
  if not orders:
    raise RuntimeError('group orders are required')
  state = read_json(STATE_FILE, {'completed': {}, 'orders': {}})
  state.setdefault('completed', {})
  state.setdefault('orders', {})
  state.setdefault('trae_groups', {})
  if not isinstance(state['trae_groups'], dict):
    state['trae_groups'] = {}
  state['trae_groups'][group_name] = orders
  write_json(STATE_FILE, state)
  for order in orders:
    project_folder_for_order(order)
  return {'ok': True, 'groups': load_trae_groups(), 'active': group_name}


def delete_trae_group(name: str):
  group_name = str(name or '').strip()
  if not group_name:
    raise RuntimeError('group name is required')
  state = read_json(STATE_FILE, {'completed': {}, 'orders': {}})
  groups = state.get('trae_groups', {})
  if isinstance(groups, dict):
    groups.pop(group_name, None)
  state['trae_groups'] = groups if isinstance(groups, dict) else {}
  write_json(STATE_FILE, state)
  return {'ok': True, 'groups': load_trae_groups()}


def open_path_with_default_app(path: str):
  target = _expand_local_path(path)
  if os.name == 'nt':
    os.startfile(target)  # type: ignore[attr-defined]
    return subprocess.CompletedProcess(['start', target], 0, '', '')
  if sys.platform == 'darwin':
    return run_cmd(['open', target], check=True)
  xdg_open = shutil.which('xdg-open')
  if xdg_open:
    return run_cmd([xdg_open, target], check=True)
  gio = shutil.which('gio')
  if gio:
    return run_cmd([gio, 'open', target], check=True)
  raise RuntimeError('当前系统未找到可用的打开目录命令，请手动打开该路径')


def open_trae_project(order_token: str):
  project_path = project_folder_for_order(order_token)
  launch_mode = 'system-open-folder'
  if TRAE_CLI and os.path.isfile(TRAE_CLI):
    cmd = [TRAE_CLI, '--new-window', project_path]
    launch_mode = 'trae-cli'
    completed = run_cmd(cmd, check=True)
  elif sys.platform == 'darwin':
    cmd = ['open', '-a', TRAE_APP_NAME, project_path]
    launch_mode = 'mac-app'
    completed = run_cmd(cmd, check=True)
  else:
    completed = open_path_with_default_app(project_path)
    cmd = list(completed.args) if isinstance(completed.args, (list, tuple)) else [str(completed.args)]
  if sys.platform == 'darwin':
    try:
      run_cmd(['osascript', '-e', f'tell application "{TRAE_APP_NAME}" to activate'], check=False)
    except Exception:
      pass
  return {
    'ok': True,
    'order': order_token,
    'folder': project_path,
    'command': cmd,
    'launchMode': launch_mode,
    'stdout': (completed.stdout or '').strip(),
    'stderr': (completed.stderr or '').strip(),
  }


def open_trae_projects(order_tokens):
  results = []
  for order in order_tokens:
    results.append(open_trae_project(order))
    time.sleep(0.8)
  return results


def _codex_deepseek_config_args():
  return [
    '-m', DEEPSEEK_TEXT_MODEL,
    '-c', 'model_provider="deepseek"',
    '-c', f'model="{DEEPSEEK_TEXT_MODEL}"',
    '-c', 'model_providers.deepseek.name="DeepSeek"',
    '-c', f'model_providers.deepseek.base_url="{DEEPSEEK_API_BASE.rstrip()}"',
    '-c', 'model_providers.deepseek.env_key="DEEPSEEK_API_KEY"',
    '-c', f'model_providers.deepseek.wire_api="{CODEX_DEEPSEEK_WIRE_API}"',
    '-c', 'model_providers.deepseek.requires_openai_auth=false',
  ]


def _shell_join(cmd):
  if os.name == 'nt':
    return subprocess.list2cmdline([str(part) for part in cmd])
  return ' '.join(shlex.quote(str(part)) for part in cmd)


def _codex_shell_command(cmd, project_path: str, use_deepseek: bool = False):
  quoted_cmd = _shell_join(cmd)
  if os.name == 'nt':
    shell_parts = [
      f'cd /d {subprocess.list2cmdline([project_path])}',
    ]
    if use_deepseek:
      if DEEPSEEK_API_KEY:
        shell_parts.append(f'set "DEEPSEEK_API_KEY={DEEPSEEK_API_KEY}"')
      else:
        shell_parts.append('if "%DEEPSEEK_API_KEY%"=="" (echo 请先设置 DEEPSEEK_API_KEY 后再启动 Codex DeepSeek && exit /b 1)')
      shell_parts.append(f'set "DEEPSEEK_API_BASE={DEEPSEEK_API_BASE}"')
    shell_parts.append(quoted_cmd)
    return ' && '.join(shell_parts)

  shell_parts = [
    f'cd {shlex.quote(project_path)}',
  ]
  if use_deepseek:
    if DEEPSEEK_API_KEY:
      shell_parts.append(f'export DEEPSEEK_API_KEY={shlex.quote(DEEPSEEK_API_KEY)}')
    else:
      shell_parts.append(': "${DEEPSEEK_API_KEY:?请先 export DEEPSEEK_API_KEY=你的DeepSeekKey 后再启动 Codex DeepSeek}"')
    shell_parts.append(f'export DEEPSEEK_API_BASE={shlex.quote(DEEPSEEK_API_BASE)}')
  shell_parts.append(quoted_cmd)
  return '; '.join(shell_parts)


def _open_terminal_with_command(shell_command: str):
  if sys.platform == 'darwin':
    script = f'''
tell application "Terminal"
  activate
  do script {json.dumps(shell_command)}
end tell
'''
    return run_cmd(['osascript', '-e', script], check=True)

  if os.name == 'nt':
    launcher = ['cmd', '/c', 'start', 'Codex CLI', 'cmd', '/k', shell_command]
    subprocess.Popen(launcher, cwd=ROOT_DIR, close_fds=True)
    return subprocess.CompletedProcess(launcher, 0, '', '')

  terminals = [
    (shutil.which('x-terminal-emulator'), ['-e', 'sh', '-lc', shell_command]),
    (shutil.which('gnome-terminal'), ['--', 'sh', '-lc', shell_command]),
    (shutil.which('konsole'), ['-e', 'sh', '-lc', shell_command]),
    (shutil.which('xterm'), ['-e', 'sh', '-lc', shell_command]),
  ]
  for binary, args in terminals:
    if not binary:
      continue
    subprocess.Popen([binary, *args], cwd=ROOT_DIR, close_fds=True)
    return subprocess.CompletedProcess([binary, *args], 0, '', '')
  raise RuntimeError('未找到可打开交互终端的命令，请在该项目目录手动执行 Codex CLI')


def open_codex_cli_project(order_token: str, use_deepseek: bool = False):
  project_path = project_folder_for_order(order_token)
  codex_path = codex_cli_path() or 'codex'
  cmd = [codex_path, '-C', project_path]
  if use_deepseek:
    cmd.extend(_codex_deepseek_config_args())
  shell_command = _codex_shell_command(cmd, project_path, use_deepseek=use_deepseek)
  completed = _open_terminal_with_command(shell_command)
  return {
    'ok': True,
    'order': order_token,
    'folder': project_path,
    'engine': 'codex-cli',
    'codexDeepseek': bool(use_deepseek),
    'model': DEEPSEEK_TEXT_MODEL if use_deepseek else '',
    'baseUrl': DEEPSEEK_API_BASE if use_deepseek else '',
    'command': cmd,
    'stdout': (completed.stdout or '').strip(),
    'stderr': (completed.stderr or '').strip(),
  }


def open_codex_cli_projects(order_tokens, use_deepseek: bool = False):
  results = []
  for order in order_tokens:
    results.append(open_codex_cli_project(order, use_deepseek=use_deepseek))
    time.sleep(0.8)
  return results


def close_trae_project(order_token: str):
  project_path = project_folder_for_order(order_token)
  closed_windows = 0
  matched_windows = []
  killed_pids = []

  if sys.platform != 'darwin':
    return {
      'ok': True,
      'order': order_token,
      'folder': project_path,
      'closed_windows': 0,
      'matched_windows': [],
      'killed_pids': [],
      'note': '非 macOS 环境不执行窗口级关闭，也不会批量终止 Trae/Node 进程；请手动关闭对应项目窗口。',
    }

  close_script = '''
on run argv
  set projectName to item 1 of argv
  set closedCount to 0
  set matchedNames to ""
  tell application "System Events"
    repeat with processName in {"Electron", "Trae CN"}
      if exists process processName then
        tell process processName
          set frontmost to true
          repeat with w in windows
            try
              set windowName to name of w as text
              if windowName contains projectName then
                set matchedNames to matchedNames & windowName & linefeed
                perform action "AXRaise" of w
                delay 0.15
                keystroke "w" using command down
                set closedCount to closedCount + 1
                delay 0.35
              end if
            end try
          end repeat
        end tell
      end if
    end repeat
  end tell
  return (closedCount as text) & linefeed & matchedNames
end run
'''
  try:
    completed = run_cmd(['osascript', '-e', close_script, order_token], check=False)
    if completed.returncode != 0:
      completed = run_cmd(['osascript', '-', order_token], check=False, input_text=close_script)
    if completed.returncode == 0:
      lines = (completed.stdout or '').splitlines()
      if lines and lines[0].strip().isdigit():
        closed_windows = int(lines[0].strip())
        matched_windows = [line for line in lines[1:] if line.strip()]
  except Exception:
    closed_windows = 0

  try:
    pgrep = run_cmd(['pgrep', '-f', re.escape(project_path)], check=False)
    for line in (pgrep.stdout or '').splitlines():
      pid = line.strip()
      if not pid or not pid.isdigit() or int(pid) == os.getpid():
        continue
      try:
        os.kill(int(pid), 15)
        killed_pids.append(int(pid))
      except ProcessLookupError:
        continue
      except Exception:
        continue
  except Exception:
    pass

  return {
    'ok': True,
    'order': order_token,
    'folder': project_path,
    'closed_windows': closed_windows,
    'matched_windows': matched_windows,
    'killed_pids': killed_pids,
  }


def trae_window_action(order_token: str, action: str):
  order_token = str(order_token or '').strip()
  action = str(action or 'focus').strip().lower()
  if not order_token:
    raise RuntimeError('order is required')
  if sys.platform != 'darwin':
    raise RuntimeError('Trae 窗口定位/滚动依赖 macOS 辅助功能；Windows/Linux 请使用数据库和日志文件刷新链路')
  if action not in {'focus', 'scroll-up', 'scroll-down'}:
    raise RuntimeError('unsupported action')

  script = '''
on run argv
  set targetOrder to item 1 of argv
  set actionName to item 2 of argv
  set matchedName to ""
  tell application "System Events"
    repeat with processName in {"Electron", "Trae CN"}
      if exists process processName then
        tell process processName
          repeat with w in windows
            try
              set windowName to name of w as text
              if windowName contains targetOrder then
                set frontmost to true
                perform action "AXRaise" of w
                set matchedName to windowName
                delay 0.15
                if actionName is "scroll-up" then
                  key code 116
                else if actionName is "scroll-down" then
                  key code 121
                end if
                return matchedName
              end if
            end try
          end repeat
        end tell
      end if
    end repeat
  end tell
  return ""
end run
'''
  completed = run_cmd(['osascript', '-', order_token, action], check=False, input_text=script)
  matched = (completed.stdout or '').strip()
  if completed.returncode != 0:
    raise RuntimeError((completed.stderr or '').strip() or 'osascript failed')
  return {
    'ok': True,
    'order': order_token,
    'action': action,
    'matched': bool(matched),
    'window': matched,
  }


def _trae_copy_log_trace_visible(order_token: str, mode: str = 'click', pick: int = -1, focus: bool = True):
  order_token = str(order_token or '').strip()
  mode = str(mode or 'click').strip().lower()
  if not order_token:
    raise RuntimeError('order is required')
  if mode not in {'click', 'probe'}:
    raise RuntimeError('mode must be click or probe')

  focus_result = trae_window_action(order_token, 'focus') if focus else {'ok': True, 'order': order_token, 'action': 'focus', 'matched': True, 'window': ''}
  sentinel = f'__TRAE_COPY_LOG_TRACE_SENTINEL__{int(time.time() * 1000)}'
  if mode == 'click':
    run_cmd(['pbcopy'], check=False, input_text=sentinel)

  swift_script = f'''
import AppKit
import ApplicationServices
import Foundation

let targetOrder = {json.dumps(order_token)}
let mode = {json.dumps(mode)}
let pick = {int(pick)}
let maxNodes = 30000
let maxDepth = 28
let childAttrs: [CFString] = ["AXChildren", "AXVisibleChildren", "AXRows", "AXColumns", "AXTabs", "AXContents"].map {{ $0 as CFString }}
let textAttrs: [CFString] = ["AXRole", "AXSubrole", "AXTitle", "AXDescription", "AXHelp", "AXIdentifier", "AXValue", "AXDOMIdentifier", "AXDOMClassList"].map {{ $0 as CFString }}

func attr(_ el: AXUIElement, _ key: CFString) -> AnyObject? {{
  var value: CFTypeRef?
  let err = AXUIElementCopyAttributeValue(el, key, &value)
  return err == .success ? value : nil
}}

func str(_ el: AXUIElement, _ key: CFString) -> String {{
  guard let value = attr(el, key) else {{ return "" }}
  return String(describing: value)
}}

func point(_ el: AXUIElement) -> CGPoint? {{
  guard let value = attr(el, "AXPosition" as CFString), CFGetTypeID(value) == AXValueGetTypeID() else {{ return nil }}
  var result = CGPoint.zero
  return AXValueGetValue(value as! AXValue, .cgPoint, &result) ? result : nil
}}

func size(_ el: AXUIElement) -> CGSize? {{
  guard let value = attr(el, "AXSize" as CFString), CFGetTypeID(value) == AXValueGetTypeID() else {{ return nil }}
  var result = CGSize.zero
  return AXValueGetValue(value as! AXValue, .cgSize, &result) ? result : nil
}}

func children(_ el: AXUIElement) -> [AXUIElement] {{
  var result: [AXUIElement] = []
  for key in childAttrs {{
    if let arr = attr(el, key) as? [AXUIElement] {{
      result.append(contentsOf: arr)
    }}
  }}
  return result
}}

func summary(_ el: AXUIElement) -> String {{
  var parts: [String] = []
  for key in textAttrs {{
    let text = str(el, key)
    if !text.isEmpty {{ parts.append("\\(key)=\\(text)") }}
  }}
  if let p = point(el), let s = size(el) {{
    parts.append("frame=\\(Int(p.x)),\\(Int(p.y)),\\(Int(s.width))x\\(Int(s.height))")
  }}
  return parts.joined(separator: " | ")
}}

func frameDict(_ el: AXUIElement) -> [String: Int] {{
  let p = point(el) ?? CGPoint.zero
  let s = size(el) ?? CGSize.zero
  return ["x": Int(p.x), "y": Int(p.y), "width": Int(s.width), "height": Int(s.height)]
}}

func emit(_ payload: [String: Any]) {{
  let data = try! JSONSerialization.data(withJSONObject: payload, options: [])
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write("\\n".data(using: .utf8)!)
}}

let apps = NSWorkspace.shared.runningApplications.filter {{ app in
  let name = app.localizedName ?? ""
  let bundle = app.bundleIdentifier ?? ""
  return name == "TRAE CN" || name == "Trae CN" || bundle == "cn.trae.app"
}}

guard let app = apps.first else {{
  emit(["matched": false, "pressed": false, "error": "TRAE CN app not found"])
  exit(0)
}}

let axApp = AXUIElementCreateApplication(app.processIdentifier)
guard let windows = attr(axApp, "AXWindows" as CFString) as? [AXUIElement] else {{
  emit(["matched": false, "pressed": false, "error": "AXWindows unavailable"])
  exit(0)
}}

var targetWindow: AXUIElement?
var targetTitle = ""
for window in windows {{
  let title = str(window, "AXTitle" as CFString)
  if title.contains(targetOrder) {{
    targetWindow = window
    targetTitle = title
    break
  }}
}}

guard let window = targetWindow else {{
  emit(["matched": false, "pressed": false, "error": "target window not found"])
  exit(0)
}}

var queue: [(AXUIElement, Int)] = [(window, 0)]
var visited = 0
var matches: [[String: Any]] = []
var matchElements: [AXUIElement] = []
var seenFrames = Set<String>()

while !queue.isEmpty && visited < maxNodes {{
  let (el, depth) = queue.removeFirst()
  visited += 1
  let role = str(el, "AXRole" as CFString)
  let title = str(el, "AXTitle" as CFString)
  let desc = str(el, "AXDescription" as CFString)
  let help = str(el, "AXHelp" as CFString)
  let domClass = str(el, "AXDOMClassList" as CFString)
  let identifier = str(el, "AXIdentifier" as CFString)
  let line = summary(el)
  let hasCopyAllClass = domClass.localizedCaseInsensitiveContains("copy-all")
  let hasCopyAllLabel = title.contains("复制全部") || desc.contains("复制全部") || help.contains("复制全部") || identifier.localizedCaseInsensitiveContains("copy-all")
  let isTarget = role == "AXButton" && (hasCopyAllClass || hasCopyAllLabel) && !domClass.localizedCaseInsensitiveContains("task-copy-btn")
  if isTarget {{
    let frame = frameDict(el)
    let key = "\\(frame["x"] ?? 0),\\(frame["y"] ?? 0),\\(frame["width"] ?? 0),\\(frame["height"] ?? 0),\\(line)"
    if !seenFrames.contains(key) {{
      seenFrames.insert(key)
      matches.append(["depth": depth, "role": role, "title": title, "description": desc, "help": help, "domClass": domClass, "frame": frame])
      matchElements.append(el)
    }}
  }}
  if depth < maxDepth {{
    for child in children(el) {{
      queue.append((child, depth + 1))
    }}
  }}
}}

let orderedPairs = matchElements.enumerated().sorted {{ lhs, rhs in
  let leftPoint = point(lhs.element) ?? CGPoint.zero
  let rightPoint = point(rhs.element) ?? CGPoint.zero
  if abs(leftPoint.y - rightPoint.y) > 1 {{
    return leftPoint.y < rightPoint.y
  }}
  if abs(leftPoint.x - rightPoint.x) > 1 {{
    return leftPoint.x < rightPoint.x
  }}
  return lhs.offset < rhs.offset
}}

var orderedMatches: [[String: Any]] = []
for (visibleIndex, pair) in orderedPairs.enumerated() {{
  var item = matches[pair.offset]
  item["sourceIndex"] = pair.offset
  item["visibleIndex"] = visibleIndex
  orderedMatches.append(item)
}}

var pressed = false
var pressError = ""
var selectedIndex = -1
if mode == "click", !orderedPairs.isEmpty {{
  let rawIndex = pick < 0 ? orderedPairs.count + pick : pick
  if rawIndex >= 0 && rawIndex < orderedPairs.count {{
    selectedIndex = rawIndex
    let element = orderedPairs[rawIndex].element
    let err = AXUIElementPerformAction(element, "AXPress" as CFString)
    pressed = err == .success
    if !pressed {{ pressError = "AXPress failed: \\(err.rawValue)" }}
  }} else {{
    pressError = "pick out of range: \\(pick) / \\(orderedPairs.count)"
  }}
}}

emit(["matched": !orderedMatches.isEmpty, "pressed": pressed, "pressError": pressError, "selectedIndex": selectedIndex, "visited": visited, "window": targetTitle, "matches": orderedMatches])
'''
  completed = run_cmd(['swift', '-'], check=False, input_text=swift_script)
  if completed.returncode != 0:
    raise RuntimeError((completed.stderr or '').strip() or (completed.stdout or '').strip() or 'swift AX probe failed')
  lines = [line for line in (completed.stdout or '').splitlines() if line.strip()]
  result = json.loads(lines[-1]) if lines else {}
  time.sleep(0.6)
  clipboard = ''
  copied = False
  if mode == 'click':
    paste = run_cmd(['pbpaste'], check=False)
    clipboard = paste.stdout or ''
    copied = bool(clipboard) and clipboard != sentinel

  result.update({
    'ok': True,
    'order': order_token,
    'mode': mode,
    'focus': focus_result,
    'copied': copied,
    'trace': clipboard if copied else '',
    'trace_length': len(clipboard) if copied else 0,
  })
  return result


def _trae_scroll_window(order_token: str, action: str, steps: int, delay: float = 0.22):
  steps = max(0, int(steps))
  results = []
  for _ in range(steps):
    results.append(trae_window_action(order_token, action))
    time.sleep(delay)
  return results


def trae_copy_log_trace(order_token: str, mode: str = 'click', scan: str = 'visible', max_pages: int = 12, pick: int = -1):
  order_token = str(order_token or '').strip()
  mode = str(mode or 'click').strip().lower()
  scan = str(scan or 'visible').strip().lower()
  if not order_token:
    raise RuntimeError('order is required')
  if mode not in {'click', 'probe', 'collect'}:
    raise RuntimeError('mode must be click, probe or collect')
  if scan not in {'visible', 'scroll'}:
    raise RuntimeError('scan must be visible or scroll')
  max_pages = max(1, int(max_pages))
  pick = int(pick)

  if scan == 'visible':
    if mode == 'collect':
      probe = _trae_copy_log_trace_visible(order_token, 'probe', pick=pick, focus=True)
      page_matches = probe.get('matches') or []
      collected = []
      traces = []
      seen_hashes = set()
      last_click = None
      for idx, _match in enumerate(page_matches):
        click_result = _trae_copy_log_trace_visible(order_token, 'click', pick=idx, focus=False)
        last_click = click_result
        trace = click_result.get('trace') or ''
        trace_hash = hashlib.sha256(trace.encode('utf-8')).hexdigest() if trace else ''
        if trace and trace_hash not in seen_hashes:
          seen_hashes.add(trace_hash)
          collected.append({
            'index': idx,
            'trace': trace,
            'traceLength': len(trace),
            'traceHash': trace_hash,
            'button': page_matches[idx] if idx < len(page_matches) else {},
          })
          traces.append(trace)
      result = probe
      result.update({
        'ok': True,
        'order': order_token,
        'mode': mode,
        'scan': scan,
        'focus': probe.get('focus'),
        'matched': bool(page_matches),
        'copied': bool(traces),
        'trace': traces[-1] if traces else '',
        'trace_length': len(traces[-1]) if traces else 0,
        'traces': collected,
        'traces_count': len(collected),
        'last_click': last_click or {},
      })
      return result

    result = _trae_copy_log_trace_visible(order_token, mode, pick=pick, focus=True)
    result.update({
      'ok': True,
      'order': order_token,
      'mode': mode,
      'scan': scan,
    })
    return result

  focus_result = trae_window_action(order_token, 'focus')
  scroll_up_steps = max_pages + 2
  _trae_scroll_window(order_token, 'scroll-up', scroll_up_steps)

  page_snapshots = []
  collected = []
  seen_hashes = set()
  last_page_with_matches = -1
  last_page_matches = []

  for page_index in range(max_pages):
    probe = _trae_copy_log_trace_visible(order_token, 'probe', pick=-1, focus=False)
    page_matches = probe.get('matches') or []
    page_snapshot = dict(probe)
    page_snapshot['pageIndex'] = page_index
    page_snapshots.append(page_snapshot)
    if page_matches:
      last_page_with_matches = page_index
      last_page_matches = page_matches
    if mode == 'collect' and page_matches:
      for visible_index, match in enumerate(page_matches):
        click_result = _trae_copy_log_trace_visible(order_token, 'click', pick=visible_index, focus=False)
        trace = click_result.get('trace') or ''
        trace_hash = hashlib.sha256(trace.encode('utf-8')).hexdigest() if trace else ''
        if trace and trace_hash not in seen_hashes:
          seen_hashes.add(trace_hash)
          collected.append({
            'pageIndex': page_index,
            'index': visible_index,
            'trace': trace,
            'traceLength': len(trace),
            'traceHash': trace_hash,
            'button': match,
            'click': click_result,
          })
    if page_index < max_pages - 1:
      _trae_scroll_window(order_token, 'scroll-down', 1)

  if mode == 'probe':
    return {
      'ok': True,
      'order': order_token,
      'mode': mode,
      'scan': scan,
      'focus': focus_result,
      'pages': page_snapshots,
      'matched': any(page.get('matches') for page in page_snapshots),
      'copied': False,
      'trace': '',
      'trace_length': 0,
      'traces': [],
      'traces_count': 0,
    }

  if mode == 'collect':
    last_trace = collected[-1]['trace'] if collected else ''
    return {
      'ok': True,
      'order': order_token,
      'mode': mode,
      'scan': scan,
      'focus': focus_result,
      'pages': page_snapshots,
      'matched': any(page.get('matches') for page in page_snapshots),
      'copied': bool(collected),
      'trace': last_trace,
      'trace_length': len(last_trace),
      'traces': collected,
      'traces_count': len(collected),
    }

  if last_page_with_matches < 0 or not last_page_matches:
    return {
      'ok': True,
      'order': order_token,
      'mode': mode,
      'scan': scan,
      'focus': focus_result,
      'pages': page_snapshots,
      'matched': False,
      'copied': False,
      'trace': '',
      'trace_length': 0,
      'traces': [],
      'traces_count': 0,
      'error': 'copy-all button not found after scroll scan',
    }

  _trae_scroll_window(order_token, 'scroll-up', scroll_up_steps + max_pages)
  _trae_scroll_window(order_token, 'scroll-down', last_page_with_matches)
  click_result = _trae_copy_log_trace_visible(order_token, 'click', pick=min(max(0, pick), len(last_page_matches) - 1) if pick >= 0 else -1, focus=False)
  click_result.update({
    'ok': True,
    'order': order_token,
    'mode': mode,
    'scan': scan,
    'focus': focus_result,
    'pages': page_snapshots,
    'matched': bool(last_page_matches),
    'traces': [],
    'traces_count': 0,
  })
  return click_result


def batch_trae_projects(action: str, raw_orders, options=None):
  action = str(action or '').strip().lower()
  if action not in {'open', 'close'}:
    raise RuntimeError('action must be open or close')
  orders = parse_order_tokens(raw_orders)
  if not orders:
    raise RuntimeError('orders are required')
  options = options if isinstance(options, dict) else {}
  engine = str(options.get('engine') or 'trae').strip().lower()
  use_codex_deepseek = bool(options.get('codexDeepseek'))
  results = []
  if action == 'open':
    if engine == 'codex-cli':
      for order in orders:
        try:
          results.append(open_codex_cli_project(order, use_deepseek=use_codex_deepseek))
          time.sleep(0.65)
        except Exception as err:
          results.append({'ok': False, 'order': order, 'engine': 'codex-cli', 'error': str(err)})
    else:
      try:
        results.extend(open_trae_projects(orders))
      except Exception:
        for order in orders:
          try:
            results.append(open_trae_project(order))
            time.sleep(0.65)
          except Exception as err:
            results.append({'ok': False, 'order': order, 'engine': 'trae', 'error': str(err)})
  else:
    for order in orders:
      try:
        results.append(close_trae_project(order))
      except Exception as err:
        results.append({'ok': False, 'order': order, 'error': str(err)})
  return {'ok': True, 'action': action, 'orders': orders, 'engine': engine if action == 'open' else 'trae', 'codexDeepseek': use_codex_deepseek if action == 'open' else False, 'results': results}


def pick_folder(start_path: str) -> str:
  prompt = '请选择项目仓库文件夹'
  start_path = (start_path or '').strip()

  if os.name == 'nt':
    powershell = shutil.which('powershell') or shutil.which('pwsh')
    if not powershell:
      raise RuntimeError('未找到 PowerShell，无法打开 Windows 目录选择器')
    safe_start = start_path.replace("'", "''") if start_path and os.path.isdir(start_path) else ''
    script = f'''
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '{prompt}'
$dialog.ShowNewFolderButton = $true
if ('{safe_start}' -ne '') {{ $dialog.SelectedPath = '{safe_start}' }}
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {{
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Write-Output $dialog.SelectedPath
}} else {{
  exit 2
}}
'''
    completed = run_cmd([powershell, '-NoProfile', '-STA', '-Command', script], check=False)
    if completed.returncode == 0 and (completed.stdout or '').strip():
      return (completed.stdout or '').strip()
    if completed.returncode == 2:
      raise RuntimeError('user canceled')
    raise RuntimeError((completed.stderr or completed.stdout or '').strip() or 'failed to pick folder')

  if sys.platform != 'darwin':
    code = (
      'import sys, tkinter as tk\n'
      'from tkinter import filedialog\n'
      'root=tk.Tk(); root.withdraw(); root.update()\n'
      f'path=filedialog.askdirectory(title={json.dumps(prompt)}, initialdir={json.dumps(start_path if os.path.isdir(start_path) else "")})\n'
      'print(path) if path else sys.exit(2)\n'
    )
    completed = run_cmd([sys.executable, '-c', code], check=False)
    if completed.returncode == 0 and (completed.stdout or '').strip():
      return (completed.stdout or '').strip()
    if completed.returncode == 2:
      raise RuntimeError('user canceled')
    raise RuntimeError((completed.stderr or completed.stdout or '').strip() or 'failed to pick folder')

  script_lines = [f'set promptText to "{prompt}"']

  if start_path and os.path.isdir(start_path):
    safe_path = start_path.replace('"', '\\"')
    script_lines.append(f'set baseFolder to POSIX file "{safe_path}"')
    script_lines.append('set chosenFolder to choose folder with prompt promptText default location baseFolder')
  else:
    script_lines.append('set chosenFolder to choose folder with prompt promptText')

  script_lines.append('POSIX path of chosenFolder')
  cmd = ['osascript']
  for line in script_lines:
    cmd.extend(['-e', line])

  try:
    output = subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT).strip()
    return output
  except subprocess.CalledProcessError as err:
    msg = (err.output or '').strip()
    if 'User canceled' in msg:
      raise RuntimeError('user canceled')
    raise RuntimeError(msg or 'failed to pick folder')
  except FileNotFoundError:
    raise RuntimeError('osascript not found')


def run_cmd(cmd, cwd=None, check=True, input_text=None):
  completed = subprocess.run(
    cmd,
    cwd=cwd,
    text=True,
    input=input_text,
    capture_output=True,
    check=False,
  )
  if check and completed.returncode != 0:
    detail = completed.stderr.strip() or completed.stdout.strip() or 'command failed'
    raise RuntimeError(f"{' '.join(cmd)}: {detail}")
  return completed


def log_sync(message: str):
  print(f'[sync-github] {message}', flush=True)


def run_applescript(lines):
  cmd = ['osascript']
  for line in lines:
    cmd.extend(['-e', line])
  completed = subprocess.run(cmd, text=True, capture_output=True, check=False)
  if completed.returncode != 0:
    detail = completed.stderr.strip() or completed.stdout.strip() or 'AppleScript failed'
    raise RuntimeError(detail)
  return completed.stdout.strip()


def chrome_execute_js(script: str):
  if sys.platform != 'darwin':
    raise RuntimeError('Chrome 页面注入自动化当前仅在 macOS Apple Events 下可用；Windows/Linux 请使用页面内复制粘贴链路，或后续配置独立浏览器驱动')
  js_literal = json.dumps(script, ensure_ascii=False)
  try:
    output = run_applescript([
      'tell application "Google Chrome"',
      'activate',
      'if (count of windows) is 0 then make new window',
      f'execute active tab of front window javascript {js_literal}',
      'end tell',
    ])
  except RuntimeError as err:
    message = str(err)
    if 'not allowed' in message.lower() or 'javascript' in message.lower():
      raise RuntimeError('Chrome 未允许 Apple Events 执行 JavaScript，请在 Chrome 菜单 View/开发者 中开启 “Allow JavaScript from Apple Events” 后重试')
    raise
  try:
    return json.loads(output) if output else {}
  except json.JSONDecodeError:
    return {'ok': False, 'raw': output}


def workbench_defaults():
  llm_models = llm_annotation_model_catalog()
  return {
    'default_github_repo_url': DEFAULT_GITHUB_REPO_URL,
    'default_feishu_task_url': DEFAULT_FEISHU_TASK_URL,
    'data_dir': DATA_DIR,
    'seed_data_dir': DOCS_DATA_DIR,
    'trae_root': TRAE_ROOT,
    'trae_app_support_dir': TRAE_APP_SUPPORT_DIR,
    'trae_workspace_storage_dir': TRAE_WORKSPACE_STORAGE_DIR,
    'default_llm_annotation_model_id': next((item['id'] for item in llm_models if item.get('default')), llm_models[0]['id'] if llm_models else ''),
    'llm_annotation_models': llm_models,
  }


def llm_annotation_model_catalog():
  active_provider = str(TRAE_SESSION_ANNOTATION_PROVIDER or '').strip().lower()
  active_models = set(TRAE_SESSION_ANNOTATION_MODELS or [])
  codex_path = codex_cli_path()
  return [
    {
      'id': 'deepseek-v4-pro',
      'name': 'DeepSeek V4 Pro',
      'vendor': 'DeepSeek',
      'provider': 'deepseek',
      'model': DEEPSEEK_TEXT_MODEL,
      'baseUrl': DEEPSEEK_API_BASE,
      'role': '不满意列双轴原因生成',
      'description': '接口生成不满意列双轴原因。',
      'available': bool(DEEPSEEK_API_KEY),
      'statusLabel': '可调用' if DEEPSEEK_API_KEY else '需配置 .env',
      'supportsAnnotation': True,
      'default': active_provider in {'deepseek', 'deepseek-v4', 'deepseek-v4-pro'} and DEEPSEEK_TEXT_MODEL in active_models,
    },
    {
      'id': 'codex-cli-pinai',
      'name': 'Codex CLI / pinAI',
      'vendor': 'pinAI',
      'provider': 'codex-cli',
      'model': 'codex-cli',
      'baseUrl': '',
      'role': '本机协作式标注与复核',
      'description': '走本机 Codex CLI 默认 pinAI 链路。',
      'available': bool(codex_path),
      'statusLabel': '本机可用' if codex_path else '未找到 CLI',
      'supportsAnnotation': False,
      'default': False,
    },
  ]


def resolve_llm_annotation_model(model_id: str = '') -> dict:
  models = llm_annotation_model_catalog()
  requested = str(model_id or '').strip()
  model = None
  if requested:
    model = next((item for item in models if item.get('id') == requested), None)
  if model is None:
    model = next((item for item in models if item.get('default')), None) or (models[0] if models else None)
  if not model:
    raise RuntimeError('未找到可用的 LLM 标注模型配置')
  if not model.get('supportsAnnotation'):
    raise RuntimeError(f"{model.get('name') or model.get('id')} 仅用于本机复核/启动，不支持直接写入不满意列")
  if not model.get('available'):
    if model.get('provider') == 'deepseek':
      raise RuntimeError('DeepSeek 标注需要先设置 DEEPSEEK_API_KEY')
    raise RuntimeError(f"{model.get('name') or model.get('id')} 当前不可用")
  return model


def annotate_dissatisfaction_for_orders(raw_orders, model_id: str = '', force: bool = True):
  model = resolve_llm_annotation_model(model_id)
  orders = parse_order_tokens(raw_orders)
  if not orders:
    raise RuntimeError('orders are required')
  results = []
  total_changed = 0
  total_rows = 0
  for order in orders:
    path = _session_cache_path(order)
    payload = read_trae_session_cache(order)
    rows = payload.get('rows') if isinstance(payload, dict) else []
    if not isinstance(rows, list) or not rows:
      results.append({'order': order, 'ok': False, 'changed': 0, 'rows': 0, 'error': '暂无会话缓存，请先刷新会话轮次'})
      continue
    try:
      changed = _annotate_session_rows(rows, use_model=True, model_config=model, force=force, strict_model=True)
      payload['rows'] = sort_session_rows_by_time(rows)
      payload['cached'] = True
      payload['llmAnnotatedAt'] = datetime.datetime.now().isoformat(timespec='seconds')
      payload['llmAnnotationModel'] = model.get('id') or model.get('model') or ''
      _persist_session_cache(path, payload)
      total_changed += int(changed or 0)
      total_rows += len(rows)
      results.append({'order': order, 'ok': True, 'changed': int(changed or 0), 'rows': len(rows)})
    except Exception as err:
      results.append({'order': order, 'ok': False, 'changed': 0, 'rows': len(rows), 'error': str(err)})
  return {
    'ok': True,
    'model': model,
    'orders': orders,
    'changed': total_changed,
    'rows': total_rows,
    'results': results,
  }


def resolve_text_setting(payload, key: str, default_value: str, label: str) -> str:
  if key not in payload:
    return default_value
  text = str(payload.get(key) or '').strip()
  if not text:
    raise RuntimeError(f'{label}不能为空')
  return text


def parse_feishu_task_target(task_url: str):
  url = str(task_url or '').strip()
  if not url:
    raise RuntimeError('飞书地址不能为空')
  parsed = urlparse(url)
  if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
    raise RuntimeError('飞书地址必须是完整的 http(s) 链接')
  match = re.search(r'/app/([^/?#]+)', parsed.path or '')
  if not match:
    raise RuntimeError('飞书地址必须包含 /app/<token>')
  page_id = (parse_qs(parsed.query).get('pageId') or [''])[0].strip()
  return {
    'url': url,
    'origin': parsed.netloc,
    'app_token': match.group(1),
    'page_id': page_id,
  }


def focus_feishu_task_tab(task_url: str, open_if_missing: bool = True):
  target = parse_feishu_task_target(task_url)
  url_literal = target['url'].replace('"', '\\"')
  origin_literal = target['origin'].replace('"', '\\"')
  app_literal = target['app_token'].replace('"', '\\"')
  page_literal = target['page_id'].replace('"', '\\"')
  missing_action = (
    'if not foundTab then set URL of active tab of front window to targetUrl'
    if open_if_missing
    else 'if not foundTab then error "未找到匹配的飞书多维表格标签页，请先打开飞书并选中截图列第一格"'
  )
  run_applescript([
    'tell application "Google Chrome"',
    'activate',
    'if (count of windows) is 0 then make new window',
    f'set targetUrl to "{url_literal}"',
    f'set targetOrigin to "{origin_literal}"',
    f'set targetApp to "{app_literal}"',
    f'set targetPageId to "{page_literal}"',
    'set foundTab to false',
    'repeat with w in windows',
    'repeat with i from 1 to count of tabs of w',
    'set tabUrl to URL of tab i of w',
    'if tabUrl contains targetOrigin and tabUrl contains targetApp and (targetPageId is "" or tabUrl contains targetPageId) then',
    'set active tab index of w to i',
    'set index of w to 1',
    'set foundTab to true',
    'exit repeat',
    'end if',
    'end repeat',
    'if foundTab then exit repeat',
    'end repeat',
    missing_action,
    'end tell',
  ])


def focus_existing_feishu_tab():
  return run_applescript([
    'tell application "Google Chrome"',
    'activate',
    'if (count of windows) is 0 then error "没有打开 Chrome 窗口"',
    'set foundTab to false',
    'set foundUrl to ""',
    'set frontWindow to front window',
    'set activeIndex to active tab index of frontWindow',
    'set tabCount to count of tabs of frontWindow',
    'repeat with delta from 0 to tabCount - 1',
    'set leftIndex to activeIndex - delta',
    'if leftIndex >= 1 then',
    'set tabUrl to URL of tab leftIndex of frontWindow',
    'if (tabUrl contains "feishu.cn") or (tabUrl contains "larksuite.com") then',
    'set active tab index of frontWindow to leftIndex',
    'set index of frontWindow to 1',
    'set foundTab to true',
    'set foundUrl to tabUrl',
    'exit repeat',
    'end if',
    'end if',
    'set rightIndex to activeIndex + delta',
    'if rightIndex <= tabCount and rightIndex is not equal to leftIndex then',
    'set tabUrl to URL of tab rightIndex of frontWindow',
    'if (tabUrl contains "feishu.cn") or (tabUrl contains "larksuite.com") then',
    'set active tab index of frontWindow to rightIndex',
    'set index of frontWindow to 1',
    'set foundTab to true',
    'set foundUrl to tabUrl',
    'exit repeat',
    'end if',
    'end if',
    'end repeat',
    'repeat with w in windows',
    'if foundTab then exit repeat',
    'repeat with i from 1 to count of tabs of w',
    'set tabUrl to URL of tab i of w',
    'if (tabUrl contains "feishu.cn") or (tabUrl contains "larksuite.com") then',
    'set active tab index of w to i',
    'set index of w to 1',
    'set foundTab to true',
    'set foundUrl to tabUrl',
    'exit repeat',
    'end if',
    'end repeat',
    'if foundTab then exit repeat',
    'end repeat',
    'if not foundTab then error "未找到已打开的飞书标签页，请先打开飞书多维表格并选中截图列第一格"',
    'return foundUrl',
    'end tell',
  ])


FEISHU_INIT_JS = r"""
(function () {
  function visible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 2 && rect.height > 2;
  }
  function text(el) {
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function clickElement(el) {
    const target = el.closest('button,[role="button"],[tabindex],a') || el;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = target.getBoundingClientRect();
    const options = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    target.dispatchEvent(new MouseEvent('mousedown', options));
    target.dispatchEvent(new MouseEvent('mouseup', options));
    target.click();
  }
  function clickText(label) {
    const nodes = Array.from(document.querySelectorAll('button,[role="button"],span,div,a'));
    const matches = nodes
      .filter((el) => visible(el) && text(el).includes(label))
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (ar.width * ar.height) - (br.width * br.height);
      });
    if (!matches.length) return false;
    clickElement(matches[0]);
    return true;
  }
  window.__feishuClaimBot = { rowIndex: 0, page: 1, selected: false, startedAt: Date.now() };
  const clickedTaskTab = clickText('领取任务');
  const clickedDetailList = clickText('详情列表');
  return JSON.stringify({ ok: true, clickedTaskTab, clickedDetailList });
})();
"""


FEISHU_SELECT_ROW_JS = r"""
(function () {
  const bot = window.__feishuClaimBot || (window.__feishuClaimBot = { rowIndex: 0, page: 1, selected: false });
  function visible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 2 && rect.height > 2;
  }
  function text(el) {
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function clickElement(el) {
    const target = el.closest('button,[role="button"],[tabindex],a') || el;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = target.getBoundingClientRect();
    const options = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    target.dispatchEvent(new MouseEvent('mousedown', options));
    target.dispatchEvent(new MouseEvent('mouseup', options));
    target.click();
  }
  function rowsFromDetailList() {
    const activePane = document.querySelector('.tabs-widget-tab-pane-active') || document;
    const rows = Array.from(activePane.querySelectorAll('tr.list-table-row-detail[data-index]'))
      .filter((row) => visible(row))
      .sort((a, b) => Number(a.dataset.index || 0) - Number(b.dataset.index || 0));
    if (rows.length) return rows;
    return Array.from(activePane.querySelectorAll('.list-aggregated-item-cell[data-simple-tooltip-text]'))
      .filter((el) => visible(el) && /^\d{2,8}$/.test(text(el)))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  }
  function clickNextPage() {
    const nextText = String((bot.page || 1) + 1);
    const pageButton = Array.from(document.querySelectorAll('button,[role="button"],span,div'))
      .find((el) => visible(el) && text(el) === nextText && el.getBoundingClientRect().top > window.innerHeight * 0.65);
    if (pageButton) {
      clickElement(pageButton);
      bot.page = (bot.page || 1) + 1;
      bot.rowIndex = 0;
      return true;
    }
    const nextButton = Array.from(document.querySelectorAll('button,[role="button"],[aria-label],[title]'))
      .find((el) => {
        if (!visible(el)) return false;
        const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${text(el)}`.toLowerCase();
        return label.includes('下一') || label.includes('next');
      });
    if (nextButton) {
      clickElement(nextButton);
      bot.page = (bot.page || 1) + 1;
      bot.rowIndex = 0;
      return true;
    }
    return false;
  }
  const rows = rowsFromDetailList();
  if (bot.claimedLast && bot.lastUid) {
    const previousIndex = rows.findIndex((item) => {
      const value = item.querySelector?.('.list-aggregated-item-cell')?.textContent || text(item);
      return value.trim() === String(bot.lastUid).trim();
    });
    if (previousIndex >= 0) bot.rowIndex = previousIndex + 1;
    bot.claimedLast = false;
  }
  if (bot.rowIndex >= rows.length) {
    const pageTurned = clickNextPage();
    return JSON.stringify({ ok: pageTurned, action: 'page', pageTurned, rowCount: rows.length, page: bot.page || 1 });
  }
  const row = rows[bot.rowIndex];
  const uid = (row.querySelector?.('.list-aggregated-item-cell')?.textContent || text(row)).trim();
  clickElement(row.querySelector?.('.list-table-row-container') || row);
  bot.selected = true;
  bot.lastUid = uid;
  return JSON.stringify({ ok: true, action: 'select', rowIndex: bot.rowIndex, uid, rowCount: rows.length, page: bot.page || 1 });
})();
"""


FEISHU_CLAIM_BUTTON_JS = r"""
(function () {
  const bot = window.__feishuClaimBot || (window.__feishuClaimBot = { rowIndex: 0, page: 1, selected: false });
  function visible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 2 && rect.height > 2;
  }
  function text(el) {
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function clickElement(el) {
    const target = el.closest('button,[role="button"],[tabindex],a') || el;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = target.getBoundingClientRect();
    const options = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    target.dispatchEvent(new MouseEvent('mousedown', options));
    target.dispatchEvent(new MouseEvent('mouseup', options));
    target.click();
  }
  const activePane = document.querySelector('.tabs-widget-tab-pane-active') || document;
  let buttons = Array.from(activePane.querySelectorAll('.bitable-card-edit-cell-editor-Button button'))
    .filter((el) => visible(el) && text(el).includes('领取题目'));
  if (!buttons.length) {
    buttons = Array.from(activePane.querySelectorAll('button'))
      .filter((el) => visible(el) && text(el).includes('领取题目'));
  }
  if (!buttons.length) {
    bot.rowIndex = (bot.rowIndex || 0) + 1;
    bot.selected = false;
    return JSON.stringify({ ok: false, action: 'claim', claimed: false, reason: '未找到领取题目按钮', rowIndex: bot.rowIndex });
  }
  clickElement(buttons[0]);
  bot.claimedLast = true;
  bot.selected = false;
  return JSON.stringify({ ok: true, action: 'claim', claimed: true, rowIndex: bot.rowIndex });
})();
"""


def claim_feishu_tasks(count: int, task_url: str):
  if sys.platform != 'darwin':
    raise RuntimeError('飞书领取自动化当前只支持 macOS + Google Chrome')
  if count <= 0 or count > 200:
    raise RuntimeError('领取数量必须在 1-200 之间')

  target = parse_feishu_task_target(task_url)
  focus_feishu_task_tab(target['url'])
  time.sleep(3.0)
  init_result = chrome_execute_js(FEISHU_INIT_JS)
  time.sleep(1.2)

  claimed = 0
  attempts = 0
  page_turns = 0
  events = []
  while claimed < count and attempts < count * 5:
    attempts += 1
    selected = chrome_execute_js(FEISHU_SELECT_ROW_JS)
    events.append(selected)
    if selected.get('action') == 'page':
      if selected.get('pageTurned'):
        page_turns += 1
        time.sleep(1.2)
        continue
      break
    if not selected.get('ok'):
      break
    time.sleep(0.65)
    result = chrome_execute_js(FEISHU_CLAIM_BUTTON_JS)
    events.append(result)
    if result.get('claimed'):
      claimed += 1
    time.sleep(0.9)

  return {
    'ok': True,
    'task_url': target['url'],
    'requested': count,
    'claimed': claimed,
    'attempts': attempts,
    'page_turns': page_turns,
    'init': init_result,
    'events': events[-12:],
  }


def _applescript_string(value: str) -> str:
  return str(value or '').replace('\\', '\\\\').replace('"', '\\"')


def _data_url_image_bytes(data_url: str):
  text = str(data_url or '').strip()
  match = re.fullmatch(r'data:([^;,]+(?:;[^,]+)?);base64,(.+)', text, re.DOTALL)
  if not match:
    return '', b''
  mime_type = match.group(1).split(';', 1)[0]
  if not mime_type.startswith('image/'):
    return '', b''
  return mime_type, base64.b64decode(match.group(2), validate=True)


def _save_feishu_paste_image(data_url: str, index: int) -> str:
  mime_type, image_bytes = _data_url_image_bytes(data_url)
  if not image_bytes:
    return ''
  if len(image_bytes) > 30 * 1024 * 1024:
    raise RuntimeError('截图图片超过 30MB')
  os.makedirs(FEISHU_SCREENSHOT_PASTE_DIR, exist_ok=True)
  extension = image_extension_from_mime(mime_type) or '.png'
  path = os.path.join(FEISHU_SCREENSHOT_PASTE_DIR, f'paste_{int(time.time() * 1000)}_{index}{extension}')
  with open(path, 'wb') as file:
    file.write(image_bytes)
  return path


def _valid_feishu_paste_image_path(path: str) -> str:
  image_path = os.path.abspath(str(path or '').strip())
  workspace_root = os.path.abspath(TRAE_WORKSPACE_STORAGE_DIR)
  if (
    not image_path
    or not image_path.startswith(workspace_root + os.sep)
    or f'{os.sep}images{os.sep}' not in image_path
    or not os.path.isfile(image_path)
  ):
    return ''
  return image_path


def _copy_png_file_to_macos_clipboard(image_path: str):
  safe_path = _applescript_string(os.path.abspath(image_path))
  run_applescript([
    f'set imageFile to POSIX file "{safe_path}"',
    'set the clipboard to (read imageFile as «class PNGf»)',
  ])


def _compose_feishu_paste_images(image_paths, index: int) -> str:
  valid_paths = [path for path in image_paths if path]
  if not valid_paths:
    return ''
  if len(valid_paths) == 1:
    return valid_paths[0]
  ffmpeg = shutil.which('ffmpeg') or '/opt/homebrew/bin/ffmpeg'
  if not ffmpeg or not os.path.isfile(ffmpeg):
    raise RuntimeError('未找到 ffmpeg，无法合成多张截图')
  os.makedirs(FEISHU_SCREENSHOT_PASTE_DIR, exist_ok=True)
  output_path = os.path.join(
    FEISHU_SCREENSHOT_PASTE_DIR,
    f'paste_compose_{int(time.time() * 1000)}_{index}.png',
  )
  max_width = 900
  canvas_width = max_width + 24
  gap = 12
  filters = []
  labels = []
  for input_index, _path in enumerate(valid_paths):
    label = f'v{input_index}'
    labels.append(f'[{label}]')
    height_expr = f'ih+{gap}' if input_index < len(valid_paths) - 1 else 'ih'
    filters.append(
      f'[{input_index}:v]'
      f'scale=w=if(gt(iw\\,{max_width})\\,{max_width}\\,iw):h=-2:flags=lanczos,'
      f'format=rgba,'
      f'pad={canvas_width}:{height_expr}:(ow-iw)/2:0:color=white,'
      f'setsar=1[{label}]'
    )
  filters.append(
    ''.join(labels)
    + f'vstack=inputs={len(valid_paths)},pad=iw:ih+24:0:12:color=white,format=rgba[out]'
  )
  cmd = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-y']
  for path in valid_paths:
    cmd.extend(['-i', path])
  cmd.extend(['-filter_complex', ';'.join(filters), '-map', '[out]', '-frames:v', '1', output_path])
  completed = subprocess.run(cmd, text=True, capture_output=True, check=False)
  if completed.returncode != 0 or not os.path.isfile(output_path):
    detail = completed.stderr.strip() or completed.stdout.strip() or 'ffmpeg compose failed'
    raise RuntimeError(f'合成多张截图失败：{detail}')
  return output_path


def _feishu_paste_current_clipboard_and_move(delay_seconds: float):
  run_applescript([
    'tell application "Google Chrome" to activate',
    'tell application "System Events"',
    'keystroke "v" using command down',
    f'delay {max(0.1, delay_seconds):.2f}',
    'key code 125',
    'delay 0.08',
    'end tell',
  ])


def _feishu_move_down_only():
  run_applescript([
    'tell application "Google Chrome" to activate',
    'tell application "System Events"',
    'key code 125',
    'delay 0.08',
    'end tell',
  ])


def _copy_text_to_macos_clipboard(text: str):
  value = str(text or '')
  if len(value) > 20 * 1024 * 1024:
    raise RuntimeError('待粘贴文本超过 20MB')
  run_cmd(['pbcopy'], check=True, input_text=value)


def _feishu_paste_current_clipboard(delay_seconds: float):
  run_applescript([
    'tell application "Google Chrome" to activate',
    'tell application "System Events"',
    'keystroke "v" using command down',
    f'delay {max(0.1, delay_seconds):.2f}',
    'end tell',
  ])


def _feishu_text_paste_delay(key: str, chars: int, rows: int, requested_delay: float) -> float:
  base = max(0.35, float(requested_delay or 0))
  size_delay = max(0.0, int(chars or 0) / 7500.0)
  row_delay = min(4.0, max(0, int(rows or 0)) * 0.08)
  delay = base + size_delay + row_delay
  if key == 'logTrace':
    return max(base, min(45.0, delay))
  if key == 'conversation':
    return max(base, min(12.0, delay))
  return max(base, min(5.0, delay))


def _feishu_move_horizontal(steps: int, delay_seconds: float = 0.08):
  count = abs(int(steps or 0))
  if count <= 0:
    return
  key_code = 124 if steps > 0 else 123
  run_applescript([
    'tell application "Google Chrome" to activate',
    'tell application "System Events"',
    f'repeat {count} times',
    f'key code {key_code}',
    f'delay {max(0.02, delay_seconds):.2f}',
    'end repeat',
    'end tell',
  ])


def _feishu_text_column(rows, key: str):
  values = []
  for row in rows:
    if isinstance(row, dict):
      values.append(str(row.get(key) or '').replace('\r\n', ' ').replace('\n', ' ').strip() or '-')
    else:
      values.append('-')
  return '\n'.join(values)


def _feishu_paste_text_column(rows, key: str, label: str, delay_seconds: float):
  text = _feishu_text_column(rows, key)
  paste_delay = _feishu_text_paste_delay(key, len(text), len(rows), delay_seconds)
  print(
    f'[feishu-batch-paste] paste text label={label} rows={len(rows)} chars={len(text)} delay={paste_delay:.2f}s',
    flush=True,
  )
  _copy_text_to_macos_clipboard(text)
  _feishu_paste_current_clipboard(paste_delay)
  print(f'[feishu-batch-paste] text done label={label}', flush=True)
  return {'label': label, 'key': key, 'rows': len(rows), 'chars': len(text), 'delaySeconds': paste_delay}


def paste_feishu_screenshots(rows, task_url: str, delay_ms: int = 850, focus_tab: bool = True):
  if sys.platform != 'darwin':
    raise RuntimeError('自动粘贴截图当前只支持 macOS + Google Chrome')
  if not isinstance(rows, list) or not rows:
    raise RuntimeError('rows 不能为空')
  if len(rows) > 300:
    raise RuntimeError('一次最多粘贴 300 行')
  print(f'[feishu-paste] start rows={len(rows)} delay_ms={delay_ms}', flush=True)
  focused_tab = ''
  if focus_tab:
    focused_tab = focus_existing_feishu_tab()
    time.sleep(0.8)
  delay_seconds = max(0.25, min(3.0, int(delay_ms or 850) / 1000.0))
  pasted = 0
  empty = 0
  events = []
  for index, row in enumerate(rows, start=1):
    if not isinstance(row, dict):
      empty += 1
      _feishu_move_down_only()
      continue
    data_url = str(row.get('dataUrl') or row.get('data_url') or '').strip()
    image_paths = row.get('imagePaths') or row.get('image_paths') or []
    if not isinstance(image_paths, list):
      image_paths = []
    order = str(row.get('order') or '').strip()
    index_in_order = row.get('indexInOrder') or row.get('index_in_order') or ''
    valid_image_paths = []
    for candidate_path in image_paths:
      valid_path = _valid_feishu_paste_image_path(candidate_path)
      if valid_path:
        valid_image_paths.append(valid_path)
    image_path = ''
    if valid_image_paths:
      image_path = _compose_feishu_paste_images(valid_image_paths, index)
    if not image_path and data_url:
      image_path = _save_feishu_paste_image(data_url, index)
    if not image_path:
      empty += 1
      _feishu_move_down_only()
      events.append({'index': index, 'order': order, 'indexInOrder': index_in_order, 'action': 'move-empty'})
      continue
    _copy_png_file_to_macos_clipboard(image_path)
    _feishu_paste_current_clipboard_and_move(delay_seconds)
    pasted += 1
    events.append({
      'index': index,
      'order': order,
      'indexInOrder': index_in_order,
      'action': 'paste',
      'imageCount': len(valid_image_paths) if valid_image_paths else 1,
      'file': os.path.basename(image_path),
    })
    print(f'[feishu-paste] pasted {index}/{len(rows)} {order}#{index_in_order} images={len(valid_image_paths) if valid_image_paths else 1} file={os.path.basename(image_path)}', flush=True)
  return {
    'ok': True,
    'total': len(rows),
    'pasted': pasted,
    'empty': empty,
    'delayMs': int(delay_seconds * 1000),
    'focusedTab': focused_tab,
    'events': events[-30:],
  }


def paste_feishu_batch_sessions(rows, delay_ms: int = 1200):
  if sys.platform != 'darwin':
    raise RuntimeError('自动粘贴主要列当前只支持 macOS + Google Chrome')
  if not isinstance(rows, list) or not rows:
    raise RuntimeError('rows 不能为空')
  if len(rows) > 300:
    raise RuntimeError('一次最多粘贴 300 行')

  print(f'[feishu-batch-paste] start rows={len(rows)} delay_ms={delay_ms}', flush=True)
  focused_tab = focus_existing_feishu_tab()
  time.sleep(0.8)
  delay_seconds = max(0.35, min(3.0, int(delay_ms or 1200) / 1000.0))
  events = []

  # 起点必须是飞书 User Prompt 列第一行。偏移按当前多维表格模板固定：
  # User Prompt -> 不满意原因(+6) -> 分支/文件夹(+2) -> 日志轨迹(+2)
  # -> 截图(-1)。截图最后逐行粘贴，因为图片粘贴会向下移动光标。
  # Trae Session ID 暂不纳入总按钮。
  events.append(_feishu_paste_text_column(rows, 'conversation', 'User Prompt', delay_seconds))
  _feishu_move_horizontal(6, delay_seconds=0.16)
  events.append(_feishu_paste_text_column(rows, 'dissatisfactionReason', '不满意原因', delay_seconds))
  _feishu_move_horizontal(2, delay_seconds=0.16)
  events.append(_feishu_paste_text_column(rows, 'order', '分支/文件夹', delay_seconds))
  _feishu_move_horizontal(2, delay_seconds=0.16)
  events.append(_feishu_paste_text_column(rows, 'logTrace', '日志轨迹', delay_seconds))
  _feishu_move_horizontal(-1, delay_seconds=0.16)

  screenshot_result = paste_feishu_screenshots(
    rows,
    '',
    delay_ms=max(1200, int(delay_ms or 1200)),
    focus_tab=False,
  )
  result = {
    'ok': True,
    'total': len(rows),
    'focusedTab': focused_tab,
    'textColumns': len(events),
    'events': events,
    'screenshots': screenshot_result,
  }
  print(
    f"[feishu-batch-paste] done rows={len(rows)} textColumns={len(events)} "
    f"screenshots={screenshot_result.get('pasted', 0)} empty={screenshot_result.get('empty', 0)}",
    flush=True,
  )
  return result


def sanitize_branch_name(value: str) -> str:
  text = str(value or '').strip().lower()
  text = re.sub(r'[^a-z0-9._/-]+', '-', text)
  text = re.sub(r'/+', '/', text).strip('/.-')
  return text or 'sync-unknown'


def github_repo_dir(repo_url: str) -> str:
  normalized = str(repo_url or '').strip()
  repo_name = normalized.rstrip('/').rsplit('/', 1)[-1]
  repo_name = re.sub(r'\.git$', '', repo_name, flags=re.IGNORECASE)
  repo_name = safe_segment(repo_name).lower()
  digest = hashlib.sha1(normalized.encode('utf-8')).hexdigest()[:10]
  return os.path.join(GITHUB_MIRROR_ROOT, f'{repo_name}-{digest}')


def folder_has_sync_content(path: str) -> bool:
  if not os.path.isdir(path):
    return False
  for root, dirs, files in os.walk(path):
    dirs[:] = [name for name in dirs if name != '.git']
    if files:
      return True
  return False


def ensure_github_repo(repo_url: str) -> str:
  repo_dir = github_repo_dir(repo_url)
  git_dir = os.path.join(repo_dir, '.git')
  current_remote = ''
  if os.path.isdir(git_dir):
    current_remote = run_cmd(['git', 'remote', 'get-url', 'origin'], cwd=repo_dir, check=False).stdout.strip()
    if current_remote and current_remote != repo_url:
      log_sync(f'repo cache remote changed from {current_remote} to {repo_url}; rebuilding mirror directory')
      shutil.rmtree(repo_dir)
      git_dir = os.path.join(repo_dir, '.git')

  if not os.path.isdir(git_dir):
    parent = os.path.dirname(repo_dir)
    os.makedirs(parent, exist_ok=True)
    if os.path.exists(repo_dir):
      log_sync('repo cache is missing .git; rebuilding mirror directory')
      shutil.rmtree(repo_dir)
    run_cmd(['git', 'clone', repo_url, repo_dir], check=True)
  else:
    run_cmd(['git', 'remote', 'set-url', 'origin', repo_url], cwd=repo_dir, check=True)

  run_cmd(['git', 'fetch', '--all', '--prune'], cwd=repo_dir, check=True)

  user_name = run_cmd(['git', 'config', '--get', 'user.name'], cwd=repo_dir, check=False).stdout.strip()
  user_email = run_cmd(['git', 'config', '--get', 'user.email'], cwd=repo_dir, check=False).stdout.strip()
  if not user_name:
    run_cmd(['git', 'config', 'user.name', 'Trae Sync Bot'], cwd=repo_dir, check=True)
  if not user_email:
    run_cmd(['git', 'config', 'user.email', 'trae-sync-bot@local'], cwd=repo_dir, check=True)
  return repo_dir


def default_remote_branch(repo_dir: str):
  ref = run_cmd(
    ['git', 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD'],
    cwd=repo_dir,
    check=False,
  ).stdout.strip()
  if ref.startswith('origin/'):
    return ref.split('/', 1)[1]
  return 'main'


def remote_branch_exists(repo_dir: str, branch: str) -> bool:
  out = run_cmd(['git', 'ls-remote', '--heads', 'origin', branch], cwd=repo_dir, check=True).stdout.strip()
  return bool(out)


def reset_github_worktree(repo_dir: str):
  # This directory is a generated mirror used only for GitHub sync.
  # Reset before each branch switch so a failed previous sync cannot poison the next one.
  run_cmd(['git', 'reset', '--hard'], cwd=repo_dir, check=True)
  run_cmd(['git', 'clean', '-fdx'], cwd=repo_dir, check=True)


def remove_sync_excluded_artifacts(path: str):
  for root, dirs, files in os.walk(path, topdown=True):
    dirs[:] = [name for name in dirs if name != '.git']
    for name in list(dirs):
      if name in SYNC_EXCLUDED_DIR_NAMES:
        shutil.rmtree(os.path.join(root, name), ignore_errors=True)
        dirs.remove(name)
    for name in files:
      if name in SYNC_EXCLUDED_FILE_NAMES or any(fnmatch.fnmatch(name, pattern) for pattern in SYNC_EXCLUDED_FILE_PATTERNS):
        try:
          os.remove(os.path.join(root, name))
        except FileNotFoundError:
          pass


def sync_one_completed_prompt(prompt: dict, order_token: str, base_branch: str, repo_dir: str):
  prompt_id = str(prompt.get('id') or '').strip()
  scene = scene_segment(prompt.get('business_domain'))
  source_dir = os.path.join(TRAE_ROOT, scene, str(order_token))
  if not folder_has_sync_content(source_dir):
    return {'prompt_id': prompt_id, 'order': str(order_token), 'status': 'skipped', 'reason': 'source folder is empty'}

  branch = sanitize_branch_name(str(order_token))
  existed = remote_branch_exists(repo_dir, branch)
  reset_github_worktree(repo_dir)
  log_sync(f'{order_token}: checkout {branch}')
  if existed:
    run_cmd(['git', 'checkout', '-B', branch, f'origin/{branch}'], cwd=repo_dir, check=True)
  else:
    run_cmd(['git', 'checkout', '-B', branch, f'origin/{base_branch}'], cwd=repo_dir, check=True)
  run_cmd(['git', 'branch', '--unset-upstream'], cwd=repo_dir, check=False)

  # Keep branch content in sync with the local project folder.
  rsync_cmd = ['rsync', '-a', '--delete']
  for pattern in SYNC_EXCLUDES:
    rsync_cmd.append(f'--exclude={pattern}')
  rsync_cmd.extend([f'{source_dir}/', f'{repo_dir}/'])
  log_sync(f'{order_token}: copy files')
  run_cmd(rsync_cmd, check=True)
  remove_sync_excluded_artifacts(repo_dir)

  changed = run_cmd(['git', 'status', '--porcelain'], cwd=repo_dir, check=True).stdout.strip()
  commit_created = False
  if changed:
    log_sync(f'{order_token}: commit changes')
    run_cmd(['git', 'add', '-A'], cwd=repo_dir, check=True)
    run_cmd(['git', 'commit', '-m', f'sync: {branch} ({prompt_id})'], cwd=repo_dir, check=True)
    commit_created = True

  log_sync(f'{order_token}: push {branch}')
  if existed:
    run_cmd(['git', 'push', '--force', 'origin', f'HEAD:refs/heads/{branch}'], cwd=repo_dir, check=True)
    action = 'force-synced'
  else:
    run_cmd(['git', 'push', '-u', 'origin', branch], cwd=repo_dir, check=True)
    action = 'created-and-synced'

  result = {
    'prompt_id': prompt_id,
    'order': str(order_token),
    'branch': branch,
    'status': 'synced',
    'action': action,
    'synced_before': existed,
    'commit_created': commit_created,
  }
  if not commit_created:
    result['reason'] = 'no file changes'
  return result


def sync_all_completed_to_github(repo_url: str):
  log_sync('start')
  repo_dir = ensure_github_repo(repo_url)
  base_branch = default_remote_branch(repo_dir)

  prompts = load_prompts()
  state = read_json(STATE_FILE, {'completed': {}, 'orders': {}})
  completed_map = state.get('completed', {}) if isinstance(state, dict) else {}
  order_map = state.get('orders', {}) if isinstance(state, dict) else {}

  completed_ids = {
    pid for pid, info in completed_map.items()
    if isinstance(info, dict) and info.get('completed')
  }

  prompt_by_id = {str(prompt.get('id')): prompt for prompt in prompts}
  target_ids = [pid for pid in completed_ids if pid in prompt_by_id]
  target_ids.sort()

  results = []
  for index, prompt_id in enumerate(target_ids, start=1):
    prompt = prompt_by_id[prompt_id]
    order_token = normalize_order_token(prompt, order_map.get(prompt_id, default_order_token(prompt)))
    log_sync(f'{index}/{len(target_ids)} {order_token}')
    if order_token in (None, ''):
      results.append({'prompt_id': prompt_id, 'status': 'skipped', 'reason': 'missing order token'})
      continue
    try:
      result = sync_one_completed_prompt(prompt, str(order_token), base_branch, repo_dir)
      results.append(result)
    except Exception as err:
      results.append({
        'prompt_id': prompt_id,
        'order': str(order_token),
        'status': 'failed',
        'reason': str(err),
      })
      log_sync(f'{order_token}: failed: {err}')

  synced = sum(1 for item in results if item.get('status') == 'synced')
  skipped = sum(1 for item in results if item.get('status') == 'skipped')
  failed = sum(1 for item in results if item.get('status') == 'failed')
  payload = {
    'ok': True,
    'repo': repo_url,
    'repo_dir': repo_dir,
    'base_branch': base_branch,
    'completed_total': len(target_ids),
    'synced': synced,
    'skipped': skipped,
    'failed': failed,
    'results': results,
  }
  log_sync(f'done synced={synced} skipped={skipped} failed={failed}')
  return payload


def _safe_json_loads(text, fallback):
  try:
    return json.loads(text)
  except Exception:
    return fallback


def _workspace_folder_to_path(value):
  if isinstance(value, dict):
    value = value.get('path') or value.get('uri') or ''
  text = str(value or '').strip()
  if text.startswith('file://'):
    return unquote(re.sub(r'^file://', '', text).rstrip('/'))
  return unquote(text.rstrip('/'))


def _find_workspace_db_for_order(order_token: str):
  order_token = _normalize_order_token_text(order_token)
  if not order_token:
    raise RuntimeError('order is required')

  ws_root = TRAE_WORKSPACE_STORAGE_DIR
  if not os.path.isdir(ws_root):
    raise RuntimeError(f'workspace storage not found: {ws_root}')

  project_paths = set()
  for path in project_path_candidates_for_order(order_token):
    if path:
      project_paths.add(os.path.realpath(path))

  candidates = []

  for record in _iter_workspace_db_records() or []:
    folder_path = record.get('folderPath') or ''
    folder_real_path = record.get('folderRealPath') or os.path.realpath(folder_path)
    db_path = record.get('dbPath') or ''
    ws_json = record.get('workspaceJson') or ''
    basename = _normalize_order_token_text(os.path.basename(folder_path.rstrip('/')))
    score = 0
    if folder_real_path in project_paths:
      score = 3
    elif basename == order_token:
      score = 2
    elif f'/{order_token}/' in f'{folder_path.rstrip("/")}/':
      score = 1
    if score <= 0:
      continue
    try:
      mtime = os.path.getmtime(ws_json)
    except Exception:
      mtime = 0
    candidates.append((score, mtime, db_path))

  if not candidates:
    raise RuntimeError(f'workspace db not found for {order_token}')
  candidates.sort(reverse=True)
  return candidates[0][2]


def _recent_trae_log_files(limit=80):
  logs_home = os.path.join(TRAE_APP_SUPPORT_DIR, 'logs')
  ai_agent_files = []
  renderer_files = []
  if not os.path.isdir(logs_home):
    return ai_agent_files, renderer_files
  for root, _, files in os.walk(logs_home):
    for name in files:
      if not name.endswith('.log'):
        continue
      full = os.path.join(root, name)
      if 'ai-agent' in name:
        ai_agent_files.append(full)
      elif 'renderer' in name:
        renderer_files.append(full)
  key = lambda item: os.path.getmtime(item)
  return (
    sorted(ai_agent_files, key=key, reverse=True)[:limit],
    sorted(renderer_files, key=key, reverse=True)[:limit],
  )


def _iter_recent_log_lines(path: str, max_bytes: int = TRAE_LOG_TAIL_BYTES):
  try:
    with open(path, 'rb') as f:
      f.seek(0, os.SEEK_END)
      size = f.tell()
      f.seek(max(0, size - max_bytes))
      if size > max_bytes:
        f.readline()
      data = f.read(max_bytes)
  except Exception:
    return []
  return data.decode('utf-8', errors='ignore').splitlines()


def _iter_full_log_lines(path: str):
  try:
    with open(path, 'rb') as f:
      for raw_line in f:
        yield raw_line.decode('utf-8', errors='ignore').rstrip('\n')
  except Exception:
    return


def _session_message_candidates(line: str, current_session_id: str):
  candidates = []
  seen_candidates = set()

  def _add(candidate: str):
    if not re.fullmatch(r'[0-9a-f]{24}', candidate):
      return
    if candidate == current_session_id or candidate in seen_candidates:
      return
    seen_candidates.add(candidate)
    candidates.append(candidate)

  m_pair = re.search(r'create message, chat_session_id:\s*([0-9a-f]{24}), message_id:\s*([0-9a-f]{24})', line)
  if m_pair:
    _add(m_pair.group(2))

  m_create_version = re.search(r'create_new_version(?:_v2)?(?: chat_session_id:)?\s*([0-9a-f]{24})?.*?message_id[:=]\s*([0-9a-f]{24})', line)
  if m_create_version and 'task_id' not in line:
    _add(m_create_version.group(2))

  m_finish = re.search(r'chat_turn_finish completed: session_id=([0-9a-f]{24}), message_id=([0-9a-f]{24})', line)
  if m_finish:
    _add(m_finish.group(2))

  m_snapshot = re.search(r'create snapshot, chat_session_id: ([0-9a-f]{24}), message_id: ([0-9a-f]{24})', line)
  if m_snapshot:
    _add(m_snapshot.group(2))

  m_plan_user = re.search(r'plan tool call finish .*?user_message_id[:=]\s*([0-9a-f]{24})', line)
  if m_plan_user:
    _add(m_plan_user.group(1))

  m_renderer = re.search(r'\"session_id\":\"([0-9a-f]{24})\".*\"message_id\":\"([0-9a-f]{24})\"', line)
  if m_renderer:
    _add(m_renderer.group(2))

  if 'task_id' not in line:
    m_message = re.search(r'(?:message_id|user_message_id)[:=]\s*([0-9a-f]{24})', line)
    if m_message:
      _add(m_message.group(1))

  return candidates


def _object_id_time_text(value: str) -> str:
  match = re.match(r'^([0-9a-f]{8})[0-9a-f]{16}$', str(value or '').strip())
  if not match:
    return ''
  try:
    dt = datetime.datetime.fromtimestamp(
      int(match.group(1), 16),
      datetime.timezone(datetime.timedelta(hours=3)),
    ).replace(tzinfo=None)
  except Exception:
    return ''
  return f"{dt.year}/{dt.month}/{dt.day} {dt.strftime('%H:%M:%S')}"


def _meta_map_has_incomplete(meta_map: dict, chat_ids) -> bool:
  seen_chat_ids = set()
  for chat_id in chat_ids:
    chat_id = str(chat_id or '').rsplit('-', 1)[0]
    if not re.fullmatch(r'[0-9a-f]{24}', chat_id):
      continue
    if chat_id in seen_chat_ids:
      continue
    seen_chat_ids.add(chat_id)
    meta = meta_map.get(chat_id)
    if not meta or not all((meta.get('sessionId'), meta.get('chatMessageId'), meta.get('taskMessageId'), meta.get('traceId'), meta.get('time'))):
      return True
  return False


def _session_cache_path(order_token: str):
  safe_order = safe_segment(str(order_token or '').strip())
  if not safe_order:
    raise RuntimeError('order is required')
  return os.path.join(TRAE_SESSION_CACHE_DIR, f'{safe_order}.json')


def _trae_media_extension(resource_id: str) -> str:
  text = str(resource_id or '').strip()
  m_ext = re.search(r'\.(png|jpe?g|webp|gif|svg)(?:$|[?#])', text, re.IGNORECASE)
  if m_ext:
    ext = m_ext.group(1).lower()
    return '.jpg' if ext == 'jpeg' else f'.{ext}'
  m_token = re.search(r'_(png|jpe?g|webp|gif|svg)(?:_|$)', text, re.IGNORECASE)
  if m_token:
    ext = m_token.group(1).lower()
    return '.jpg' if ext == 'jpeg' else f'.{ext}'
  return '.png'


def _trae_media_local_path(resource_id: str, db_path: str = '') -> str:
  resource = str(resource_id or '').strip()
  if not resource:
    return ''
  encoded_name = f'{quote(resource, safe="")}{_trae_media_extension(resource)}'
  search_dirs = []
  if db_path:
    workspace_dir = os.path.dirname(os.path.abspath(db_path))
    search_dirs.append(os.path.join(workspace_dir, 'images'))
  for images_dir in search_dirs:
    candidate = os.path.join(images_dir, encoded_name)
    if os.path.isfile(candidate):
      return candidate
  if not os.path.isdir(TRAE_WORKSPACE_STORAGE_DIR):
    return ''
  try:
    for workspace_name in os.listdir(TRAE_WORKSPACE_STORAGE_DIR):
      images_dir = os.path.join(TRAE_WORKSPACE_STORAGE_DIR, workspace_name, 'images')
      candidate = os.path.join(images_dir, encoded_name)
      if os.path.isfile(candidate):
        return candidate
  except Exception:
    return ''
  return ''


def _trae_session_image_url(path: str) -> str:
  if not path:
    return ''
  return f'/api/trae-session-image?path={quote(os.path.abspath(path), safe="")}'


def _normalize_trae_media_items(item: dict, db_path: str = ''):
  if not isinstance(item, dict):
    return []
  media_items = []
  for key in ('multiMedia', 'images'):
    values = item.get(key)
    if isinstance(values, list):
      media_items.extend(values)
  screenshots = []
  seen = set()
  for media_item in media_items:
    if not isinstance(media_item, dict):
      continue
    resource_id = str(
      media_item.get('resource_id')
      or media_item.get('resourceId')
      or media_item.get('url')
      or media_item.get('src')
      or ''
    ).strip()
    resource_type = str(media_item.get('resource_type') or media_item.get('type') or '').strip()
    if not resource_id:
      continue
    if resource_type and 'image' not in resource_type.lower() and not re.search(r'image|_(png|jpe?g|webp|gif|svg)_', resource_id, re.IGNORECASE):
      continue
    if resource_id in seen:
      continue
    seen.add(resource_id)
    local_path = _trae_media_local_path(resource_id, db_path)
    screenshots.append({
      'resourceId': resource_id,
      'resourceType': resource_type or 'image',
      'path': local_path,
      'url': _trae_session_image_url(local_path) if local_path else '',
      'filename': os.path.basename(local_path) if local_path else os.path.basename(resource_id),
    })
  return screenshots


def _fill_session_screenshots_from_input_history(order_token: str, payload: dict) -> bool:
  if not isinstance(payload, dict):
    return False
  rows = payload.get('rows')
  if not isinstance(rows, list) or not rows:
    return False
  db_path = str(payload.get('db_path') or '').strip()
  if not db_path:
    try:
      db_path = _find_workspace_db_for_order(order_token)
      payload['db_path'] = db_path
    except Exception:
      return False
  try:
    con = sqlite3.connect(db_path)
    try:
      cur = con.cursor()
      cur.execute("select value from ItemTable where key='icube-ai-agent-storage-input-history'")
      result = cur.fetchone()
    finally:
      con.close()
  except Exception:
    return False
  input_history = _safe_json_loads(result[0] if result else '[]', [])
  if not isinstance(input_history, list):
    return False
  effective_items = []
  previous_text = None
  for item in input_history:
    if not isinstance(item, dict):
      continue
    text = str(item.get('inputText') or '').strip()
    screenshots = _normalize_trae_media_items(item, db_path)
    if text and text == previous_text and not screenshots:
      continue
    effective_items.append((item, screenshots))
    previous_text = text
  changed = False
  for index, row in enumerate(rows):
    if not isinstance(row, dict) or index >= len(effective_items):
      continue
    screenshots = effective_items[index][1]
    if screenshots != row.get('screenshots'):
      row['screenshots'] = screenshots
      changed = True
  return changed


def _is_trae_composite_session_id(value: str) -> bool:
  return bool(re.match(
    r'^\.[^:\s]+:[0-9a-f]{32}_[0-9a-f]{24}\.[0-9a-f]{24}\.[0-9a-f]{24}:Trae CN\.T\(',
    str(value or '').strip(),
  ))


def _has_missing_trace(value: str) -> bool:
  return 'missing_trace' in str(value or '')


def _raw_session_id_from_composite(value: str) -> str:
  match = re.match(
    r'^\.[^:\s]+:[0-9a-f]{32}_([0-9a-f]{24})\.[0-9a-f]{24}\.[0-9a-f]{24}:Trae CN\.T\(',
    str(value or '').strip(),
  )
  return match.group(1) if match else ''


def _parse_trae_composite_session_id(value: str):
  match = re.match(
    r'^\.[^:\s]+:([0-9a-f]{32})_([0-9a-f]{24})\.([0-9a-f]{24})\.([0-9a-f]{24}):Trae CN\.T\(',
    str(value or '').strip(),
  )
  if not match:
    return {}
  return {
    'traceId': match.group(1),
    'sessionId': match.group(2),
    'taskMessageId': match.group(3),
    'chatMessageId': match.group(4),
  }


def _trae_composite_time_text(value: str) -> str:
  match = re.search(r':Trae CN\.T\(([^)]+)\)', str(value or '').strip())
  return match.group(1).strip() if match else ''


def _parse_trae_composite_time(value: str):
  match = re.search(
    r'(\d{4})/(\d{1,2})/(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})',
    str(value or '').strip(),
  )
  if not match:
    return None
  try:
    return datetime.datetime(
      int(match.group(1)),
      int(match.group(2)),
      int(match.group(3)),
      int(match.group(4)),
      int(match.group(5)),
      int(match.group(6)),
    )
  except ValueError:
    return None


def _session_row_composite_parts(row: dict):
  if not isinstance(row, dict):
    return {}
  for key in ('sessionId', 'logTraceId', 'sessionComposite', 'compositeLogTrace', 'invalidSessionComposite', 'logTrace'):
    parsed = _parse_trae_composite_session_id(row.get(key) or '')
    if parsed:
      return parsed
  return {}


def _has_real_task_message_id(parts: dict) -> bool:
  return bool(
    parts
    and parts.get('taskMessageId')
    and parts.get('chatMessageId')
    and parts.get('taskMessageId') != parts.get('chatMessageId')
  )


def _session_rows_quality(rows) -> tuple:
  if not isinstance(rows, list):
    return (0, 0, 0)
  valid_composites = 0
  real_task_message_ids = 0
  for row in rows:
    parts = _session_row_composite_parts(row)
    if not parts:
      continue
    valid_composites += 1
    if _has_real_task_message_id(parts):
      real_task_message_ids += 1
  return (len(rows), real_task_message_ids, valid_composites)


def normalize_trae_session_rows(rows):
  if not isinstance(rows, list):
    return []
  normalized = []
  for row in rows:
    if not isinstance(row, dict):
      continue
    row.pop('taskType', None)
    row.pop('taskSolution', None)
    session_id_text = str(row.get('sessionId') or '').strip()
    raw_session_id_text = str(row.get('rawSessionId') or '').strip()
    log_trace_text = str(row.get('logTrace') or '').strip()
    log_trace_id_text = str(row.get('logTraceId') or '').strip()
    session_composite_text = str(
      row.get('sessionComposite')
      or row.get('compositeLogTrace')
      or row.get('invalidSessionComposite')
      or ''
    ).strip()
    if _has_missing_trace(session_id_text) or _has_missing_trace(log_trace_text):
      if raw_session_id_text:
        row['sessionId'] = raw_session_id_text
      else:
        row.pop('sessionId', None)
      row['logTrace'] = ''
      normalized.append(row)
      continue
    composite_text = ''
    if _is_trae_composite_session_id(session_id_text):
      composite_text = session_id_text
    elif _is_trae_composite_session_id(log_trace_id_text):
      composite_text = log_trace_id_text
    elif _is_trae_composite_session_id(session_composite_text):
      composite_text = session_composite_text
    elif _is_trae_composite_session_id(log_trace_text):
      composite_text = log_trace_text
    elif session_id_text.startswith('.') and not _is_trae_composite_session_id(log_trace_text):
      composite_text = session_id_text

    if composite_text:
      row['logTraceId'] = composite_text
      row['sessionComposite'] = composite_text
      row.pop('invalidSessionComposite', None)
      if _is_trae_composite_session_id(log_trace_text):
        row['logTrace'] = ''
      parsed_session_id = _raw_session_id_from_composite(composite_text)
      raw_session_id_text = raw_session_id_text or parsed_session_id

    if raw_session_id_text:
      row['rawSessionId'] = raw_session_id_text
    if composite_text:
      row['sessionId'] = composite_text
    elif not session_id_text and raw_session_id_text:
      row['sessionId'] = raw_session_id_text
    elif session_id_text.startswith('.') and not raw_session_id_text:
      row['logTraceId'] = session_id_text
      row['sessionComposite'] = session_id_text
      row['logTrace'] = '' if _is_trae_composite_session_id(session_id_text) else row.get('logTrace', '')
    normalized.append(row)
  return normalized


def _session_row_time(row):
  for key in ('logTrace', 'sessionId'):
    text = str((row or {}).get(key) or '')
    match = re.search(r':Trae CN\.T\((\d{4})/(\d{1,2})/(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\)', text)
    if not match:
      continue
    try:
      return datetime.datetime(
        int(match.group(1)),
        int(match.group(2)),
        int(match.group(3)),
        int(match.group(4)),
        int(match.group(5)),
        int(match.group(6)),
      )
    except ValueError:
      return None
  return None


def sort_session_rows_by_time(rows):
  if not isinstance(rows, list):
    return []
  indexed = [(idx, row) for idx, row in enumerate(rows) if isinstance(row, dict)]
  indexed.sort(key=lambda item: (
    _session_row_time(item[1]) is None,
    _session_row_time(item[1]) or datetime.datetime.max,
    item[0],
  ))
  return [row for _, row in indexed]


def _log_line_time_to_text(line: str) -> str:
  match = re.search(r'(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})', str(line or ''))
  if not match:
    return ''
  return f"{int(match.group(1))}/{int(match.group(2))}/{int(match.group(3))} {match.group(4)}"


def _read_trae_workspace_context(order_token: str):
  db_path = _find_workspace_db_for_order(order_token)
  con = sqlite3.connect(db_path)
  try:
    cur = con.cursor()
    cur.execute("select key, value from ItemTable")
    kv = {k: v for k, v in cur.fetchall()}
  finally:
    con.close()

  memento = _safe_json_loads(kv.get('memento/icube-ai-agent-storage', '{}'), {})
  input_history = _safe_json_loads(kv.get('icube-ai-agent-storage-input-history', '[]'), [])
  if not isinstance(input_history, list):
    input_history = []

  current_session_id = str(memento.get('currentSessionId') or '').strip()
  if not current_session_id and isinstance(memento.get('list'), list) and memento['list']:
    current_session_id = str(memento['list'][0].get('sessionId') or '').strip()

  user_id = ''
  marker = str(kv.get('__$__targetStorageMarker') or '')
  if marker:
    match = re.search(r'(\d{10,})', marker)
    if match:
      user_id = match.group(1)
  if not user_id:
    for key, value in kv.items():
      match = re.match(r'^(\d{10,})_', str(key))
      if match:
        user_id = match.group(1)
        break
      match = re.search(r'"userId"\s*:\s*"?(\d{10,})"?', str(value))
      if match:
        user_id = match.group(1)
        break

  return db_path, current_session_id, input_history, user_id


def _rg_lines(pattern: str, timeout_seconds: int = 60, fixed_strings: bool = False):
  rg = rg_binary()
  if not rg:
    return []
  cmd = [rg, '--no-heading', '--line-number']
  if fixed_strings:
    cmd.append('--fixed-strings')
  cmd.extend([pattern, os.path.join(TRAE_APP_SUPPORT_DIR, 'logs')])
  try:
    completed = subprocess.run(
      cmd,
      stdout=subprocess.PIPE,
      stderr=subprocess.DEVNULL,
      text=True,
      timeout=timeout_seconds,
      check=False,
    )
  except Exception:
    return []
  return (completed.stdout or '').splitlines()


def _rg_identifier_lines(identifier: str, timeout_seconds: int = 8, max_count: int = 120):
  identifier = str(identifier or '').strip()
  rg = rg_binary()
  if not identifier or not rg:
    return []
  cmd = [
    rg,
    '--fixed-strings',
    '--no-heading',
    '--line-number',
    '-m',
    str(max_count),
    identifier,
    os.path.join(TRAE_APP_SUPPORT_DIR, 'logs'),
  ]
  try:
    completed = subprocess.run(
      cmd,
      stdout=subprocess.PIPE,
      stderr=subprocess.DEVNULL,
      text=True,
      timeout=timeout_seconds,
      check=False,
    )
  except Exception:
    return []
  return (completed.stdout or '').splitlines()


def _rg_identifier_lines_batch(identifiers, timeout_seconds: int = 12, max_count_per_file: int = 500):
  rg = rg_binary()
  if not rg:
    return []
  clean_identifiers = []
  for identifier in identifiers or []:
    text = str(identifier or '').strip()
    if text and text not in clean_identifiers:
      clean_identifiers.append(text)
  if not clean_identifiers:
    return []
  cmd = [
    rg,
    '--fixed-strings',
    '--no-heading',
    '--line-number',
    '-m',
    str(max_count_per_file),
  ]
  for identifier in clean_identifiers:
    cmd.extend(['-e', identifier])
  cmd.append(os.path.join(TRAE_APP_SUPPORT_DIR, 'logs'))
  try:
    completed = subprocess.run(
      cmd,
      stdout=subprocess.PIPE,
      stderr=subprocess.DEVNULL,
      text=True,
      timeout=timeout_seconds,
      check=False,
    )
  except Exception:
    return []
  return (completed.stdout or '').splitlines()


def _split_rg_log_line(raw_line: str):
  match = re.match(r'^(.*?):(\d+):(.*)$', str(raw_line or ''))
  if not match:
    return '', 0, str(raw_line or '')
  try:
    line_no = int(match.group(2))
  except Exception:
    line_no = 0
  return match.group(1), line_no, match.group(3)


def _log_line_datetime(line: str):
  match = re.search(r'(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})', str(line or ''))
  if not match:
    return None
  try:
    return datetime.datetime(
      int(match.group(1)),
      int(match.group(2)),
      int(match.group(3)),
      int(match.group(4)),
      int(match.group(5)),
      int(match.group(6)),
    )
  except ValueError:
    return None


def _filter_log_items_for_window(items, anchor_dt, pinned_keys=None):
  pinned_keys = pinned_keys or set()
  if not anchor_dt:
    return list(items or [])
  start_dt = anchor_dt - datetime.timedelta(minutes=TRAE_RECONSTRUCTED_LOG_WINDOW_BEFORE_MINUTES)
  end_dt = anchor_dt + datetime.timedelta(minutes=TRAE_RECONSTRUCTED_LOG_WINDOW_AFTER_MINUTES)
  filtered = []
  for item in items or []:
    key = (item[0], item[1], item[2]) if len(item) > 2 else tuple(item)
    if key in pinned_keys:
      filtered.append(item)
      continue
    line_dt = _log_line_datetime(item[2] if len(item) > 2 else '')
    if line_dt is None:
      continue
    if start_dt <= line_dt <= end_dt:
      filtered.append(item)
  return filtered


def _reconstruction_anchor_datetime(items, parts: dict, composite_time_text: str = ''):
  trace_id = str((parts or {}).get('traceId') or '').strip()
  preferred = []
  for _, _, line in items or []:
    line_dt = _log_line_datetime(line)
    if line_dt is None:
      continue
    if trace_id and trace_id in line:
      if any(marker in line for marker in ('create message', 'TASK:', 'reportFrontResponse')):
        preferred.append(line_dt)
  if preferred:
    return min(preferred)
  return _parse_trae_composite_time(composite_time_text)


def _collect_nearby_log_lines(items, before: int = 6, after: int = 8, max_windows: int = 160):
  windows_by_path = {}
  for path, line_no, _ in items or []:
    if not path or line_no <= 0 or 'renderer' not in os.path.basename(path):
      continue
    if len(windows_by_path.setdefault(path, [])) >= max_windows:
      continue
    windows_by_path[path].append((max(line_no - before, 1), line_no + after))

  collected = []
  for path, windows in windows_by_path.items():
    if not windows or not os.path.isfile(path):
      continue
    merged = []
    for start, end in sorted(windows):
      if not merged or start > merged[-1][1] + 1:
        merged.append([start, end])
      else:
        merged[-1][1] = max(merged[-1][1], end)
    try:
      with open(path, 'r', encoding='utf-8', errors='replace') as fh:
        idx = 0
        current = merged[idx] if merged else None
        for line_no, line in enumerate(fh, 1):
          while current and line_no > current[1]:
            idx += 1
            current = merged[idx] if idx < len(merged) else None
          if not current:
            break
          if current[0] <= line_no <= current[1]:
            collected.append((path, line_no, line.rstrip('\n')))
    except Exception:
      continue
  return collected


def _short_trae_log_path(path: str) -> str:
  text = str(path or '')
  prefix = TRAE_APP_SUPPORT_DIR.rstrip('/') + '/'
  if text.startswith(prefix):
    return text[len(prefix):]
  return text


def _line_time_label(line: str) -> str:
  return _log_line_time_to_text(line) or ''


def _clean_log_fragment(value: str, limit: int = 220) -> str:
  text = re.sub(r'\s+', ' ', str(value or '').strip())
  if limit and len(text) > limit:
    return text[:max(limit - 3, 0)].rstrip() + '...'
  return text


def _parse_json_suffix(line: str, marker: str):
  if marker not in line:
    return None
  text = line.split(marker, 1)[1].strip()
  try:
    return json.loads(text)
  except Exception:
    return None


def _history_event_messages_payload(line: str):
  match = re.search(r'messages:\s*("(?:\\.|[^"\\])*")', str(line or ''))
  if not match:
    return None
  try:
    messages_text = json.loads(match.group(1))
    return json.loads(messages_text)
  except Exception:
    return None


def _summarize_history_event_line(line: str) -> str:
  payload = _history_event_messages_payload(line)
  if not isinstance(payload, dict):
    return ''
  time_text = _line_time_label(line)
  source_match = re.search(r'source:\s*"([^"]+)"', line)
  source = source_match.group(1) if source_match else ''
  raw_messages = payload.get('raw_messages')
  if not isinstance(raw_messages, list):
    return ''

  for message in raw_messages:
    if not isinstance(message, dict):
      continue
    role = message.get('role') or ''
    content_parts = message.get('content') if isinstance(message.get('content'), list) else []
    text_parts = []
    for part in content_parts:
      if isinstance(part, dict) and isinstance(part.get('text'), str):
        text = part.get('text') or ''
        if text.strip():
          text_parts.append(text.strip())
    visible_text = _clean_log_fragment(' '.join(text_parts), limit=260)

    tool_calls = message.get('tool_calls') if isinstance(message.get('tool_calls'), list) else []
    if tool_calls:
      call = tool_calls[0] if isinstance(tool_calls[0], dict) else {}
      function_call = call.get('function_call') if isinstance(call.get('function_call'), dict) else {}
      tool_name = function_call.get('name') or source or ''
      args = _safe_json_loads(function_call.get('arguments') or '{}', {})
      detail_parts = []
      if isinstance(args, dict):
        for key in ('file_path', 'path', 'command', 'file_pattern'):
          if args.get(key):
            label = 'filePath' if key == 'file_path' else key
            detail_parts.append(f"{label}: {_clean_log_fragment(args.get(key), limit=180)}")
      detail = '; '.join(detail_parts)
      prefix = f"{time_text} assistant: {visible_text}" if visible_text else f"{time_text} assistant tool call"
      return f"{prefix}; toolName: {tool_name}{'; ' + detail if detail else ''}"

    if role == 'tool' or source:
      status_match = re.search(r'status:\s*([a-zA-Z_]+)', visible_text)
      file_match = re.search(r'filePath:\s*([^\s<]+)', visible_text)
      command_match = re.search(r'command:\s*(.+?)(?:\s+undefined|\s*</toolcall_result>|$)', visible_text)
      detail_parts = []
      if status_match:
        detail_parts.append(f"status: {status_match.group(1)}")
      if file_match:
        detail_parts.append(f"filePath: {file_match.group(1)}")
      if command_match:
        detail_parts.append(f"command: {_clean_log_fragment(command_match.group(1), limit=180)}")
      if detail_parts:
        return f"{time_text} toolName: {source or 'tool'}; " + '; '.join(detail_parts)

    if role == 'assistant' and visible_text:
      return f"{time_text} assistant: {visible_text}"
    if role == 'user' and visible_text:
      return f"{time_text} user: {visible_text}"
  return ''


def _summarize_ai_agent_line(line: str) -> str:
  time_text = _line_time_label(line)

  history_summary = _summarize_history_event_line(line)
  if history_summary:
    return history_summary

  match = re.search(
    r'create message, chat_session_id:\s*([0-9a-f]{24}), message_id:\s*([0-9a-f]{24}).*?trace_id="([0-9a-f]{32})"',
    line,
  )
  if match:
    return f"{time_text} create message: chat_session_id={match.group(1)} user_message_id={match.group(2)} trace_id={match.group(3)}"

  match = re.search(
    r'TASK: task_id=([0-9a-f]{24}),session_id=([0-9a-f]{24}),message_id=([0-9a-f]{24}),status=([^,]+)',
    line,
  )
  if match:
    return f"{time_text} TASK: task_id={match.group(1)} session_id={match.group(2)} response_message_id={match.group(3)} status={match.group(4)}"

  match = re.search(
    r'plan tool call finish cost:\s*([^,]+), toolcall_name:\s*"([^"]+)", status:\s*([^,]+), user_message_id:\s*([0-9a-f]{24}), task_id:\s*([0-9a-f]{24})',
    line,
  )
  if match:
    return f"{time_text} toolName: {match.group(2)}; status: {match.group(3)}; cost: {match.group(1)}; user_message_id={match.group(4)}; task_id={match.group(5)}"

  match = re.search(
    r'list_chat_turn_diffs (start|completed): chain_id=([0-9a-f]{24}), message_id=([0-9a-f]{24})(?:, diff_count=(\d+))?',
    line,
  )
  if match:
    diff_count = f" diff_count={match.group(4)}" if match.group(4) is not None else ''
    return f"{time_text} list_chat_turn_diffs {match.group(1)}: chain_id={match.group(2)} message_id={match.group(3)}{diff_count}"

  match = re.search(r'get_file_list_v2 completed: session_id=([0-9a-f]{24}), file_count=(\d+)', line)
  if match:
    return f"{time_text} get_file_list_v2 completed: session_id={match.group(1)} file_count={match.group(2)}"

  match = re.search(r'get_file_list v2 file_paths:\s*(\[.*?\])', line)
  if match:
    return f"{time_text} file_list: {_clean_log_fragment(match.group(1), limit=260)}"

  match = re.search(r'Update snapshot info, changes files:\s*"([^"]+)"', line)
  if match:
    return f"{time_text} file_change: {match.group(1)}"

  match = re.search(r'update_snapshot session_id:\s*([0-9a-f]{24}), message_id:\s*([0-9a-f]{24}).*?changes:\s*\[(.+?)\]', line)
  if match:
    return f"{time_text} update_snapshot: session_id={match.group(1)} message_id={match.group(2)} changes={_clean_log_fragment(match.group(3), limit=220)}"

  if 'created response message' in line:
    return f"{time_text} created response message"
  if 'created chat turn context' in line:
    return f"{time_text} created chat turn context"

  match = re.search(r'create snapshot, chat_session_id:\s*([0-9a-f]{24}), message_id:\s*([0-9a-f]{24})', line)
  if match:
    return f"{time_text} create snapshot: chat_session_id={match.group(1)} message_id={match.group(2)}"

  match = re.search(r'chat_turn_finish completed: session_id=([0-9a-f]{24}), message_id=([0-9a-f]{24})', line)
  if match:
    return f"{time_text} chat_turn_finish completed: session_id={match.group(1)} message_id={match.group(2)}"

  if 'reportFrontResponse' in line:
    match = re.search(r'"status":"?([^",}]+)"?.*?"costTime":(\d+).*?"traceId":"([0-9a-f]{32})"', line)
    if match:
      return f"{time_text} front response: status={match.group(1)} costTime={match.group(2)} trace_id={match.group(3)}"

  return _clean_log_fragment(f"{time_text} {line}", limit=260)


def _summarize_renderer_line(line: str) -> str:
  time_text = _line_time_label(line)

  match = re.search(r'event:\s*([^;]+?)\s*;\s*params:\s*(\{.*\})', line)
  if match:
    event_name = match.group(1).strip()
    params = _safe_json_loads(match.group(2), {})
    if isinstance(params, dict):
      tool_name = params.get('tool_type') or params.get('block_type') or params.get('result_type') or ''
      tool_id = params.get('tool_id') or ''
      block_id = params.get('block_id') or ''
      message_id = params.get('message_id') or ''
      parts = [f"{time_text} renderer event={event_name}"]
      if tool_name:
        parts.append(f"toolName: {tool_name}")
      if tool_id:
        parts.append(f"tool_id={tool_id}")
      if block_id:
        parts.append(f"block_id={block_id}")
      if message_id:
        parts.append(f"message_id={message_id}")
      for key in ('session_id', 'file_count', 'recommend_diff_insert_line_count', 'recommend_diff_delete_line_count'):
        if params.get(key) is not None:
          parts.append(f"{key}={params.get(key)}")
      return '; '.join(parts)

  match = re.search(r'icube\.common\.commands\.tooling\.getDiagnostics\s+(start|end)(?:,\s*cost=(\d+)ms)?', line)
  if match:
    cost = f" cost={match.group(2)}ms" if match.group(2) else ''
    return f"{time_text} toolName: GetDiagnostics; status: {match.group(1)}{cost}"

  match = re.search(r'LspAgentTooling getDiagnostics:\s*file://(.+)$', line)
  if match:
    return f"{time_text} toolName: GetDiagnostics; file={match.group(1).strip()}"

  match = re.search(r'TextDocuments\.listen onDidOpenTextDocument:\s*file://(.+)$', line)
  if match:
    return f"{time_text} view_files: file={match.group(1).strip()}"

  match = re.search(r'\[BrowserUse\] run start:\s*([a-zA-Z_]+)\s*(\{.*\})', line)
  if match:
    action = match.group(1)
    payload = _safe_json_loads(match.group(2), {})
    args = {}
    if isinstance(payload, dict):
      args = _safe_json_loads(payload.get('args') or '{}', {})
    detail_parts = []
    if isinstance(args, dict):
      for key in ('url', 'ref', 'text', 'newTab'):
        if args.get(key) is not None:
          detail_parts.append(f"{key}={_clean_log_fragment(args.get(key), limit=120)}")
    detail = '; '.join(detail_parts)
    return f"{time_text} BrowserUse: {action}{'; ' + detail if detail else ''}"

  match = re.search(r'\[(?:onFinishLoad)\] url:\s*([^\s]+)', line)
  if match:
    return f"{time_text} Browser URL loaded: {match.group(1)}"

  match = re.search(r'\[setWebviewUrl\]\s*([^\s]+)', line)
  if match:
    return f"{time_text} Browser URL set: {match.group(1)}"

  match = re.search(r'\[CommandAdapter\]\[execute_command\].*?command:([^\s]+)', line)
  if match:
    return f"{time_text} command_adapter: {match.group(1)}"

  match = re.search(r'runCommandInTerminal blocking=([a-zA-Z]+)\s*(\[.*\])', line)
  if match:
    payload = _safe_json_loads(match.group(2), [])
    item = payload[0] if isinstance(payload, list) and payload and isinstance(payload[0], dict) else {}
    command = item.get('command') or ''
    tool_call_id = item.get('toolCallId') or ''
    return f"{time_text} run_command: status=start blocking={match.group(1)} tool_id={tool_call_id} command={_clean_log_fragment(command, limit=260)}"

  if 'commandResult=' in line:
    payload = _parse_json_suffix(line, 'commandResult=')
    item = payload[0] if isinstance(payload, list) and payload and isinstance(payload[0], dict) else {}
    if item:
      command = item.get('command') or ''
      exit_code = item.get('exitCode')
      logs = item.get('logs') if isinstance(item.get('logs'), list) else []
      latest_output = _clean_log_fragment(' '.join(str(value or '') for value in logs[:1]), limit=260)
      detail = f" output={latest_output}" if latest_output else ''
      return f"{time_text} run_command: status=result exitCode={exit_code} command={_clean_log_fragment(command, limit=220)}{detail}"

  if '[ToolingTerminalTrace]toolcall_run_command_tracing' in line:
    payload = _parse_json_suffix(line, '[ToolingTerminalTrace]toolcall_run_command_tracing')
    categories = payload.get('categories') if isinstance(payload, dict) else {}
    if isinstance(categories, dict):
      command = categories.get('command') or ''
      error = categories.get('error') or ''
      exit_code = categories.get('exitCode') or ''
      latest_output = categories.get('latest_output') or ''
      detail = f" latest_output={_clean_log_fragment(latest_output, limit=180)}" if latest_output else ''
      return f"{time_text} run_command_trace: error={error} exitCode={exit_code} command={_clean_log_fragment(command, limit=220)}{detail}"

  match = re.search(r'ChatSnapshotService\._writeAndSaveFile\s+(.+)$', line)
  if match:
    return f"{time_text} file_write: {match.group(1).strip()}"

  match = re.search(r'IcubeFilesDiffState\.addFileDiffData\s+\d+\s+(.+)$', line)
  if match:
    return f"{time_text} file_diff: {match.group(1).strip()}"

  if '[Apply CodeSnippet] notifyApplyStateChange' in line:
    payload = _parse_json_suffix(line, '[Apply CodeSnippet] notifyApplyStateChange')
    if isinstance(payload, dict):
      return f"{time_text} apply_patch_state: status={payload.get('status') or '-'} file={payload.get('filePath') or '-'}"

  match = re.search(r'Reported AI code contribution:\s*behaviorType=([^,]+), documentUri=(.+)$', line)
  if match:
    return f"{time_text} code_contribution: behaviorType={match.group(1)} file={match.group(2).strip()}"

  if 'reportFrontResponse' in line:
    match = re.search(r'"status":"?([^",}]+)"?.*?"costTime":(\d+).*?"traceId":"([0-9a-f]{32})"', line)
    if match:
      return f"{time_text} front response: status={match.group(1)} costTime={match.group(2)} trace_id={match.group(3)}"

  return _clean_log_fragment(f"{time_text} {line}", limit=260)


def _collect_log_lines_for_reconstruction(parts: dict, composite_time_text: str = '', order_token: str = ''):
  identifiers = []
  identifier_keys = ('traceId', 'sessionId', 'chatMessageId', 'taskMessageId')
  if parts and not _has_real_task_message_id(parts):
    identifier_keys = ('chatMessageId', 'taskMessageId')
  for key in identifier_keys:
    value = str((parts or {}).get(key) or '').strip()
    if value and value not in identifiers:
      identifiers.append(value)

  raw_items = []
  seen = set()
  pinned_keys = set()

  def _add_identifier_lines(identifier: str, max_count: int = 140, pin: bool = False):
    for raw_line in _rg_identifier_lines(identifier, timeout_seconds=10, max_count=max_count):
      path, line_no, line = _split_rg_log_line(raw_line)
      key = (path, line_no, line)
      if key in seen:
        continue
      seen.add(key)
      if pin:
        pinned_keys.add(key)
      raw_items.append((path, line_no, line))

  for raw_line in _rg_identifier_lines_batch(identifiers, timeout_seconds=14, max_count_per_file=1000):
    path, line_no, line = _split_rg_log_line(raw_line)
    key = (path, line_no, line)
    if key in seen:
      continue
    seen.add(key)
    raw_items.append((path, line_no, line))

  if not raw_items:
    for identifier in identifiers:
      _add_identifier_lines(identifier)

  task_message_id = str((parts or {}).get('taskMessageId') or '').strip()
  if task_message_id:
    exact_task_message_markers = [
      f'message_id={task_message_id},status=',
      f'message_id: {task_message_id},status=',
    ]
    for raw_line in _rg_identifier_lines_batch(exact_task_message_markers, timeout_seconds=10, max_count_per_file=120):
      path, line_no, line = _split_rg_log_line(raw_line)
      key = (path, line_no, line)
      if key in seen:
        continue
      seen.add(key)
      pinned_keys.add(key)
      raw_items.append((path, line_no, line))

  anchor_dt = _reconstruction_anchor_datetime(raw_items, parts, composite_time_text=composite_time_text)
  raw_items = _filter_log_items_for_window(raw_items, anchor_dt, pinned_keys=pinned_keys)

  task_ids = []
  for _, _, line in list(raw_items):
    for match in re.finditer(r'\btask_id[=:]\s*([0-9a-f]{24})\b|\bTASK:\s*task_id=([0-9a-f]{24})', line):
      task_id = match.group(1) or match.group(2)
      if task_id and task_id not in task_ids:
        task_ids.append(task_id)

  for raw_line in _rg_identifier_lines_batch(task_ids[:12], timeout_seconds=14, max_count_per_file=2200):
    path, line_no, line = _split_rg_log_line(raw_line)
    key = (path, line_no, line)
    if key in seen:
      continue
    seen.add(key)
    pinned_keys.add(key)
    raw_items.append((path, line_no, line))

  exact_task_markers = [f'TASK: task_id={task_id}' for task_id in task_ids[:12]]
  for raw_line in _rg_identifier_lines_batch(exact_task_markers, timeout_seconds=10, max_count_per_file=120):
    path, line_no, line = _split_rg_log_line(raw_line)
    key = (path, line_no, line)
    if key in seen:
      continue
    seen.add(key)
    pinned_keys.add(key)
    raw_items.append((path, line_no, line))

  raw_items = _filter_log_items_for_window(raw_items, anchor_dt, pinned_keys=pinned_keys)

  tool_ids = []
  for _, _, line in list(raw_items):
    for match in re.finditer(r'"(?:tool_id|toolCallId|toolcall_id)"\s*:\s*"([0-9a-f]{24})"', line):
      tool_id = match.group(1)
      if tool_id not in tool_ids:
        tool_ids.append(tool_id)
    for match in re.finditer(
      r'\btool_id=([0-9a-f]{24})\b|\btoolCallId[:=]([0-9a-f]{24})\b|\btoolcall_id[:=]\s*Some\("([0-9a-f]{24})"\)',
      line,
    ):
      tool_id = match.group(1) or match.group(2) or match.group(3)
      if tool_id and tool_id not in tool_ids:
        tool_ids.append(tool_id)

  tool_ids = tool_ids[:TRAE_RECONSTRUCTED_LOG_TOOL_ID_LIMIT]
  for raw_line in _rg_identifier_lines_batch(tool_ids, timeout_seconds=14, max_count_per_file=120):
    path, line_no, line = _split_rg_log_line(raw_line)
    key = (path, line_no, line)
    if key in seen:
      continue
    seen.add(key)
    pinned_keys.add(key)
    raw_items.append((path, line_no, line))

  raw_items = _filter_log_items_for_window(raw_items, anchor_dt, pinned_keys=pinned_keys)
  nearby_items = _filter_log_items_for_window(_collect_nearby_log_lines(raw_items), anchor_dt, pinned_keys=pinned_keys)
  for path, line_no, line in nearby_items:
    key = (path, line_no, line)
    if key in seen:
      continue
    seen.add(key)
    raw_items.append((path, line_no, line))

  raw_items.sort(key=lambda item: (
    _log_line_datetime(item[2]) is None,
    _log_line_datetime(item[2]) or datetime.datetime.max,
    item[0],
    item[1],
  ))
  return raw_items


def _extract_task_status_from_items(items, parts: dict):
  task_id = ''
  response_message_id = str((parts or {}).get('taskMessageId') or '')
  trace_id = str((parts or {}).get('traceId') or '')
  final_status = ''
  status_rank = {'Created': 1, 'Running': 2, 'Completed': 3, 'Failed': 4, 'Cancelled': 4, 'Canceled': 4}
  for _, _, line in items:
    if 'TASK:' not in line:
      continue
    if trace_id and trace_id not in line:
      continue
    match = re.search(
      r'TASK: task_id=([0-9a-f]{24}),session_id=([0-9a-f]{24}),message_id=([0-9a-f]{24}),status=([^,]+)',
      line,
    )
    if not match:
      continue
    if response_message_id and match.group(3) != response_message_id:
      continue
    task_id = match.group(1)
    status = match.group(4)
    if not final_status or status_rank.get(status, 0) >= status_rank.get(final_status, 0):
      final_status = status
  return task_id, final_status


def _has_original_turn_evidence(items, parts: dict) -> bool:
  trace_id = str((parts or {}).get('traceId') or '').strip()
  chat_message_id = str((parts or {}).get('chatMessageId') or '').strip()
  task_message_id = str((parts or {}).get('taskMessageId') or '').strip()
  for _, _, line in items or []:
    if trace_id and trace_id not in line:
      continue
    if 'create message' in line and chat_message_id and chat_message_id in line:
      return True
    if 'TASK:' in line and task_message_id and task_message_id in line:
      return True
    if 'plan tool call finish' in line and chat_message_id and chat_message_id in line:
      return True
    if 'reportFrontResponse' in line and trace_id:
      return True
  return False


def _has_local_history_turn_evidence(items, parts: dict, order_token: str = '') -> bool:
  session_id = str((parts or {}).get('sessionId') or '').strip()
  chat_message_id = str((parts or {}).get('chatMessageId') or '').strip()
  task_message_id = str((parts or {}).get('taskMessageId') or '').strip()
  identifiers = {value for value in (session_id, chat_message_id, task_message_id) if value}
  path_markers = [marker for marker in _order_path_markers(order_token) if marker]
  history_markers = (
    'list_chat_turn_diffs',
    'get_file_list',
    'IcubeFilesDiffState.addFileDiffData',
    '[Apply CodeSnippet] notifyApplyStateChange',
    'processMessageAndSetFileDiffDirtyStore',
    'update_snapshot',
    'Reported AI code contribution',
    'code_comp_copy_click',
  )
  for _, _, line in items or []:
    if identifiers and not any(identifier in line for identifier in identifiers):
      if not (path_markers and any(marker in line for marker in path_markers)):
        continue
    if any(marker in line for marker in history_markers):
      return True
  return False


def _build_unavailable_log_trace(order_token: str, row: dict, reason: str, db_path: str = '') -> str:
  parts = _session_row_composite_parts(row)
  composite = str(row.get('logTraceId') or row.get('sessionComposite') or row.get('invalidSessionComposite') or row.get('sessionId') or '').strip()
  time_text = _trae_composite_time_text(composite)
  conversation = str((row or {}).get('conversation') or '').strip()
  lines = [
    TRAE_UNAVAILABLE_LOG_TRACE_PREFIX,
    'officialCopied: false',
    'source: local-trae-logs',
    f'reconstructionVersion: {TRAE_RECONSTRUCTED_LOG_TRACE_VERSION}',
    f'order: {order_token}',
    f'engine: {TRAE_APP_NAME}',
    f'time: {time_text or "-"}',
    f'reason: {reason}',
    f'rawSessionId/chat_session_id: {parts.get("sessionId") or row.get("rawSessionId") or "-"}',
    f'userMessageId: {parts.get("chatMessageId") or "-"}',
    f'responseMessageId: {parts.get("taskMessageId") or "-"}',
    f'traceId: {parts.get("traceId") or "-"}',
    f'sessionComposite: {composite or row.get("sessionComposite") or row.get("logTraceId") or row.get("invalidSessionComposite") or "-"}',
  ]
  if db_path:
    lines.append(f'workspaceDb: {db_path}')
  if conversation:
    lines.extend(['', 'Prompt:', conversation])
  lines.extend([
    '',
    'Core Timeline:',
    '- local original ai-agent/renderer execution events were not found',
    '',
    'Missing:',
    '- assistant_text_exact',
    '- local_original_log_events',
  ])
  return '\n'.join(lines).strip()


def _build_reconstructed_log_trace(order_token: str, row: dict, db_path: str = '') -> str:
  parts = _session_row_composite_parts(row)
  if not parts:
    return ''
  composite = str(row.get('logTraceId') or row.get('sessionComposite') or row.get('invalidSessionComposite') or row.get('sessionId') or '').strip()
  time_text = _trae_composite_time_text(composite)
  items = _collect_log_lines_for_reconstruction(parts, composite_time_text=time_text, order_token=order_token)
  has_real_task_message_id = _has_real_task_message_id(parts)
  has_original_evidence = has_real_task_message_id and _has_original_turn_evidence(items, parts)
  has_history_evidence = _has_local_history_turn_evidence(items, parts, order_token=order_token)
  if not has_original_evidence and not has_history_evidence:
    return _build_unavailable_log_trace(order_token, row, 'local_original_log_events_not_found', db_path=db_path)
  task_id, final_status = _extract_task_status_from_items(items, parts)
  reconstruction_source = 'local-trae-logs' if has_original_evidence else 'local-trae-logs-history'
  reconstruction_mode = 'original-execution' if has_original_evidence else 'history-derived'

  event_records = []
  source_paths = []
  seen_events = set()
  ai_keep = (
    'History: HistoryEvent',
    'create message',
    'TASK:',
    'plan tool call finish',
    'created response message',
    'created chat turn context',
    'create snapshot',
    'chat_turn_finish completed',
    'reportFrontResponse',
    'Update snapshot info',
    'update_snapshot',
  )
  history_ai_keep = (
    'list_chat_turn_diffs',
    'get_file_list',
    'get_file_list_v2',
    'create_version',
    'create_new_version',
  )
  renderer_keep = (
    'tool_call_show',
    'file_tool_show',
    'file_summary_show',
    'code_comp_copy_click',
    'run_script_show',
    'runCommandInTerminal',
    'commandResult=',
    'ToolingTerminalTrace',
    'getDiagnostics',
    'TextDocuments.listen onDidOpenTextDocument',
    'ChatSnapshotService._writeAndSaveFile',
    'IcubeFilesDiffState.addFileDiffData',
    '[Apply CodeSnippet] notifyApplyStateChange',
    'Reported AI code contribution',
    '[BrowserUse] run start',
    '[onFinishLoad] url:',
    '[setWebviewUrl]',
    'reportFrontResponse',
  )

  for path, line_no, line in items:
    is_ai = 'ai-agent' in os.path.basename(path)
    is_renderer = 'renderer' in os.path.basename(path)
    is_extension_log = '/exthost/' in path or '\\exthost\\' in path
    effective_ai_keep = ai_keep + (() if has_original_evidence else history_ai_keep)
    if is_ai and not any(marker in line for marker in effective_ai_keep):
      continue
    if is_renderer and not any(marker in line for marker in renderer_keep):
      continue
    if is_extension_log and not any(marker in line for marker in renderer_keep):
      continue
    if not is_ai and not is_renderer and not is_extension_log:
      continue
    source_label = f"{_short_trae_log_path(path)}:{line_no}" if path else ''
    if source_label and source_label not in source_paths:
      source_paths.append(source_label)
    summary = _summarize_ai_agent_line(line) if is_ai else _summarize_renderer_line(line)
    if not summary or summary in seen_events:
      continue
    seen_events.add(summary)
    event_records.append((_log_line_datetime(line) or datetime.datetime.max, source_label, summary))

  event_records.sort(key=lambda item: (item[0], item[1], item[2]))
  combined_events = [summary for _, _, summary in event_records]
  omitted = max(0, len(combined_events) - TRAE_RECONSTRUCTED_LOG_MAX_EVENTS)
  combined_events = combined_events[:TRAE_RECONSTRUCTED_LOG_MAX_EVENTS]

  missing = ['assistant_text_exact']
  if not has_original_evidence:
    missing.append('local_original_create_task_events')
  if not has_real_task_message_id:
    missing.append('real_response_message_id')
  if not combined_events:
    missing.append('local_log_events')

  conversation = str((row or {}).get('conversation') or '').strip()
  lines = [
    TRAE_RECONSTRUCTED_LOG_TRACE_PREFIX,
    'officialCopied: false',
    f'source: {reconstruction_source}',
    f'reconstructionVersion: {TRAE_RECONSTRUCTED_LOG_TRACE_VERSION}',
    f'reconstructionMode: {reconstruction_mode}',
    f'order: {order_token}',
    f'engine: {TRAE_APP_NAME}',
    f'time: {time_text or "-"}',
    f'status: {final_status or "unknown"}',
    f'task_id: {task_id or "-"}',
    f'rawSessionId/chat_session_id: {parts.get("sessionId") or "-"}',
    f'userMessageId: {parts.get("chatMessageId") or "-"}',
    f'responseMessageId: {parts.get("taskMessageId") or "-"}',
    f'traceId: {parts.get("traceId") or "-"}',
    f'sessionComposite: {composite or "-"}',
  ]
  if db_path:
    lines.append(f'workspaceDb: {db_path}')
  if conversation:
    lines.extend(['', 'Prompt:', conversation])
  lines.extend(['', 'Core Timeline:'])
  if combined_events:
    lines.extend(f'- {event}' for event in combined_events)
  else:
    lines.append('- no matched ai-agent/renderer events found in local logs')
  if omitted:
    lines.append(f'- ... omitted {omitted} additional reconstructed events')
  lines.extend(['', 'Source Files:'])
  if source_paths:
    lines.extend(f'- {path}' for path in source_paths[:12])
    if len(source_paths) > 12:
      lines.append(f'- ... omitted {len(source_paths) - 12} additional source locations')
  else:
    lines.append('- none')
  lines.extend(['', 'Missing:'])
  lines.extend(f'- {item}' for item in missing)

  text = '\n'.join(lines).strip()
  if len(text) > TRAE_RECONSTRUCTED_LOG_MAX_CHARS:
    text = text[:TRAE_RECONSTRUCTED_LOG_MAX_CHARS].rstrip() + '\n- ... truncated reconstructed trace'
  return text


def _json_string_tokens_from_fragment(fragment: str):
  decoder = json.JSONDecoder()
  tokens = []
  index = 0
  text = str(fragment or '')
  while index < len(text):
    quote_index = text.find('"', index)
    if quote_index < 0:
      break
    try:
      value, end_index = decoder.raw_decode(text[quote_index:])
    except Exception:
      index = quote_index + 1
      continue
    if isinstance(value, str):
      tokens.append(value)
      if value == ',' and text[quote_index:quote_index + 3] == '","':
        index = quote_index + 2
        continue
    index = quote_index + max(end_index, 1)
  return tokens


def _join_official_copy_tokens(tokens) -> str:
  skip_tokens = {
    'inputText',
    'parsedQuery',
    'images',
    'multiMedia',
    'resource_id',
    'name',
    'mime_type',
    'uri',
    ',',
    '],',
    ':[],',
  }
  pieces = []
  for token in tokens or []:
    text = str(token)
    if text in skip_tokens:
      continue
    pieces.append(text)
  return ''.join(pieces)


def _official_copy_text_from_fragment(fragment: str) -> str:
  fragment = str(fragment or '')
  candidates = [_join_official_copy_tokens(_json_string_tokens_from_fragment(fragment))]
  for marker in ('"parsedQuery":[', 'parsedQuery":["'):
    start = fragment.find(marker)
    if start >= 0:
      candidates.append(_join_official_copy_tokens(_json_string_tokens_from_fragment(fragment[start:])))
  return max(candidates, key=len).strip()


def _looks_like_official_copied_log_trace(text: str, order_token: str = '') -> bool:
  value = str(text or '').strip()
  if len(value) < 300:
    return False
  if value.startswith(TRAE_RECONSTRUCTED_LOG_TRACE_PREFIX) or value.startswith(TRAE_UNAVAILABLE_LOG_TRACE_PREFIX):
    return False
  if value.startswith(('filePath:', 'status:', 'command:', 'changes:', 'file_pattern:')):
    return False
  if 'toolName:' not in value or 'status:' not in value:
    return False
  evidence_markers = ['Todos updated:', 'filePath:', 'command:', 'changes:', 'CompactFake', 'GetDiagnostics']
  order_token = str(order_token or '').strip()
  if order_token:
    evidence_markers.extend(_order_path_markers(order_token))
  return any(marker in value for marker in evidence_markers)


def _extract_text_candidates_from_json_node(node):
  candidates = []
  if isinstance(node, dict):
    input_text = node.get('inputText')
    if isinstance(input_text, str) and input_text.strip():
      candidates.append(input_text)
    parsed_query = node.get('parsedQuery')
    if isinstance(parsed_query, list) and parsed_query:
      pieces = [item for item in parsed_query if isinstance(item, str)]
      if pieces:
        candidates.append(''.join(pieces))
    for value in node.values():
      candidates.extend(_extract_text_candidates_from_json_node(value))
  elif isinstance(node, list):
    for item in node:
      candidates.extend(_extract_text_candidates_from_json_node(item))
  return candidates


def _iter_printable_runs(text: str, min_len: int = 80):
  start = None
  for index, char in enumerate(str(text or '')):
    is_binary_control = ord(char) < 32 and char not in '\n\r\t'
    if is_binary_control:
      if start is not None and index - start >= min_len:
        yield start, index, text[start:index]
      start = None
    elif start is None:
      start = index
  if start is not None and len(text) - start >= min_len:
    yield start, len(text), text[start:]


def _run_continues_official_copy(run_text: str, order_token: str) -> bool:
  if not run_text:
    return False
  if run_text.startswith(TRAE_RECONSTRUCTED_LOG_TRACE_PREFIX) or run_text.startswith(TRAE_UNAVAILABLE_LOG_TRACE_PREFIX):
    return False
  markers = [
    'toolName:',
    'status:',
    'filePath:',
    'Todos updated:',
    'command:',
    'changes:',
    'file_pattern:',
    '## ',
  ]
  return any(marker in run_text for marker in markers)


def _read_current_workspace_copy_candidates(db_path: str, order_token: str):
  candidates = []
  if not db_path or not os.path.isfile(db_path):
    return candidates
  try:
    con = sqlite3.connect(db_path)
    try:
      cur = con.cursor()
      cur.execute(
        "select key, value from ItemTable where key like '%icube-ai-agent-storage-input-history%'"
      )
      rows = cur.fetchall()
    finally:
      con.close()
  except Exception:
    return candidates

  for key, value in rows:
    try:
      parsed = json.loads(value)
    except Exception:
      continue
    for text in _extract_text_candidates_from_json_node(parsed):
      if _looks_like_official_copied_log_trace(text, order_token):
        candidates.append({
          'text': text.strip(),
          'source': 'trae-workspace-state-current',
          'detail': f'{db_path}:{key}',
        })
  return candidates


def _read_raw_workspace_copy_candidates(db_path: str, order_token: str):
  candidates = []
  if not db_path or not os.path.isfile(db_path):
    return candidates
  try:
    raw_text = open(db_path, 'rb').read().decode('utf-8', errors='ignore')
  except Exception:
    return candidates

  runs = []
  for start, end, fragment in _iter_printable_runs(raw_text):
    joined = _official_copy_text_from_fragment(fragment)
    if not joined.strip():
      continue
    runs.append({
      'start': start,
      'end': end,
      'fragment': fragment,
      'text': joined,
    })

  for index, run in enumerate(runs):
    text = run['text'].strip()
    if text.startswith(TRAE_RECONSTRUCTED_LOG_TRACE_PREFIX) or text.startswith(TRAE_UNAVAILABLE_LOG_TRACE_PREFIX):
      continue
    if 'toolName:' not in text or 'status:' not in text:
      continue
    if not ('parsedQuery' in run['fragment'] or _run_continues_official_copy(text, order_token)):
      continue

    pieces = [text]
    end_offset = run['end']
    for next_run in runs[index + 1:index + 120]:
      if next_run['start'] - run['start'] > 180000:
        break
      next_text = next_run['text'].strip()
      if not _run_continues_official_copy(next_text, order_token):
        continue
      if next_text in ''.join(pieces):
        continue
      current_text = ''.join(pieces)
      if (
        next_text.startswith('filePath:')
        and 'region-data.ts' not in current_text
        and 'CompactFake' not in current_text
      ):
        continue
      pieces.append(next_run['text'])
      end_offset = next_run['end']
      if '],"images"' in next_run['fragment'] or '],"images":[]' in next_run['fragment']:
        break

    candidate_text = ''.join(pieces).strip()
    if _looks_like_official_copied_log_trace(candidate_text, order_token):
      candidates.append({
        'text': candidate_text[:TRAE_OFFICIAL_COPY_TEXT_MAX_CHARS].rstrip(),
        'source': 'trae-workspace-state-raw',
        'detail': f'{db_path}:raw:{run["start"]}-{end_offset}',
      })
  return candidates


def _accept_code_from_log_line(line: str) -> str:
  text = str(line or '')
  marker = '"acceptCode"'
  marker_index = text.find(marker)
  if marker_index < 0:
    return ''
  colon_index = text.find(':', marker_index + len(marker))
  if colon_index < 0:
    return ''
  value_text = text[colon_index + 1:].lstrip()
  try:
    value, _ = json.JSONDecoder().raw_decode(value_text)
  except Exception:
    return ''
  return value if isinstance(value, str) else ''


def _read_log_accept_code_candidates(order_token: str):
  candidates = []
  order_token = _normalize_order_token_text(order_token)
  if not order_token:
    return candidates
  logs_root = os.path.join(TRAE_APP_SUPPORT_DIR, 'logs')
  if not os.path.isdir(logs_root):
    return candidates
  rg = rg_binary()
  if not rg:
    return candidates
  cmd = [
    rg,
    '--text',
    '--no-heading',
    '--line-number',
    '--fixed-strings',
    '--glob',
    'Trae AI Code Client.log',
    '--max-filesize',
    '120M',
    order_token,
    logs_root,
  ]
  try:
    completed = subprocess.run(
      cmd,
      stdout=subprocess.PIPE,
      stderr=subprocess.DEVNULL,
      text=True,
      timeout=20,
      check=False,
    )
  except Exception:
    return candidates
  for raw_line in (completed.stdout or '').splitlines():
    if '"acceptCode"' not in raw_line or 'toolName:' not in raw_line:
      continue
    try:
      path, line_no, line = raw_line.split(':', 2)
    except ValueError:
      path, line_no, line = '', '', raw_line
    text = _accept_code_from_log_line(line).strip()
    if not _looks_like_official_copied_log_trace(text, order_token):
      continue
    candidates.append({
      'text': text[:TRAE_OFFICIAL_COPY_TEXT_MAX_CHARS].rstrip(),
      'source': 'trae-log-acceptCode',
      'detail': f'{path}:{line_no}' if path and line_no else path,
    })
  return candidates


def _read_project_file_log_trace_candidates(order_token: str):
  candidates = []
  order_token = _normalize_order_token_text(order_token)
  if not order_token:
    return candidates
  skipped_dirs = {
    '.git',
    'node_modules',
    'dist',
    'build',
    '.next',
    '.nuxt',
    '.vite',
    '.cache',
    '.turbo',
    'coverage',
  }
  allowed_suffixes = ('.log', '.md', '.txt', '.json')
  for project_path in project_path_candidates_for_order(order_token):
    if not project_path or not os.path.isdir(project_path):
      continue
    for dirpath, dirnames, filenames in os.walk(project_path):
      dirnames[:] = [name for name in dirnames if name not in skipped_dirs]
      for filename in filenames:
        if not filename.endswith(allowed_suffixes):
          continue
        path = os.path.join(dirpath, filename)
        try:
          if os.path.getsize(path) > 5 * 1024 * 1024:
            continue
          text = open(path, 'r', encoding='utf-8', errors='ignore').read().strip()
        except Exception:
          continue
        if not _looks_like_official_copied_log_trace(text, order_token):
          continue
        candidates.append({
          'text': text[:TRAE_OFFICIAL_COPY_TEXT_MAX_CHARS].rstrip(),
          'source': 'project-file-log-trace',
          'detail': path,
        })
  return candidates


def _decode_json_string_literal(value: str) -> str:
  try:
    decoded = json.loads(f'"{value}"')
    return decoded if isinstance(decoded, str) else ''
  except Exception:
    try:
      return bytes(str(value or ''), 'utf-8').decode('unicode_escape')
    except Exception:
      return ''


def _modular_history_messages(line: str):
  match = re.search(r'messages:\s*"((?:\\.|[^"\\])*)",\s*token_usage:', str(line or ''))
  if not match:
    return None
  decoded = _decode_json_string_literal(match.group(1))
  if not decoded:
    return None
  try:
    parsed = json.loads(decoded)
  except Exception:
    return None
  return parsed if isinstance(parsed, dict) else None


def _modular_history_text_items(content) -> str:
  pieces = []
  if isinstance(content, list):
    for item in content:
      if isinstance(item, dict) and isinstance(item.get('text'), str):
        pieces.append(item.get('text') or '')
  elif isinstance(content, str):
    pieces.append(content)
  return ''.join(pieces).strip()


def _clean_modular_history_text(text: str) -> str:
  value = str(text or '')
  value = re.sub(r'<system-reminder>.*?</system-reminder>', '', value, flags=re.S)
  value = value.replace('<user_input>', '').replace('</user_input>', '')
  value = re.sub(r'\n{3,}', '\n\n', value)
  return value.strip()


def _modular_tool_status_from_text(text: str) -> str:
  value = str(text or '').lower()
  if '<toolcall_status>done</toolcall_status>' in value or 'successfully' in value:
    return 'success'
  if '<toolcall_status>error</toolcall_status>' in value or '<toolcall_status>failed</toolcall_status>' in value:
    return 'failed'
  return 'success'


def _modular_tool_result_summary(text: str) -> str:
  value = str(text or '')
  value = re.sub(r'<system-reminder>.*?</system-reminder>', '', value, flags=re.S)
  value = re.sub(r'</?toolcall_(?:status|result)>', '', value)
  value = re.sub(r'\n{3,}', '\n\n', value).strip()
  if not value:
    return ''
  lines = [line.strip() for line in value.splitlines() if line.strip()]
  if not lines:
    return ''
  if any('Todos have been modified successfully' in line for line in lines):
    return 'Todos updated'
  for line in lines:
    if 'File created successfully at:' in line:
      return line
  return '\n'.join(lines[:8])[:1200].rstrip()


def _format_modular_tool_call(tool_name: str, arguments, status: str = 'success') -> str:
  raw_name = str(tool_name or '').strip() or 'unknown_tool'
  name = {
    'Read': 'view_files',
    'Edit': 'edit_file_search_replace',
    'RunCommand': 'run_command',
    'TodoWrite': 'todo_write',
    'LS': 'view_folder',
  }.get(raw_name, raw_name)
  args = arguments
  if isinstance(args, str):
    try:
      parsed_args = json.loads(args)
      args = parsed_args if isinstance(parsed_args, dict) else {'arguments': arguments}
    except Exception:
      args = {'arguments': arguments}
  if not isinstance(args, dict):
    args = {}

  fields = [f'toolName: {name}', f'status: {str(status or "success").lower()}']
  field_map = [
    ('file_path', 'filePath'),
    ('filePath', 'filePath'),
    ('path', 'filePath'),
    ('command', 'command'),
    ('cmd', 'command'),
    ('file_pattern', 'file_pattern'),
    ('query', 'query'),
  ]
  seen_labels = set()
  for key, label in field_map:
    value = args.get(key)
    if value is None or value == '' or label in seen_labels:
      continue
    if raw_name == 'RunCommand' and label == 'command' and not str(value).rstrip().endswith('undefined'):
      value = f'{str(value).rstrip()}\n undefined'
    fields.append(f'{label}: {value}')
    seen_labels.add(label)
  if raw_name in {'Write', 'Edit', 'MultiEdit'} and 'changes' not in seen_labels:
    fields.append('changes: undefined')
  return '\n'.join(fields)


def _modular_history_event_from_line(line: str, order_token: str, detail: str, require_order: bool = True):
  if 'History: HistoryEvent' not in line:
    return None
  if require_order and order_token and order_token not in line:
    return None
  messages = _modular_history_messages(line)
  if not messages:
    return None
  trace_match = re.search(r'trace_id="([0-9a-f]{32})"', line)
  session_matches = re.findall(r'\bsession_id=([0-9a-f]{24})\b', line)
  task_match = re.search(r'\btask_id=([0-9a-f]{24})\b', line)
  message_match = re.search(r'\bmessage_id=([0-9a-f]{24})\b', line)
  created_match = re.search(r'created_at:\s*(\d+)', line)
  source_match = re.search(r'\bsource:\s*(?:Some\("([^"]+)"\)|"([^"]+)")', line)
  workspace_match = re.search(r'"workspace_path":"([^"]+)"', line)
  trace_id = trace_match.group(1) if trace_match else ''
  source = (source_match.group(1) or source_match.group(2)) if source_match else ''
  raw_messages = messages.get('raw_messages') if isinstance(messages, dict) else None
  if not isinstance(raw_messages, list):
    return None

  rendered = []
  for raw_message in raw_messages:
    if not isinstance(raw_message, dict):
      continue
    role = raw_message.get('role') or ''
    text = _clean_modular_history_text(_modular_history_text_items(raw_message.get('content')))
    if text and role == 'assistant':
      rendered.append(text)
    tool_calls = raw_message.get('tool_calls')
    if isinstance(tool_calls, list):
      for tool_call in tool_calls:
        if not isinstance(tool_call, dict):
          continue
        function_call = tool_call.get('function_call') if isinstance(tool_call.get('function_call'), dict) else {}
        name = function_call.get('name') or tool_call.get('name') or ''
        arguments = function_call.get('arguments') if 'arguments' in function_call else tool_call.get('arguments')
        rendered.append(_format_modular_tool_call(name, arguments, status='success'))

  event_text = '\n\n'.join(part.strip() for part in rendered if str(part or '').strip()).strip()
  if not event_text:
    return None
  return {
    'traceId': trace_id,
    'sessionId': session_matches[0] if session_matches else '',
    'taskMessageId': task_match.group(1) if task_match else '',
    'messageId': message_match.group(1) if message_match else '',
    'createdAt': int(created_match.group(1)) if created_match else 0,
    'workspacePath': workspace_match.group(1) if workspace_match else '',
    'text': event_text,
    'detail': detail,
  }


def _modular_log_file_datetime(path: str):
  match = re.search(
    rf'{re.escape(os.sep)}logs{re.escape(os.sep)}(\d{{8}})T(\d{{6}}){re.escape(os.sep)}Modular{re.escape(os.sep)}',
    str(path or ''),
  )
  if not match:
    return None
  try:
    return datetime.datetime.strptime(match.group(1) + match.group(2), '%Y%m%d%H%M%S')
  except Exception:
    return None


def _object_id_datetime(value: str):
  time_text = _object_id_time_text(value)
  if not time_text:
    return None
  return _parse_trae_composite_time(f':Trae CN.T({time_text})')


def _session_row_locator_time(row: dict):
  dt = _session_row_time(row)
  if dt:
    return dt
  parts = _session_row_composite_parts(row)
  for key in ('taskMessageId', 'chatMessageId', 'sessionId'):
    dt = _object_id_datetime((parts or {}).get(key) or '')
    if dt:
      return dt
  raw_session_id = str((row or {}).get('rawSessionId') or '').strip()
  return _object_id_datetime(raw_session_id)


def _sort_modular_files_for_rows(files, rows):
  target_times = [
    dt for dt in (_session_row_locator_time(row) for row in (rows or []))
    if isinstance(dt, datetime.datetime)
  ]
  if not target_times:
    return list(files or [])

  def sort_key(path):
    file_dt = _modular_log_file_datetime(path)
    if not file_dt:
      return (1, 999999999, str(path))
    nearest = min(abs((file_dt - target_dt).total_seconds()) for target_dt in target_times)
    return (0, nearest, str(path))

  return sorted(files or [], key=sort_key)


def _rg_modular_history_lines(patterns, files, timeout_seconds: int = 20):
  rg = rg_binary()
  if not rg or not patterns or not files:
    return []
  cmd = [
    rg,
    '--text',
    '--no-heading',
    '--line-number',
    '--fixed-strings',
    '--max-filesize',
    '300M',
  ]
  for pattern in patterns:
    pattern = str(pattern or '').strip()
    if pattern:
      cmd.extend(['-e', pattern])
  if len(cmd) <= 7:
    return []
  cmd.extend(files)
  try:
    completed = subprocess.run(
      cmd,
      stdout=subprocess.PIPE,
      stderr=subprocess.DEVNULL,
      text=True,
      timeout=timeout_seconds,
      check=False,
    )
  except Exception:
    return []
  return [
    raw_line for raw_line in (completed.stdout or '').splitlines()
    if 'History: HistoryEvent' in raw_line
  ]


def _read_modular_ai_agent_history_candidates(order_token: str, rows=None):
  candidates = []
  order_token = _normalize_order_token_text(order_token)
  if not order_token:
    return candidates
  logs_root = os.path.join(TRAE_APP_SUPPORT_DIR, 'logs')
  if not os.path.isdir(logs_root):
    return candidates
  rg = rg_binary()
  if not rg:
    return candidates
  modular_globs = [
    '*ai-agent_*_stdout.log',
    '*ai-agent_*_stderr.log',
    '*ckg_*_stdout.log',
    '*cue-server_*_stdout.log',
  ]
  files_cmd = [rg, '--files', logs_root]
  for pattern in modular_globs:
    files_cmd.extend(['--glob', pattern])
  try:
    files_completed = subprocess.run(
      files_cmd,
      stdout=subprocess.PIPE,
      stderr=subprocess.DEVNULL,
      text=True,
      timeout=5,
      check=False,
    )
    files = [
      path for path in (files_completed.stdout or '').splitlines()
      if f'{os.sep}Modular{os.sep}' in path and os.path.isfile(path)
    ]
    if not files:
      return candidates
  except Exception:
    return candidates
  files = _sort_modular_files_for_rows(files, rows)

  raw_lines = {}
  for raw_line in _rg_modular_history_lines([order_token], files, timeout_seconds=20):
    raw_lines[raw_line] = raw_line

  trace_ids = []
  seen_trace_ids = set()
  for row in rows or []:
    parts = _session_row_composite_parts(row)
    trace_id = str((parts or {}).get('traceId') or '').strip()
    if trace_id and trace_id not in seen_trace_ids:
      seen_trace_ids.add(trace_id)
      trace_ids.append(trace_id)
  if trace_ids:
    for raw_line in _rg_modular_history_lines(trace_ids, files, timeout_seconds=30):
      raw_lines[raw_line] = raw_line

  grouped = {}
  details = {}
  for raw_line in raw_lines.values():
    if 'History: HistoryEvent' not in raw_line:
      continue
    try:
      path, line_no, line = raw_line.split(':', 2)
    except ValueError:
      path, line_no, line = '', '', raw_line
    detail = f'{path}:{line_no}' if path and line_no else path
    event = _modular_history_event_from_line(line, order_token, detail, require_order=False)
    if not event:
      continue
    trace_id = event.get('traceId') or 'missing_trace'
    grouped.setdefault(trace_id, []).append(event)
    details.setdefault(trace_id, []).append(detail)

  for trace_id, events in grouped.items():
    events.sort(key=lambda item: (item.get('createdAt') or 0, item.get('detail') or ''))
    first = events[0] if events else {}
    body = '\n\n'.join(event.get('text') or '' for event in events if event.get('text')).strip()
    text = body
    if not _looks_like_official_copied_log_trace(text, order_token):
      continue
    candidates.append({
      'text': text[:TRAE_OFFICIAL_COPY_TEXT_MAX_CHARS].rstrip(),
      'source': 'trae-modular-ai-agent-history',
      'detail': '; '.join(details.get(trace_id, [])[:8]),
      'traceId': trace_id,
      'sessionId': first.get('sessionId') or '',
      'taskMessageId': first.get('taskMessageId') or '',
      'messageId': first.get('messageId') or '',
      'createdAt': first.get('createdAt') or 0,
    })
  return candidates


def _dedupe_official_copy_candidates(candidates):
  deduped = []
  seen_hashes = set()
  for candidate in sorted(candidates or [], key=lambda item: len(item.get('text') or ''), reverse=True):
    text = str(candidate.get('text') or '').strip()
    if not text:
      continue
    digest = hashlib.sha1(re.sub(r'\s+', '', text).encode('utf-8')).hexdigest()
    if digest in seen_hashes:
      continue
    if any(text in (existing.get('text') or '') for existing in deduped):
      continue
    seen_hashes.add(digest)
    deduped.append(candidate)
  return deduped


def read_official_copied_log_trace_candidates(order_token: str, db_path: str = '', rows=None):
  if not db_path:
    try:
      db_path = _find_workspace_db_for_order(order_token)
    except Exception:
      db_path = ''
  candidates = []
  candidates.extend(_read_current_workspace_copy_candidates(db_path, order_token))
  candidates.extend(_read_raw_workspace_copy_candidates(db_path, order_token))
  candidates.extend(_read_modular_ai_agent_history_candidates(order_token, rows=rows))
  candidates.extend(_read_project_file_log_trace_candidates(order_token))
  candidates.extend(_read_log_accept_code_candidates(order_token))
  return _dedupe_official_copy_candidates(candidates)


def _is_source_only_log_trace_row(row: dict) -> bool:
  if not isinstance(row, dict):
    return False
  if row.get('annotationSource') == 'real-log-trace-source-only':
    return True
  if str(row.get('rawSessionId') or '').strip():
    return False
  if str(row.get('sessionId') or '').strip() not in {'', '-'}:
    return False
  if str(row.get('conversation') or '').strip() not in {'', '-'}:
    return False
  if not row.get('officialCopiedLogTrace') or not str(row.get('logTrace') or '').strip():
    return False
  return str(row.get('logTraceSource') or '') in {
    'project-file-log-trace',
    'trae-log-acceptCode',
    'trae-modular-ai-agent-history',
    'trae-workspace-state',
    'trae-workspace-state-current',
    'trae-workspace-state-raw',
  }


def strip_source_only_log_trace_rows(rows) -> tuple[list, bool]:
  if not isinstance(rows, list):
    return [], False
  filtered = [row for row in rows if not _is_source_only_log_trace_row(row)]
  return filtered, len(filtered) != len(rows)


def _conversation_match_terms(conversation: str):
  text = _normalize_dissatisfaction_reason(conversation)
  text = re.sub(r'[请麻烦持续迭代修复处理解决完成问题。！？!?,，；;：:\\s]+', '', text)
  terms = set()
  important_terms = [
    '地名',
    '核实',
    '校验',
    '省市区',
    '联动',
    '资源不存在',
    '请求资源',
    '订单创建',
    '空白',
    '环境依赖',
    '端口',
    '启动',
    '链路',
    '采购商',
  ]
  for term in important_terms:
    if term in str(conversation or ''):
      terms.add(term)
  chinese = ''.join(re.findall(r'[\u4e00-\u9fff]+', text))
  for size in (2, 3, 4):
    for index in range(max(0, len(chinese) - size + 1)):
      term = chinese[index:index + size]
      if term and term not in {'持续', '迭代', '修复', '问题', '页面'}:
        terms.add(term)
  for token in re.findall(r'[A-Za-z0-9_./-]{3,}', str(conversation or '')):
    terms.add(token)
  return terms


def _official_candidate_row_score(row: dict, candidate_text: str, order_token: str) -> int:
  text = str(candidate_text or '')
  conversation = str((row or {}).get('conversation') or '').strip()
  if not conversation:
    return 0

  continuation_markers = (
    '继续创建项目文件',
    '继续完成任务',
    '继续第二轮',
    '模型请求失败',
    '(3003)',
    '3003',
  )
  candidate_is_continuation = any(marker in text for marker in continuation_markers)
  row_is_continuation = any(marker in conversation for marker in continuation_markers)
  if candidate_is_continuation and not row_is_continuation:
    return 0
  if row_is_continuation and not candidate_is_continuation:
    return 0
  if row_is_continuation and '我来帮你创建这个生鲜电商APP' in text:
    return 0

  score = 0
  order_token = str(order_token or '').strip()
  if order_token and any(marker and marker in text for marker in _order_path_markers(order_token)):
    score += 160

  parts = _session_row_composite_parts(row)
  for identifier in (parts.get('traceId'), parts.get('sessionId'), parts.get('chatMessageId'), parts.get('taskMessageId')):
    if identifier and identifier in text:
      score += 120

  if conversation and conversation in text:
    score += 180

  for term in _conversation_match_terms(conversation):
    if not term or term not in text:
      continue
    if term in {'地名', '核实', '校验', '省市区', '联动', '空白', '资源不存在', '请求资源'}:
      score += 45
    else:
      score += 8

  if (
    any(term in conversation for term in ('地名', '核实', '校验'))
    and any(marker in text for marker in ('region-data.ts', '省/市/区县', '省市区', '三级联动', '联动选择'))
  ):
    score += 120

  if len(conversation) < 120:
    score += max(0, 60 - len(conversation) // 2)
  elif len(conversation) > 500:
    score -= 60
  return score


def _row_can_accept_official_log_trace(row: dict) -> bool:
  if not isinstance(row, dict):
    return False
  if row.get('officialCopiedLogTrace'):
    return True
  if str(row.get('logTraceSource') or '').startswith('local-trae-logs'):
    return True
  text = str(row.get('logTrace') or '').strip()
  if not text:
    return True
  if _is_generated_or_placeholder_log_trace(text):
    return True
  if text.startswith(TRAE_RECONSTRUCTED_LOG_TRACE_PREFIX) or text.startswith(TRAE_UNAVAILABLE_LOG_TRACE_PREFIX):
    return True
  if _is_trae_composite_session_id(text) or re.fullmatch(r'[0-9a-f]{24}', text):
    return True
  return False


def _rows_need_official_candidate_scan_on_read(rows) -> bool:
  if not isinstance(rows, list):
    return False
  for row in rows:
    if not isinstance(row, dict):
      continue
    source = str(row.get('logTraceSource') or '')
    text = str(row.get('logTrace') or '').strip()
    if source == TRAE_LOG_TRACE_NOT_FOUND_SOURCE:
      return row.get('logTraceScanVersion') != TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
    if source == 'trae-modular-ai-agent-history':
      return row.get('logTraceFormatVersion') != TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
    if source.startswith('local-trae-logs'):
      return True
    if _is_generated_or_placeholder_log_trace(text):
      return True
    if row.get('officialCopiedLogTrace') and not text:
      return True
  return False


def fill_official_copied_log_traces(order_token: str, rows, db_path: str = '') -> bool:
  if not isinstance(rows, list) or not rows:
    return False
  candidates = read_official_copied_log_trace_candidates(order_token, db_path=db_path, rows=rows)

  changed = False
  for row in rows:
    if not isinstance(row, dict):
      continue
    if not row.get('officialCopiedLogTrace') or not str(row.get('logTrace') or '').strip():
      continue
    if str(row.get('logTraceSource') or '').startswith(('trae-workspace-state', 'trae-log-acceptCode')):
      if _official_candidate_row_score(row, row.get('logTrace') or '', order_token) < 240:
        row['logTrace'] = ''
        row['logTraceSource'] = ''
        row['logTraceSourceDetail'] = ''
        row['logTraceReconstructed'] = False
        row['officialCopiedLogTrace'] = False
        changed = True
  if not candidates:
    return changed

  used_rows = set()
  assigned_rows = set()
  for candidate in candidates:
    candidate_text = str(candidate.get('text') or '').strip()
    if not candidate_text:
      continue
    best = None
    for index, row in enumerate(rows):
      if index in used_rows or not _row_can_accept_official_log_trace(row):
        continue
      parts = _session_row_composite_parts(row)
      candidate_trace_id = str(candidate.get('traceId') or '').strip()
      row_trace_id = str((parts or {}).get('traceId') or '').strip()
      if (
        candidate.get('source') == 'trae-modular-ai-agent-history'
        and candidate_trace_id
        and row_trace_id
        and candidate_trace_id != row_trace_id
      ):
        continue
      conversation = str(row.get('conversation') or '')
      row_is_continuation = any(marker in conversation for marker in ('继续创建项目文件', '继续完成任务', '继续第二轮', '模型请求失败', '(3003)', '3003'))
      if row_is_continuation and str(candidate.get('source') or '').startswith(('trae-workspace-state', 'trae-log-acceptCode')):
        continue
      score = _official_candidate_row_score(row, candidate_text, order_token)
      if candidate_trace_id and row_trace_id and candidate_trace_id == row_trace_id:
        score += 500
      candidate_session_id = str(candidate.get('sessionId') or '').strip()
      if candidate_session_id and candidate_session_id == str((parts or {}).get('sessionId') or '').strip():
        score += 90
      for candidate_key, part_key in (('taskMessageId', 'taskMessageId'), ('messageId', 'chatMessageId')):
        candidate_identifier = str(candidate.get(candidate_key) or '').strip()
        if candidate_identifier and candidate_identifier == str((parts or {}).get(part_key) or '').strip():
          score += 120
      if best is None or score > best[0]:
        best = (score, index, row)
    if not best or best[0] < 240:
      continue

    _, index, row = best
    row['logTrace'] = candidate_text
    row['logTraceSource'] = candidate.get('source') or 'trae-workspace-state'
    row['logTraceSourceDetail'] = candidate.get('detail') or ''
    row['logTraceReconstructed'] = False
    row['logTraceReconstructionVersion'] = TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
    row['logTraceFormatVersion'] = TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
    row['logTraceScanVersion'] = TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
    row['officialCopiedLogTrace'] = True
    row.pop('logTraceMissing', None)
    used_rows.add(index)
    assigned_rows.add(index)
    changed = True
  for index, row in enumerate(rows):
    if index in assigned_rows or not isinstance(row, dict):
      continue
    if not row.get('officialCopiedLogTrace'):
      continue
    source = str(row.get('logTraceSource') or '')
    if not source.startswith('trae-workspace-state'):
      continue
    if _looks_like_official_copied_log_trace(row.get('logTrace') or '', order_token):
      continue
    row['logTraceSource'] = ''
    row['logTraceSourceDetail'] = ''
    row['logTraceReconstructed'] = False
    row['officialCopiedLogTrace'] = False
    changed = True
  return changed


def _is_generated_or_placeholder_log_trace(text: str) -> bool:
  value = str(text or '').strip()
  if not value:
    return False
  if value.startswith(TRAE_RECONSTRUCTED_LOG_TRACE_PREFIX) or value.startswith(TRAE_UNAVAILABLE_LOG_TRACE_PREFIX):
    return True
  if _is_trae_composite_session_id(value) or re.fullmatch(r'[0-9a-f]{24}', value):
    return True
  generated_markers = (
    'source: local-trae-logs',
    'source: local-trae-logs-history',
    'source: local-trae-logs-unavailable',
    'Core Timeline:',
    'local original ai-agent/renderer execution events were not found',
    'Missing:',
    'assistant_text_exact',
  )
  return any(marker in value for marker in generated_markers)


def mark_missing_real_log_traces(order_token: str, rows, db_path: str = '') -> bool:
  if not isinstance(rows, list) or not rows:
    return False
  changed = False
  source_detail = db_path or ''
  for row in rows:
    if not isinstance(row, dict):
      continue
    text = str(row.get('logTrace') or '').strip()
    if _looks_like_official_copied_log_trace(text, order_token):
      if not row.get('officialCopiedLogTrace'):
        row['officialCopiedLogTrace'] = True
        row['logTraceReconstructed'] = False
        row['logTraceSource'] = row.get('logTraceSource') or 'trae-copied-text-existing'
        row['logTraceReconstructionVersion'] = TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
        row['logTraceScanVersion'] = TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
        changed = True
      continue
    needs_missing_mark = (
      bool(text)
      or bool(row.get('officialCopiedLogTrace'))
      or bool(row.get('logTraceReconstructed'))
      or str(row.get('logTraceSource') or '').startswith(('local-trae-logs', 'trae-workspace-state'))
      or (
        str(row.get('logTraceSource') or '') == TRAE_LOG_TRACE_NOT_FOUND_SOURCE
        and row.get('logTraceScanVersion') != TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
      )
      or not row.get('logTraceSource')
    )
    if not needs_missing_mark:
      continue
    before = (
      row.get('logTrace'),
      row.get('logTraceSource'),
      row.get('logTraceSourceDetail'),
      row.get('logTraceReconstructed'),
      row.get('officialCopiedLogTrace'),
      row.get('logTraceMissing'),
      row.get('logTraceReconstructionVersion'),
      row.get('logTraceScanVersion'),
    )
    row['logTrace'] = ''
    row['logTraceSource'] = TRAE_LOG_TRACE_NOT_FOUND_SOURCE
    row['logTraceSourceDetail'] = source_detail
    row['logTraceReconstructed'] = False
    row['officialCopiedLogTrace'] = False
    row['logTraceMissing'] = [TRAE_LOG_TRACE_NOT_FOUND_REASON]
    row['logTraceReconstructionVersion'] = TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
    row['logTraceScanVersion'] = TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
    after = (
      row.get('logTrace'),
      row.get('logTraceSource'),
      row.get('logTraceSourceDetail'),
      row.get('logTraceReconstructed'),
      row.get('officialCopiedLogTrace'),
      row.get('logTraceMissing'),
      row.get('logTraceReconstructionVersion'),
      row.get('logTraceScanVersion'),
    )
    if after != before:
      changed = True
  return changed


def _row_needs_reconstructed_log_trace(row: dict) -> bool:
  if not isinstance(row, dict):
    return False
  text = str(row.get('logTrace') or '').strip()
  if text.startswith(TRAE_RECONSTRUCTED_LOG_TRACE_PREFIX):
    return row.get('logTraceReconstructionVersion') != TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
  if text.startswith(TRAE_UNAVAILABLE_LOG_TRACE_PREFIX):
    return row.get('logTraceReconstructionVersion') != TRAE_RECONSTRUCTED_LOG_TRACE_VERSION
  if _is_trae_composite_session_id(text):
    return True
  if not text or text == '-' or re.fullmatch(r'[0-9a-f]{24}', text):
    return bool(_session_row_composite_parts(row))
  return False


def fill_reconstructed_log_traces(order_token: str, rows, db_path: str = '') -> bool:
  return mark_missing_real_log_traces(order_token, rows, db_path=db_path)


def _precise_create_message_rows(session_id: str):
  if not session_id:
    return []
  rows = []
  seen = set()
  pattern = rf'create message, chat_session_id:\s*{re.escape(session_id)}, message_id:'
  for raw_line in _rg_lines(pattern, timeout_seconds=30):
    line = raw_line.split(':', 2)[-1] if ':' in raw_line else raw_line
    match = re.search(
      r'create message, chat_session_id:\s*([0-9a-f]{24}), message_id:\s*([0-9a-f]{24}).*trace_id="([0-9a-f]{32})"',
      line,
    )
    if not match or match.group(1) != session_id:
      continue
    chat_id = match.group(2)
    if chat_id in seen:
      continue
    seen.add(chat_id)
    rows.append({
      'sessionId': match.group(1),
      'chatMessageId': chat_id,
      'traceId': match.group(3),
      'time': _log_line_time_to_text(line) or _object_id_time_text(chat_id),
    })
  rows.sort(key=lambda item: (
    _session_row_time({'sessionId': f":Trae CN.T({item.get('time')})"}) is None,
    _session_row_time({'sessionId': f":Trae CN.T({item.get('time')})"}) or datetime.datetime.max,
    item.get('chatMessageId') or '',
  ))
  return rows


def _session_candidate_message_ids(session_id: str):
  candidates = []
  seen = set()
  if not session_id:
    return candidates
  for line in _rg_lines(session_id, timeout_seconds=6, fixed_strings=True):
    for groups in re.findall(
      r'"message_id":"([0-9a-f]{24})"|message_id[:=]\s*([0-9a-f]{24})|"block_id":"[0-9a-f]{24}_([0-9a-f]{24})"|tool_id":"([0-9a-f]{24})"',
      line,
    ):
      candidate = ''.join(groups)
      if not candidate or candidate == session_id or candidate in seen:
        continue
      seen.add(candidate)
      candidates.append(candidate)
  return candidates


def _cloud_task_meta_for_trace(trace_id: str, session_id: str = '', chat_message_id: str = ''):
  trace = str(trace_id or '').strip()
  if not re.fullmatch(r'[0-9a-f]{32}', trace):
    return {}
  for raw_line in _rg_lines(trace, timeout_seconds=8, fixed_strings=True):
    line = raw_line.split(':', 2)[-1] if ':' in raw_line else raw_line
    if session_id and session_id not in line:
      continue
    m_task = re.search(r'task_id[=:]\s*([0-9a-f]{24}).*?message_id[=:]\s*([0-9a-f]{24})', line)
    if not m_task:
      continue
    message_id = m_task.group(2)
    if chat_message_id and message_id == chat_message_id:
      continue
    return {
      'taskId': m_task.group(1),
      'messageId': message_id,
      'time': _log_line_time_to_text(line) or _object_id_time_text(message_id),
    }
  return {}


def _repair_row_session_identity(row: dict) -> bool:
  if not isinstance(row, dict):
    return False
  composite = str(
    row.get('sessionComposite')
    or row.get('logTraceId')
    or row.get('sessionId')
    or ''
  ).strip()
  match = re.match(
    r'^\.(?P<user>[^:\s]+):(?P<trace>[0-9a-f]{32})_(?P<session>[0-9a-f]{24})\.(?P<task>[0-9a-f]{24})\.(?P<chat>[0-9a-f]{24}):Trae CN\.T\((?P<time>[^)]+)\)$',
    composite,
  )
  if not match:
    return False
  if match.group('task') != match.group('chat'):
    return False
  cloud_task_meta = _cloud_task_meta_for_trace(match.group('trace'), match.group('session'), match.group('chat'))
  task_message_id = str(cloud_task_meta.get('messageId') or '').strip()
  if not re.fullmatch(r'[0-9a-f]{24}', task_message_id) or task_message_id == match.group('chat'):
    return False
  time_text = str(cloud_task_meta.get('time') or match.group('time') or '').strip()
  repaired = (
    f".{match.group('user')}:{match.group('trace')}_{match.group('session')}."
    f"{task_message_id}.{match.group('chat')}:{TRAE_APP_NAME}.T({time_text})"
  )
  row['sessionId'] = repaired
  row['logTraceId'] = repaired
  row['sessionComposite'] = repaired
  row['rawSessionId'] = match.group('session')
  return True


def _choose_response_or_task_message_id(chat_message_id: str, candidates):
  chat_time = _object_id_time_text(chat_message_id)
  chat_dt = _session_row_time({'sessionId': f":Trae CN.T({chat_time})"}) if chat_time else None
  if not chat_dt:
    return ''
  nearby = []
  for candidate in candidates:
    if candidate == chat_message_id:
      continue
    candidate_time = _object_id_time_text(candidate)
    candidate_dt = _session_row_time({'sessionId': f":Trae CN.T({candidate_time})"}) if candidate_time else None
    if not candidate_dt:
      continue
    delta = abs((candidate_dt - chat_dt).total_seconds())
    if delta <= 3:
      nearby.append((delta, 0 if ('7f0ec' in candidate or '85d83e' in candidate) else 1, candidate))
  if not nearby:
    return ''
  nearby.sort()
  return nearby[0][2]


def extract_trae_session_rounds_precise(order_token: str):
  db_path, current_session_id, input_history, user_id = _read_trae_workspace_context(order_token)
  create_rows = _precise_create_message_rows(current_session_id)
  candidates = _session_candidate_message_ids(current_session_id)
  effective_input_items = []
  previous_text = None
  for item in input_history:
    if not isinstance(item, dict):
      continue
    text = str(item.get('inputText') or '').strip()
    if text and text == previous_text:
      continue
    effective_input_items.append(item)
    previous_text = text

  rows = []
  used_composites = set()
  for item, meta in zip(effective_input_items, create_rows):
    input_text = str(item.get('inputText') or '').strip()
    chat_message_id = meta.get('chatMessageId') or ''
    trace_id = meta.get('traceId') or ''
    if not (re.fullmatch(r'[0-9a-f]{24}', chat_message_id) and re.fullmatch(r'[0-9a-f]{32}', trace_id)):
      continue
    cloud_task_meta = _cloud_task_meta_for_trace(trace_id, current_session_id, chat_message_id)
    task_message_id = cloud_task_meta.get('messageId') or _choose_response_or_task_message_id(chat_message_id, candidates)
    if not re.fullmatch(r'[0-9a-f]{24}', str(task_message_id or '')) or task_message_id == chat_message_id:
      continue
    time_text = cloud_task_meta.get('time') or _object_id_time_text(task_message_id) or meta.get('time') or _object_id_time_text(chat_message_id)
    if not time_text:
      continue
    trace_user = user_id or '3792634309254663'
    composite = f".{trace_user}:{trace_id}_{current_session_id}.{task_message_id}.{chat_message_id}:{TRAE_APP_NAME}.T({time_text})"
    if composite in used_composites:
      continue
    used_composites.add(composite)
    rows.append({
      'sessionId': composite,
      'rawSessionId': current_session_id,
      'conversation': input_text,
      'logTraceId': composite,
      'sessionComposite': composite,
      'logTrace': '',
    })

  return {
    'order': order_token,
    'db_path': db_path,
    'sessionId': current_session_id,
    'rows': sort_session_rows_by_time(rows),
  }


def read_trae_session_cache(order_token: str):
  path = _session_cache_path(order_token)
  payload = read_json(path, None)
  if not isinstance(payload, dict):
    try:
      db_path = _find_workspace_db_for_order(order_token)
    except Exception:
      db_path = ''
    payload = {
      'order': order_token,
      'db_path': db_path,
      'sessionId': '-',
      'cached': False,
      'cache_path': path,
      'rows': [],
    }
    return {
      'order': order_token,
      'sessionId': '-',
      'cached': False,
      'cache_path': path,
      'rows': [],
    }
  original_rows_snapshot = json.dumps(payload.get('rows') or [], ensure_ascii=False, sort_keys=True)
  normalized_rows = normalize_trae_session_rows(payload.get('rows') or [])
  payload['rows'], source_rows_removed = strip_source_only_log_trace_rows(normalized_rows)
  payload['rows'] = sort_session_rows_by_time(payload['rows'])
  rows_changed = json.dumps(payload.get('rows') or [], ensure_ascii=False, sort_keys=True) != original_rows_snapshot
  source_rows_removed = bool(payload.pop('logTraceSourceOnly', None)) or source_rows_removed
  official_trace_changed = False
  if _rows_need_official_candidate_scan_on_read(payload['rows']):
    official_trace_changed = fill_official_copied_log_traces(order_token, payload['rows'], db_path=payload.get('db_path') or '')
  trace_changed = mark_missing_real_log_traces(order_token, payload['rows'], db_path=payload.get('db_path') or '')
  annotation_changed = _annotate_session_rows(payload['rows'], use_model=False)
  screenshot_changed = _fill_session_screenshots_from_input_history(order_token, payload)
  if rows_changed or official_trace_changed or trace_changed or source_rows_removed or annotation_changed or screenshot_changed:
    _persist_session_cache(path, payload)
  payload['cached'] = True
  payload['cache_path'] = path
  return payload


def refresh_trae_session_cache(order_token: str, deep_scan: bool = False):
  refresh_deadline = time.monotonic() + (
    TRAE_DEEP_REFRESH_TIMEOUT_SECONDS if deep_scan else TRAE_REFRESH_TIMEOUT_SECONDS
  )
  payload = None
  fast_precise_refresh = False
  if deep_scan:
    try:
      precise_payload = extract_trae_session_rounds_precise(order_token)
      precise_rows, _ = strip_source_only_log_trace_rows(normalize_trae_session_rows(precise_payload.get('rows') or []))
      precise_payload['rows'] = sort_session_rows_by_time(precise_rows)
      expected_count = _expected_trae_session_round_count(order_token)
      if expected_count and len(precise_payload.get('rows') or []) >= expected_count:
        payload = precise_payload
        fast_precise_refresh = True
    except Exception as exc:
      print(f'[WARN] fast precise session refresh skipped for {order_token}: {exc}', file=sys.stderr)
  if payload is None:
    payload = extract_trae_session_rounds(
      order_token,
      include_trace=True,
      deadline=refresh_deadline,
      allow_full_scan=deep_scan,
    )
  if deep_scan:
    payload['deepScan'] = True
  if fast_precise_refresh:
    payload['fastPreciseRefresh'] = True
  payload_rows, _ = strip_source_only_log_trace_rows(normalize_trae_session_rows(payload.get('rows') or []))
  payload['rows'] = sort_session_rows_by_time(payload_rows)
  refresh_full_row_count = len(payload.get('rows') or [])
  refresh_precise_row_count = None
  if not fast_precise_refresh:
    try:
      precise_payload = extract_trae_session_rounds_precise(order_token)
      precise_rows, _ = strip_source_only_log_trace_rows(normalize_trae_session_rows(precise_payload.get('rows') or []))
      precise_payload['rows'] = sort_session_rows_by_time(precise_rows)
      refresh_precise_row_count = len(precise_payload.get('rows') or [])
      if _session_rows_quality(precise_payload.get('rows') or []) > _session_rows_quality(payload.get('rows') or []):
        payload = precise_payload
    except Exception as exc:
      print(f'[WARN] precise session refresh fallback skipped for {order_token}: {exc}', file=sys.stderr)
  if deep_scan:
    payload['deepScan'] = True
  if fast_precise_refresh:
    payload['fastPreciseRefresh'] = True
  fill_official_copied_log_traces(order_token, payload.get('rows') or [], db_path=payload.get('db_path') or '')
  mark_missing_real_log_traces(order_token, payload.get('rows') or [], db_path=payload.get('db_path') or '')
  path = _session_cache_path(order_token)
  previous_payload = read_json(path, None)
  previous_rows = normalize_trae_session_rows((previous_payload or {}).get('rows') or []) if isinstance(previous_payload, dict) else []
  previous_rows, previous_source_rows_removed = strip_source_only_log_trace_rows(previous_rows)
  if previous_source_rows_removed and isinstance(previous_payload, dict):
    previous_payload['rows'] = previous_rows
    previous_payload.pop('logTraceSourceOnly', None)
  if previous_rows:
    previous_db_path = (previous_payload or {}).get('db_path') or payload.get('db_path') or ''
    fill_official_copied_log_traces(order_token, previous_rows, db_path=previous_db_path)
    mark_missing_real_log_traces(order_token, previous_rows, db_path=previous_db_path)
  if previous_rows and 0 < len(payload.get('rows') or []) < len(previous_rows):
    previous_payload['rows'] = sort_session_rows_by_time(previous_rows)
    previous_payload['cached'] = True
    previous_payload['cache_path'] = path
    previous_payload['refreshFewerRows'] = True
    previous_payload['refreshAttemptedAt'] = datetime.datetime.now().isoformat(timespec='seconds')
    return previous_payload
  if not payload.get('rows'):
    if previous_rows and isinstance(previous_payload, dict):
      previous_payload['rows'] = sort_session_rows_by_time(previous_rows)
      previous_payload['cached'] = True
      previous_payload['cache_path'] = path
      previous_payload['refreshNoNewRows'] = True
      previous_payload['refreshAttemptedAt'] = datetime.datetime.now().isoformat(timespec='seconds')
      return previous_payload
    payload['cached'] = False
    payload['refreshNoNewRows'] = True
    payload['refreshAttemptedAt'] = datetime.datetime.now().isoformat(timespec='seconds')
    payload['cache_path'] = path
    if payload.pop('_traceTimedOut', False):
      payload['traceTimedOut'] = True
    _persist_session_cache(path, payload)
    return payload
  if previous_rows:
    def _stable_previous_row_key(candidate):
      parts = _session_row_composite_parts(candidate)
      if parts:
        return (
          parts.get('traceId') or '',
          parts.get('sessionId') or '',
          parts.get('chatMessageId') or '',
        )
      conversation = str((candidate or {}).get('conversation') or '').strip()
      if conversation:
        return ('conversation', hashlib.sha1(conversation.encode('utf-8')).hexdigest(), '')
      return None

    def _preserve_existing_row_identity(row, previous):
      if not isinstance(previous, dict) or not previous:
        return row
      for key in (
        'sessionId',
        'logTraceId',
        'sessionComposite',
        'rawSessionId',
        'conversation',
        'dissatisfactionReason',
        'annotationHash',
        'annotationVersion',
        'annotationUpdatedAt',
        'annotationSource',
      ):
        if key in previous:
          row[key] = previous.get(key)
      return row

    previous_by_key = {}
    for previous in previous_rows:
      key = _stable_previous_row_key(previous)
      if key and key not in previous_by_key:
        previous_by_key[key] = previous
    merged_rows = []
    for idx, row in enumerate(payload.get('rows') or []):
      current_key = _stable_previous_row_key(row)
      previous = previous_by_key.get(current_key) if current_key else None
      if not previous and idx < len(previous_rows):
        previous = previous_rows[idx]
      if not isinstance(previous, dict):
        previous = {}
      current_parts = _session_row_composite_parts(row)
      previous_parts = _session_row_composite_parts(previous)
      if (
        current_parts
        and previous_parts
        and current_parts.get('traceId') == previous_parts.get('traceId')
        and current_parts.get('sessionId') == previous_parts.get('sessionId')
        and current_parts.get('chatMessageId') == previous_parts.get('chatMessageId')
        and current_parts.get('taskMessageId') != previous_parts.get('taskMessageId')
        and (
          _has_real_task_message_id(previous_parts)
          or not _has_real_task_message_id(current_parts)
        )
      ):
        row = _preserve_existing_row_identity(row, previous)
      if not _is_trae_composite_session_id(row.get('sessionId') or '') and _is_trae_composite_session_id(previous.get('sessionId') or ''):
        row = _preserve_existing_row_identity(row, previous)
      elif previous:
        for key in (
          'rawSessionId',
          'conversation',
          'dissatisfactionReason',
          'annotationHash',
          'annotationVersion',
          'annotationUpdatedAt',
          'annotationSource',
        ):
          if key in previous:
            row[key] = previous.get(key)
      merged_rows.append(row)
    payload['rows'] = merged_rows
  fill_official_copied_log_traces(order_token, payload.get('rows') or [], db_path=payload.get('db_path') or '')
  mark_missing_real_log_traces(order_token, payload.get('rows') or [], db_path=payload.get('db_path') or '')
  _annotate_session_rows(payload.get('rows') or [], use_model=True)
  payload['cached'] = True
  payload['refreshedAt'] = datetime.datetime.now().isoformat(timespec='seconds')
  if payload.pop('_traceTimedOut', False):
    payload['traceTimedOut'] = True
  _persist_session_cache(path, payload)
  payload['cache_path'] = path
  return payload


def _rows_need_force_log_trace_scan(rows) -> bool:
  if not isinstance(rows, list) or not rows:
    return False
  for row in rows:
    if not isinstance(row, dict):
      continue
    source = str(row.get('logTraceSource') or '')
    text = str(row.get('logTrace') or '').strip()
    if source == TRAE_LOG_TRACE_NOT_FOUND_SOURCE:
      return True
    if not row.get('officialCopiedLogTrace') or not text:
      return True
    if source == 'trae-modular-ai-agent-history' and row.get('logTraceFormatVersion') != TRAE_RECONSTRUCTED_LOG_TRACE_VERSION:
      return True
  return False


def _effective_trae_input_history_items(input_history):
  if not isinstance(input_history, list):
    return []
  effective_items = []
  previous_text = None
  for item in input_history:
    if not isinstance(item, dict):
      continue
    text = str(item.get('inputText') or '').strip()
    media = item.get('multiMedia') if isinstance(item.get('multiMedia'), list) else []
    has_media = bool(media)
    if text and text == previous_text and not has_media:
      continue
    effective_items.append(item)
    previous_text = text
  return effective_items


def _expected_trae_session_round_count(order_token: str) -> int:
  try:
    _, _, input_history, _ = _read_trae_workspace_context(order_token)
  except Exception:
    return 0
  return len(_effective_trae_input_history_items(input_history))


def _cached_rows_need_deep_discovery(order_token: str, cached_rows) -> tuple:
  rows, _ = strip_source_only_log_trace_rows(normalize_trae_session_rows(cached_rows or []))
  expected_count = _expected_trae_session_round_count(order_token)
  cached_count = len(rows)
  if expected_count and cached_count < expected_count:
    return True, expected_count, cached_count
  return False, expected_count, cached_count


def refresh_existing_trae_session_log_traces(order_token: str):
  payload = read_trae_session_cache(order_token)
  rows = payload.get('rows') if isinstance(payload, dict) else []
  if not isinstance(rows, list) or not rows:
    return refresh_trae_session_cache(order_token, deep_scan=True)
  needs_deep, expected_count, cached_count = _cached_rows_need_deep_discovery(order_token, rows)
  if needs_deep:
    refreshed = refresh_trae_session_cache(order_token, deep_scan=True)
    if isinstance(refreshed, dict):
      refreshed['deepScanReason'] = 'cached_rows_less_than_workspace_input_history'
      refreshed['expectedRows'] = expected_count
      refreshed['cachedRowsBeforeRefresh'] = cached_count
    return refreshed
  payload['deepScan'] = False
  payload['logTraceOnlyRefresh'] = True
  before = json.dumps(rows, ensure_ascii=False, sort_keys=True)
  annotation_changed = _annotate_session_rows(rows, use_model=True)
  if not _rows_need_force_log_trace_scan(rows):
    payload['cached'] = True
    payload['refreshNoLogTraceChanges'] = True
    payload['refreshAttemptedAt'] = datetime.datetime.now().isoformat(timespec='seconds')
    if annotation_changed:
      payload['rows'] = sort_session_rows_by_time(rows)
      payload['refreshedAt'] = payload['refreshAttemptedAt']
      _persist_session_cache(_session_cache_path(order_token), payload)
      payload['cache_path'] = _session_cache_path(order_token)
    return payload

  fill_official_copied_log_traces(order_token, rows, db_path=payload.get('db_path') or '')
  mark_missing_real_log_traces(order_token, rows, db_path=payload.get('db_path') or '')
  _annotate_session_rows(rows, use_model=True)
  payload['rows'] = sort_session_rows_by_time(rows)
  payload['cached'] = True
  payload['refreshedAt'] = datetime.datetime.now().isoformat(timespec='seconds')
  payload['refreshAttemptedAt'] = payload['refreshedAt']
  after = json.dumps(payload.get('rows') or [], ensure_ascii=False, sort_keys=True)
  payload['refreshNoLogTraceChanges'] = before == after
  _persist_session_cache(_session_cache_path(order_token), payload)
  payload['cache_path'] = _session_cache_path(order_token)
  return payload


def refresh_trae_session_identity_column(order_token: str):
  payload = read_json(_session_cache_path(order_token), None)
  if not isinstance(payload, dict):
    payload = refresh_trae_session_cache(order_token, deep_scan=False)
  rows = normalize_trae_session_rows(payload.get('rows') or []) if isinstance(payload, dict) else []
  changed_count = 0
  for row in rows:
    if _repair_row_session_identity(row):
      changed_count += 1
  payload['rows'] = sort_session_rows_by_time(rows)
  payload['cached'] = True
  payload['deepScan'] = False
  payload['identityOnlyRefresh'] = True
  payload['identityFixCount'] = changed_count
  payload.pop('deepScanReason', None)
  payload['refreshedAt'] = datetime.datetime.now().isoformat(timespec='seconds')
  payload['refreshAttemptedAt'] = payload['refreshedAt']
  _persist_session_cache(_session_cache_path(order_token), payload)
  payload['cache_path'] = _session_cache_path(order_token)
  return payload


def queued_refresh_trae_session_cache(order_token: str, force: bool = False, discover: bool = False):
  orders = parse_order_tokens([order_token])
  if not orders:
    raise RuntimeError('order is required')
  order = orders[0]
  now = time.monotonic()
  completed_future = None
  queued = False
  started = False
  with TRAE_REFRESH_TASKS_LOCK:
    task_info = TRAE_REFRESH_TASKS.get(order)
    future = task_info.get('future') if isinstance(task_info, dict) else task_info
    started_at = float(task_info.get('startedAt') or 0) if isinstance(task_info, dict) else 0
    task_ttl = TRAE_REFRESH_TASK_TTL_SECONDS
    if isinstance(task_info, dict) and task_info.get('deepScan'):
      task_ttl = TRAE_DEEP_REFRESH_TASK_TTL_SECONDS
    if future is not None and not future.done() and started_at and now - started_at > task_ttl:
      TRAE_REFRESH_TASKS.pop(order, None)
      future = None
    if future is not None and future.done():
      TRAE_REFRESH_TASKS.pop(order, None)
      completed_future = future
    elif future is not None and not future.done():
      queued = True
    else:
      if force:
        cached_payload = read_json(_session_cache_path(order), None)
        cached_rows = (cached_payload or {}).get('rows') if isinstance(cached_payload, dict) else []
        cached_count = len(cached_rows) if isinstance(cached_rows, list) else 0
        if discover:
          expected_count = _expected_trae_session_round_count(order)
          future = TRAE_REFRESH_EXECUTOR.submit(refresh_trae_session_cache, order, True)
          TRAE_REFRESH_TASKS[order] = {
            'future': future,
            'startedAt': now,
            'deepScan': True,
            'logTraceOnly': False,
            'identityOnly': False,
            'expectedRows': expected_count,
            'cachedRows': cached_count,
            'reason': 'discover_missing_rounds',
          }
        elif isinstance(cached_rows, list) and cached_rows:
          future = TRAE_REFRESH_EXECUTOR.submit(refresh_trae_session_identity_column, order)
          TRAE_REFRESH_TASKS[order] = {
            'future': future,
            'startedAt': now,
            'deepScan': False,
            'logTraceOnly': False,
            'identityOnly': True,
            'expectedRows': cached_count,
            'cachedRows': cached_count,
            'reason': 'session_identity_only',
          }
        else:
          future = TRAE_REFRESH_EXECUTOR.submit(refresh_trae_session_cache, order, False)
          TRAE_REFRESH_TASKS[order] = {
            'future': future,
            'startedAt': now,
            'deepScan': False,
            'logTraceOnly': False,
            'identityOnly': False,
            'expectedRows': 0,
            'cachedRows': cached_count,
            'reason': 'empty_cache_light_refresh',
          }
        started = True

  if queued or started:
    cached_payload = read_trae_session_cache(order)
    cached_payload['refreshPending'] = True
    cached_payload['queued'] = queued
    cached_payload['deepScan'] = bool((TRAE_REFRESH_TASKS.get(order) or {}).get('deepScan'))
    cached_payload['logTraceOnlyRefresh'] = bool((TRAE_REFRESH_TASKS.get(order) or {}).get('logTraceOnly'))
    cached_payload['identityOnlyRefresh'] = bool((TRAE_REFRESH_TASKS.get(order) or {}).get('identityOnly'))
    return {'ok': True, 'maxWorkers': TRAE_REFRESH_MAX_WORKERS, **cached_payload}

  if completed_future is None:
    cached_payload = read_trae_session_cache(order)
    cached_payload['queued'] = False
    return {'ok': True, 'maxWorkers': TRAE_REFRESH_MAX_WORKERS, **cached_payload}

  result = completed_future.result()
  return {'ok': True, 'queued': False, 'maxWorkers': TRAE_REFRESH_MAX_WORKERS, **result}


def _cached_session_orders():
  if not os.path.isdir(TRAE_SESSION_CACHE_DIR):
    return []
  orders = []
  for name in os.listdir(TRAE_SESSION_CACHE_DIR):
    if not name.endswith('.json'):
      continue
    order = os.path.splitext(name)[0]
    if order:
      orders.append(order)
  return sorted(set(orders))


def _local_project_orders():
  orders = []
  if os.path.isdir(TRAE_ROOT):
    for scene_name in os.listdir(TRAE_ROOT):
      scene_path = os.path.join(TRAE_ROOT, scene_name)
      if not os.path.isdir(scene_path):
        continue
      try:
        child_names = os.listdir(scene_path)
      except Exception:
        continue
      for name in child_names:
        path = os.path.join(scene_path, name)
        if os.path.isdir(path) and _is_order_token_name(name):
          orders.append(_normalize_order_token_text(name))
  for record in _iter_workspace_db_records() or []:
    order = record.get('order') or ''
    if _is_order_token_name(order):
      orders.append(_normalize_order_token_text(order))
  return sorted(set(orders))


def _resolve_log_trace_repair_orders(raw_orders):
  if raw_orders is None:
    return _cached_session_orders()
  if isinstance(raw_orders, str) and raw_orders.strip().lower() in {'*', 'all', '全部'}:
    return sorted(set(_cached_session_orders()) | set(_local_project_orders()))
  return parse_order_tokens(raw_orders)


def repair_trae_log_traces(raw_orders=None, refresh_missing: bool = False, limit: int = 0):
  orders = _resolve_log_trace_repair_orders(raw_orders)
  if limit:
    try:
      orders = orders[:max(0, int(limit))]
    except Exception:
      pass
  results = []
  totals = {
    'orders': 0,
    'rows': 0,
    'officialCopied': 0,
    'reconstructed': 0,
    'unavailable': 0,
    'notFoundRealFile': 0,
    'empty': 0,
    'failed': 0,
  }
  for order in orders:
    totals['orders'] += 1
    try:
      cache_path = _session_cache_path(order)
      if os.path.isfile(cache_path):
        payload = read_trae_session_cache(order)
      elif refresh_missing:
        payload = refresh_trae_session_cache(order)
      else:
        payload = {
          'order': order,
          'sessionId': '-',
          'rows': [],
          'cached': False,
          'cache_path': cache_path,
          'skippedNoCache': True,
        }
      rows = payload.get('rows') if isinstance(payload, dict) else []
      if not isinstance(rows, list):
        rows = []
      official_count = 0
      reconstructed_count = 0
      unavailable_count = 0
      not_found_count = 0
      for row in rows:
        if not isinstance(row, dict):
          continue
        text = str(row.get('logTrace') or '')
        if row.get('officialCopiedLogTrace'):
          official_count += 1
        elif text.startswith(TRAE_RECONSTRUCTED_LOG_TRACE_PREFIX):
          reconstructed_count += 1
        elif text.startswith(TRAE_UNAVAILABLE_LOG_TRACE_PREFIX):
          unavailable_count += 1
        elif row.get('logTraceSource') == TRAE_LOG_TRACE_NOT_FOUND_SOURCE:
          not_found_count += 1
      totals['rows'] += len(rows)
      totals['officialCopied'] += official_count
      totals['reconstructed'] += reconstructed_count
      totals['unavailable'] += unavailable_count
      totals['notFoundRealFile'] += not_found_count
      if not rows:
        totals['empty'] += 1
      results.append({
        'ok': True,
        'order': order,
        'rows': len(rows),
        'officialCopied': official_count,
        'reconstructed': reconstructed_count,
        'unavailable': unavailable_count,
        'notFoundRealFile': not_found_count,
        'cached': bool(payload.get('cached')) if isinstance(payload, dict) else False,
        'skippedNoCache': bool(payload.get('skippedNoCache')) if isinstance(payload, dict) else False,
        'cache_path': payload.get('cache_path') if isinstance(payload, dict) else cache_path,
      })
    except Exception as exc:
      totals['failed'] += 1
      results.append({'ok': False, 'order': order, 'error': str(exc)})
  return {
    'ok': True,
    'orders': orders,
    'totals': totals,
    'results': results,
    'version': TRAE_RECONSTRUCTED_LOG_TRACE_VERSION,
  }


def extract_trae_session_rounds(order_token: str, include_trace: bool = True, deadline=None, allow_full_scan: bool = True):
  trace_timed_out = False
  log_scan_limit = TRAE_LOG_SCAN_LIMIT if allow_full_scan else (
    TRAE_REFRESH_LOG_SCAN_LIMIT if deadline is not None else TRAE_LOG_SCAN_LIMIT
  )
  recent_line_iter = (
    (lambda path: _iter_recent_log_lines(path, TRAE_REFRESH_LOG_TAIL_BYTES))
    if deadline is not None
    else _iter_recent_log_lines
  )

  def _deadline_expired():
    nonlocal trace_timed_out
    if deadline is not None and time.monotonic() > deadline:
      trace_timed_out = True
      return True
    return False

  db_path = _find_workspace_db_for_order(order_token)
  con = sqlite3.connect(db_path)
  try:
    cur = con.cursor()
    cur.execute("select key, value from ItemTable")
    kv = {k: v for k, v in cur.fetchall()}
  finally:
    con.close()

  memento = _safe_json_loads(kv.get('memento/icube-ai-agent-storage', '{}'), {})
  input_history = _safe_json_loads(kv.get('icube-ai-agent-storage-input-history', '[]'), [])
  chat_store = _safe_json_loads(kv.get('ChatStore', '{}'), {})
  if not isinstance(input_history, list):
    input_history = []

  current_session_id = str(memento.get('currentSessionId') or '').strip()
  if not current_session_id and isinstance(memento.get('list'), list) and memento['list']:
    current_session_id = str(memento['list'][0].get('sessionId') or '').strip()

  user_id = ''
  for key, value in kv.items():
    m_user = re.match(r'^(\d{10,})_', str(key))
    if m_user:
      user_id = m_user.group(1)
      break
    if not user_id:
      m_user = re.search(r'"userId"\s*:\s*"?(\d{10,})"?', str(value))
      if m_user:
        user_id = m_user.group(1)
  marker = str(kv.get('__$__targetStorageMarker') or '')
  if not user_id and marker:
    m_user = re.search(r'(\d{10,})', marker)
    if m_user:
      user_id = m_user.group(1)
  if not user_id:
    for key in kv.keys():
      m_user = re.match(r'^(\d{10,})_', str(key))
      if m_user:
        user_id = m_user.group(1)
        break

  app_name = 'Trae CN'

  turn_keys = []
  try:
    turns_height = (((chat_store or {}).get('state') or {}).get('turnsHeight') or {})
    if isinstance(turns_height, dict):
      for key in turns_height.keys():
        key_text = str(key)
        if current_session_id and key_text.startswith(f'{current_session_id}-'):
          turn_keys.append(key_text)
      if not turn_keys:
        turn_keys = [str(key) for key in turns_height.keys()]
      def _turn_order(v):
        part = v.rsplit('-', 1)[-1]
        return int(part) if part.isdigit() else 10**12
      turn_keys.sort(key=_turn_order)
      deduped_turn_keys = []
      seen_chat_ids = set()
      for key in turn_keys:
        key_text = str(key)
        chat_id = key_text.rsplit('-', 1)[0] if '-' in key_text else key_text
        if re.fullmatch(r'[0-9a-f]{24}', chat_id):
          if chat_id in seen_chat_ids:
            continue
          seen_chat_ids.add(chat_id)
        deduped_turn_keys.append(key_text)
      turn_keys = deduped_turn_keys
  except Exception:
    turn_keys = []

  target_chat_ids = []
  for key in turn_keys:
    if '-' in key:
      chat_id = key.rsplit('-', 1)[0]
      if re.fullmatch(r'[0-9a-f]{24}', chat_id):
        target_chat_ids.append(chat_id)
  target_chat_ids_set = set(target_chat_ids)

  def _log_time_to_text(line: str) -> str:
    m_time = re.match(r'^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})', line)
    if not m_time:
      return ''
    return f"{int(m_time.group(1))}/{int(m_time.group(2))}/{int(m_time.group(3))} {m_time.group(4)}"

  def _ensure_meta(meta_map: dict, chat_msg: str) -> dict:
    if chat_msg not in meta_map:
      meta_map[chat_msg] = {
        'traceId': '',
        'sessionId': '',
        'chatMessageId': chat_msg,
        'taskMessageId': '',
        'time': '',
      }
    return meta_map[chat_msg]

  def _extract_meta_from_line(line: str, chat_msg: str = '', session_hint: str = ''):
    meta = None

    def _touch(chat_id: str):
      nonlocal meta
      if not chat_id:
        return None
      meta = _ensure_meta(message_meta, chat_id)
      if session_hint and not meta.get('sessionId'):
        meta['sessionId'] = session_hint
      if not meta.get('time'):
        meta['time'] = _log_time_to_text(line)
      return meta

    m_pair = re.search(r'create message, chat_session_id:\s*([0-9a-f]{24}), message_id:\s*([0-9a-f]{24})', line)
    if m_pair:
      sess = m_pair.group(1)
      chat_id = m_pair.group(2)
      if chat_msg and chat_id != chat_msg:
        return None
      meta = _touch(chat_id)
      if meta:
        meta['sessionId'] = sess
        m_trace = re.search(r'trace_id=\"([0-9a-f]{32})\"', line)
        if m_trace and not meta.get('traceId'):
          meta['traceId'] = m_trace.group(1)
      return meta

    patterns = [
      r'create_new_version(?:_v2)?(?: chat_session_id:)?\s*([0-9a-f]{24})?.*?message_id[:=]\s*([0-9a-f]{24})',
      r'chat_turn_finish completed: session_id=([0-9a-f]{24}), message_id=([0-9a-f]{24})',
      r'create snapshot, chat_session_id: ([0-9a-f]{24}), message_id: ([0-9a-f]{24})',
      r'create snapshot, chat_session_id: ([0-9a-f]{24}), message_id: ([0-9a-f]{24})',
      r'plan tool call finish .*?user_message_id[:=]\s*([0-9a-f]{24}), task_id:\s*([0-9a-f]{24})',
      r'plan tool call finish .*?user_message_id[:=]\s*([0-9a-f]{24}), task_id[:=]\s*([0-9a-f]{24})',
    ]
    for pattern in patterns:
      m = re.search(pattern, line)
      if not m:
        continue
      groups = [group for group in m.groups() if group]
      if not groups:
        continue
      if len(groups) >= 2:
        session_id = groups[0]
        message_id = groups[1]
        if chat_msg and message_id != chat_msg:
          continue
        meta = _touch(message_id)
        if meta:
          if re.fullmatch(r'[0-9a-f]{24}', session_id):
            meta['sessionId'] = session_id
          if len(groups) >= 3 and re.fullmatch(r'[0-9a-f]{32}', groups[2]):
            meta['traceId'] = groups[2]
        return meta

    m_task = re.search(r'task_id[:=]\s*([0-9a-f]{24}).*?message_id[:=]\s*([0-9a-f]{24})', line)
    if m_task:
      task_id = m_task.group(1)
      task_msg = m_task.group(2)
      chat_id = ''
      m_user_msg = re.search(r'user_message_id[:=]\s*([0-9a-f]{24})', line)
      if m_user_msg:
        chat_id = m_user_msg.group(1)
      if chat_msg and chat_id != chat_msg:
        return None
      meta = _touch(chat_id or task_msg)
      if meta:
        meta['taskMessageId'] = task_msg
        m_sess = re.search(r'session_id[:=]\s*([0-9a-f]{24})', line)
        if m_sess and not meta.get('sessionId'):
          meta['sessionId'] = m_sess.group(1)
        m_trace = re.search(r'trace_id=\"([0-9a-f]{32})\"', line)
        if m_trace and not meta.get('traceId'):
          meta['traceId'] = m_trace.group(1)
      return meta

    m_trace = re.search(r'trace_id=\"([0-9a-f]{32})\"', line)
    m_session = re.search(r'(?:chat_session_id|session_id)[:=]\s*([0-9a-f]{24})', line)
    m_message = re.search(r'(?:message_id|user_message_id)[:=]\s*([0-9a-f]{24})', line)
    m_block = re.search(r'block_id[:=]\s*\"?([0-9a-f]{24})_([0-9a-f]{24})\"?', line)
    if m_message:
      message_id = m_message.group(1)
      if chat_msg and message_id != chat_msg:
        return None
      meta = _touch(message_id)
      if meta:
        if m_session and re.fullmatch(r'[0-9a-f]{24}', m_session.group(1)):
          meta['sessionId'] = m_session.group(1)
        if m_trace and not meta.get('traceId'):
          meta['traceId'] = m_trace.group(1)
        if m_task and not meta.get('taskMessageId'):
          meta['taskMessageId'] = m_task.group(2)
        if m_block and m_block.group(1) == message_id and not meta.get('taskMessageId'):
          meta['taskMessageId'] = m_block.group(2)
      return meta

    m_renderer = re.search(r'\"session_id\":\"([0-9a-f]{24})\".*\"message_id\":\"([0-9a-f]{24})\"', line)
    if m_renderer:
      sess = m_renderer.group(1)
      message_id = m_renderer.group(2)
      if chat_msg and message_id != chat_msg:
        return None
      meta = _touch(message_id)
      if meta:
        meta['sessionId'] = sess
        m_block = re.search(r'\"block_id\":\"([0-9a-f]{24})_([0-9a-f]{24})\"', line)
        if m_block and m_block.group(1) == message_id and not meta.get('taskMessageId'):
          meta['taskMessageId'] = m_block.group(2)
      return meta

    return None

  def _time_text_to_datetime(time_text: str):
    m_time = re.match(r'^(\d{4})/(\d{1,2})/(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})$', str(time_text or '').strip())
    if not m_time:
      return None
    try:
      return datetime.datetime(
        int(m_time.group(1)),
        int(m_time.group(2)),
        int(m_time.group(3)),
        int(m_time.group(4)),
        int(m_time.group(5)),
        int(m_time.group(6)),
      )
    except ValueError:
      return None

  def _media_datetimes(item: dict):
    values = []
    media_items = item.get('multiMedia') if isinstance(item.get('multiMedia'), list) else []
    media_items += item.get('images') if isinstance(item.get('images'), list) else []
    for media_item in media_items:
      if not isinstance(media_item, dict):
        continue
      raw = ' '.join(str(media_item.get(key) or '') for key in ('resource_id', 'url', 'src', 'name'))
      for match in re.finditer(r'(?<!\d)(1[6-9]\d{11})(?!\d)', raw):
        try:
          # Trae resource_id stores millisecond epoch; logs on this machine are UTC+3.
          dt = datetime.datetime.fromtimestamp(int(match.group(1)) / 1000, datetime.timezone(datetime.timedelta(hours=3))).replace(tzinfo=None)
          values.append(dt)
        except Exception:
          continue
    return values

  def _dedupe_chat_ids(chat_ids):
    deduped = []
    seen = set()
    for chat_id in chat_ids:
      chat_id = str(chat_id or '').rsplit('-', 1)[0]
      if not re.fullmatch(r'[0-9a-f]{24}', chat_id):
        continue
      if chat_id in seen:
        continue
      seen.add(chat_id)
      deduped.append(chat_id)
    return deduped

  def _align_turn_keys_by_input(input_items, chat_ids, meta_map):
    ordered_chat_ids = _dedupe_chat_ids(chat_ids)
    if not ordered_chat_ids:
      return []
    effective_items = []
    previous_text = None
    for item in input_items:
      if not isinstance(item, dict):
        continue
      text = str(item.get('inputText') or '').strip()
      has_media = bool(_media_datetimes(item))
      if text and text == previous_text and not has_media:
        continue
      effective_items.append(item)
      previous_text = text
    if len(ordered_chat_ids) >= len(effective_items):
      return ordered_chat_ids[:len(effective_items)]
    aligned = [''] * len(effective_items)
    unused = list(ordered_chat_ids)

    # Screenshot/media timestamps are the only reliable bridge from input_history rows to log message IDs.
    for idx, item in enumerate(effective_items):
      media_times = _media_datetimes(item)
      if not media_times:
        continue
      best_chat_id = ''
      best_score = None
      for chat_id in ordered_chat_ids:
        if chat_id not in unused:
          continue
        meta_time = _time_text_to_datetime((meta_map.get(chat_id) or {}).get('time') or '')
        if not meta_time:
          continue
        score = min(abs((meta_time - media_time).total_seconds()) for media_time in media_times)
        if best_score is None or score < best_score:
          best_score = score
          best_chat_id = chat_id
      if best_chat_id and best_score is not None and best_score <= 15 * 60:
        aligned[idx] = best_chat_id
        unused.remove(best_chat_id)
    for idx, chat_id in enumerate(aligned):
      if chat_id or not unused:
        continue
      aligned[idx] = unused.pop(0)
    return aligned

  message_meta = {}
  def _is_complete(meta: dict) -> bool:
    return bool(meta.get('sessionId') and meta.get('chatMessageId') and meta.get('taskMessageId') and meta.get('traceId') and meta.get('time'))

  def _target_metas_complete() -> bool:
    if not target_chat_ids_set:
      return False
    for chat_id in target_chat_ids_set:
      meta = message_meta.get(chat_id)
      if not meta or not _is_complete(meta):
        return False
    return True

  def _fast_rg_backfill_meta_for_chat_ids(chat_ids):
    chat_ids = _dedupe_chat_ids(chat_ids)
    rg = rg_binary()
    if not chat_ids or not rg:
      return
    for chat_id in chat_ids:
      if _deadline_expired():
        return
      try:
        completed = subprocess.run(
          [rg, '--fixed-strings', '--no-heading', '--line-number', '-m', '80', chat_id, os.path.join(TRAE_APP_SUPPORT_DIR, 'logs')],
          stdout=subprocess.PIPE,
          stderr=subprocess.DEVNULL,
          text=True,
          timeout=TRAE_RG_CHAT_TIMEOUT_SECONDS,
          check=False,
        )
      except Exception:
        continue
      raw_lines = (completed.stdout or '').splitlines()
      raw_lines.sort(key=lambda value: (
        'create message' not in value,
        'trace_id="' not in value,
      ))
      for raw_line in raw_lines:
        line = raw_line.split(':', 2)[-1] if ':' in raw_line else raw_line
        if chat_id not in line:
          continue
        meta = _ensure_meta(message_meta, chat_id)
        is_create_message = 'create message' in line
        if is_create_message or not meta.get('time'):
          meta['time'] = _log_time_to_text(line) or meta.get('time', '')
        m_session = re.search(r'(?:chat_session_id|session_id)[:=]\s*([0-9a-f]{24})', line)
        if m_session:
          meta['sessionId'] = m_session.group(1)
        m_trace = re.search(r'trace_id=\"([0-9a-f]{32})\"', line)
        if m_trace:
          meta['traceId'] = m_trace.group(1)
        m_block = re.search(rf'block_id\":\"{re.escape(chat_id)}_([0-9a-f]{{24}})\"', line)
        if m_block:
          meta['taskMessageId'] = m_block.group(1)
        elif not meta.get('taskMessageId'):
          meta['taskMessageId'] = chat_id
        if is_create_message and (message_meta.get(chat_id) or {}).get('traceId'):
          break
      meta = message_meta.get(chat_id) or {}
      cloud_task_meta = _cloud_task_meta_for_trace(meta.get('traceId') or '', meta.get('sessionId') or '', chat_id)
      if cloud_task_meta.get('messageId'):
        meta['taskMessageId'] = cloud_task_meta['messageId']
        if cloud_task_meta.get('time'):
          meta['time'] = cloud_task_meta['time']
    if _target_metas_complete():
      return

  def _rg_session_create_message_ids(session_id):
    rg = rg_binary()
    if not session_id or not rg:
      return []
    try:
      completed = subprocess.run(
        [rg, '--no-heading', '--line-number', '-m', '200', rf'create message, chat_session_id:\s*{re.escape(session_id)}, message_id:', os.path.join(TRAE_APP_SUPPORT_DIR, 'logs')],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        timeout=TRAE_RG_SESSION_TIMEOUT_SECONDS,
        check=False,
      )
    except Exception:
      return []
    found = []
    for raw_line in (completed.stdout or '').splitlines():
      line = raw_line.split(':', 2)[-1] if ':' in raw_line else raw_line
      m_create = re.search(r'create message, chat_session_id:\s*([0-9a-f]{24}), message_id:\s*([0-9a-f]{24})', line)
      if not m_create or m_create.group(1) != session_id:
        continue
      chat_id = m_create.group(2)
      if chat_id in found:
        continue
      meta = _ensure_meta(message_meta, chat_id)
      meta['sessionId'] = session_id
      meta['time'] = _log_time_to_text(line) or meta.get('time', '')
      if not meta.get('taskMessageId'):
        meta['taskMessageId'] = chat_id
      m_trace = re.search(r'trace_id=\"([0-9a-f]{32})\"', line)
      if m_trace:
        meta['traceId'] = m_trace.group(1)
      cloud_task_meta = _cloud_task_meta_for_trace(meta.get('traceId') or '', session_id, chat_id)
      if cloud_task_meta.get('messageId'):
        meta['taskMessageId'] = cloud_task_meta['messageId']
        if cloud_task_meta.get('time'):
          meta['time'] = cloud_task_meta['time']
      found.append(chat_id)
    return found

  if include_trace and current_session_id:
    session_created_ids = _rg_session_create_message_ids(current_session_id)
    if session_created_ids:
      _fast_rg_backfill_meta_for_chat_ids(session_created_ids)
      if not target_chat_ids_set or len(target_chat_ids) < len(input_history):
        target_chat_ids = _dedupe_chat_ids(session_created_ids)
        target_chat_ids_set = set(target_chat_ids)
        turn_keys = target_chat_ids

  if include_trace and target_chat_ids_set:
    _fast_rg_backfill_meta_for_chat_ids(target_chat_ids)

  def _backfill_meta_for_chat_ids(chat_ids):
    chat_ids = _dedupe_chat_ids(chat_ids)
    if not chat_ids:
      return
    canonical_task_seen = set()

    def _needs_backfill():
      for chat_id in chat_ids:
        meta = message_meta.get(chat_id) or {}
        if not (meta.get('sessionId') and meta.get('chatMessageId') and meta.get('traceId') and meta.get('time')):
          return True
        if chat_id not in canonical_task_seen:
          return True
      return False

    def _apply_line(line: str, chat_id: str):
      if chat_id not in line:
        return
      meta = _ensure_meta(message_meta, chat_id)
      if not meta.get('time'):
        meta['time'] = _log_time_to_text(line)

      m_create = re.search(
        rf'create message, chat_session_id:\s*([0-9a-f]{{24}}), message_id:\s*{re.escape(chat_id)}',
        line,
      )
      if m_create:
        meta['sessionId'] = m_create.group(1)
        meta['time'] = _log_time_to_text(line) or meta.get('time', '')
        m_trace = re.search(r'trace_id=\"([0-9a-f]{32})\"', line)
        if m_trace:
          meta['traceId'] = m_trace.group(1)

      m_task = re.search(
        rf'user_message_id[:=]\s*{re.escape(chat_id)}.*?task_id[:=]\s*([0-9a-f]{{24}}).*?message_id[:=]\s*([0-9a-f]{{24}})',
        line,
      )
      if m_task:
        meta['taskMessageId'] = m_task.group(2)
        canonical_task_seen.add(chat_id)
        m_sess = re.search(r'session_id[:=]\s*([0-9a-f]{24})', line)
        if m_sess:
          meta['sessionId'] = m_sess.group(1)
        m_trace = re.search(r'trace_id=\"([0-9a-f]{32})\"', line)
        if m_trace:
          meta['traceId'] = m_trace.group(1)

      m_context_task = re.search(
        rf'task_id[:=]\s*([0-9a-f]{{24}}).*?message_id[:=]\s*([0-9a-f]{{24}}).*?message_id[:=]\s*{re.escape(chat_id)}',
        line,
      )
      if m_context_task:
        meta['taskMessageId'] = m_context_task.group(2)
        canonical_task_seen.add(chat_id)
        m_sess = re.search(r'session_id[:=]\s*([0-9a-f]{24})', line)
        if m_sess:
          meta['sessionId'] = m_sess.group(1)
        m_trace = re.search(r'trace_id=\"([0-9a-f]{32})\"', line)
        if m_trace:
          meta['traceId'] = m_trace.group(1)

    if not _needs_backfill():
      return
    _fast_rg_backfill_meta_for_chat_ids(chat_ids)
    if not _needs_backfill():
      return
    try:
      ai_agent_files, renderer_files = _recent_trae_log_files(limit=log_scan_limit)
      for paths, line_iter in (
        (ai_agent_files, recent_line_iter),
        (renderer_files, recent_line_iter),
      ):
        for path in paths:
          try:
            for line in line_iter(path):
              if _deadline_expired():
                return
              if not any(chat_id in line for chat_id in chat_ids):
                continue
              for chat_id in chat_ids:
                _apply_line(line, chat_id)
              if not _needs_backfill():
                return
          except Exception:
            continue
    except Exception:
      return

  if include_trace and target_chat_ids_set:
    try:
      ai_agent_files, renderer_files = _recent_trae_log_files(limit=log_scan_limit)

      def _all_found() -> bool:
        return _target_metas_complete()

      def _scan_log_files(paths, line_iter):
        for path in paths:
          try:
            for line in line_iter(path):
              if _deadline_expired():
                return
              for chat_msg in target_chat_ids:
                if _extract_meta_from_line(line, chat_msg=chat_msg, session_hint=current_session_id):
                  pass
              if _all_found():
                return
          except Exception:
            continue

      _scan_log_files(ai_agent_files, recent_line_iter)
      if not _all_found():
        _scan_log_files(renderer_files, recent_line_iter)
      if allow_full_scan and not _all_found():
        _scan_log_files(ai_agent_files, _iter_full_log_lines)
      if allow_full_scan and not _all_found():
        _scan_log_files(renderer_files, _iter_full_log_lines)
    except Exception:
      message_meta = {}

  should_scan_session_logs = (
    include_trace
    and current_session_id
    and (
      not target_chat_ids_set
      or len(target_chat_ids) < len(input_history)
      or not _target_metas_complete()
    )
  )
  if should_scan_session_logs:
    try:
      session_message_ids = []
      session_seen = set()
      ai_agent_files, renderer_files = _recent_trae_log_files(limit=log_scan_limit)

      def _scan_session_logs(paths, line_iter):
        def _session_message_candidates(line: str):
          candidates = []
          seen_candidates = set()

          def _add(candidate: str):
            if not re.fullmatch(r'[0-9a-f]{24}', candidate):
              return
            if candidate == current_session_id or candidate in seen_candidates:
              return
            seen_candidates.add(candidate)
            candidates.append(candidate)

          m_pair = re.search(r'create message, chat_session_id:\s*([0-9a-f]{24}), message_id:\s*([0-9a-f]{24})', line)
          if m_pair:
            _add(m_pair.group(2))

          m_create_version = re.search(r'create_new_version(?:_v2)?(?: chat_session_id:)?\s*([0-9a-f]{24})?.*?message_id[:=]\s*([0-9a-f]{24})', line)
          if m_create_version and 'task_id' not in line:
            _add(m_create_version.group(2))

          m_finish = re.search(r'chat_turn_finish completed: session_id=([0-9a-f]{24}), message_id=([0-9a-f]{24})', line)
          if m_finish:
            _add(m_finish.group(2))

          m_snapshot = re.search(r'create snapshot, chat_session_id: ([0-9a-f]{24}), message_id: ([0-9a-f]{24})', line)
          if m_snapshot:
            _add(m_snapshot.group(2))

          m_plan_user = re.search(r'plan tool call finish .*?user_message_id[:=]\s*([0-9a-f]{24})', line)
          if m_plan_user:
            _add(m_plan_user.group(1))

          m_renderer = re.search(r'\"session_id\":\"([0-9a-f]{24})\".*\"message_id\":\"([0-9a-f]{24})\"', line)
          if m_renderer:
            _add(m_renderer.group(2))

          if 'task_id' not in line:
            m_message = re.search(r'(?:message_id|user_message_id)[:=]\s*([0-9a-f]{24})', line)
            if m_message:
              _add(m_message.group(1))

          for response_message_id in re.findall(r'response_message_ids?(?:[:=]|\")\s*[\[\"]*([0-9a-f]{24})', line):
            _add(response_message_id)

          return candidates

        for path in paths:
          try:
            for line in line_iter(path):
              if _deadline_expired():
                return
              if current_session_id not in line:
                continue
              meta_before = len(session_message_ids)
              for candidate in _session_message_candidates(line):
                meta = _extract_meta_from_line(line, chat_msg=candidate, session_hint=current_session_id)
                if meta and candidate not in session_seen:
                  session_seen.add(candidate)
                  session_message_ids.append(candidate)
              if len(session_message_ids) != meta_before:
                session_message_ids[:] = list(dict.fromkeys(session_message_ids))
          except Exception:
            continue

      _scan_session_logs(ai_agent_files, recent_line_iter)
      _scan_session_logs(renderer_files, recent_line_iter)
      expected_count = len(target_chat_ids_set) if target_chat_ids_set else len(input_history)
      incomplete_chat_ids = list(target_chat_ids_set) if target_chat_ids_set else session_message_ids
      if len(_dedupe_chat_ids(session_message_ids)) < expected_count or _meta_map_has_incomplete(message_meta, incomplete_chat_ids):
        if allow_full_scan:
          _scan_session_logs(ai_agent_files, _iter_full_log_lines)
          _scan_session_logs(renderer_files, _iter_full_log_lines)

      if session_message_ids:
        session_message_ids.sort(key=lambda chat_id: (
          _time_text_to_datetime((message_meta.get(chat_id) or {}).get('time') or '') is None,
          _time_text_to_datetime((message_meta.get(chat_id) or {}).get('time') or '') or datetime.datetime.max,
        ))
        if target_chat_ids_set:
          merged_chat_ids = _dedupe_chat_ids(session_message_ids + target_chat_ids)
          target_chat_ids = merged_chat_ids
          target_chat_ids_set = set(merged_chat_ids)
          turn_keys = merged_chat_ids
        else:
          target_chat_ids = session_message_ids
          turn_keys = session_message_ids
    except Exception:
      pass

  if include_trace and target_chat_ids:
    _backfill_meta_for_chat_ids(target_chat_ids)

  if include_trace and current_session_id:
    session_created_ids = _rg_session_create_message_ids(current_session_id)
    _fast_rg_backfill_meta_for_chat_ids(session_created_ids)
    if session_created_ids:
      session_created_ids = _dedupe_chat_ids(session_created_ids)
      if len(session_created_ids) >= len(effective_input_items if 'effective_input_items' in locals() else input_history):
        target_chat_ids = session_created_ids
        turn_keys = target_chat_ids

  aligned_chat_ids = _dedupe_chat_ids(turn_keys or target_chat_ids)
  aligned_chat_ids.sort(key=lambda chat_id: (
    _time_text_to_datetime((message_meta.get(chat_id) or {}).get('time') or '') is None,
    _time_text_to_datetime((message_meta.get(chat_id) or {}).get('time') or '') or datetime.datetime.max,
  ))
  has_known_chat_turns = bool(aligned_chat_ids)
  effective_input_items = []
  previous_text = None
  for item in input_history:
    if not isinstance(item, dict):
      continue
    text = str(item.get('inputText') or '').strip()
    has_media = bool(_media_datetimes(item))
    if text and text == previous_text and not has_media:
      continue
    effective_input_items.append(item)
    previous_text = text
  if aligned_chat_ids and len(aligned_chat_ids) == len(effective_input_items):
    turn_keys = aligned_chat_ids
  else:
    turn_keys = _align_turn_keys_by_input(effective_input_items, aligned_chat_ids, message_meta)
  if include_trace:
    final_chat_ids = _dedupe_chat_ids([
      (turn_key.rsplit('-', 1)[0] if '-' in str(turn_key) else str(turn_key))
      for turn_key in turn_keys
    ])
    _fast_rg_backfill_meta_for_chat_ids(final_chat_ids)

  rows = []
  used_composites = set()
  row_items = [
    (turn_keys[idx] if idx < len(turn_keys) else '', item)
    for idx, item in enumerate(effective_input_items)
  ]
  for idx, (turn_key, item) in enumerate(row_items, start=1):
    if not isinstance(item, dict):
      continue
    input_text = str(item.get('inputText') or '').strip()
    parsed = item.get('parsedQuery') if isinstance(item.get('parsedQuery'), list) else []
    media = item.get('multiMedia') if isinstance(item.get('multiMedia'), list) else []
    chat_message_id = turn_key.rsplit('-', 1)[0] if '-' in turn_key else turn_key
    if include_trace and has_known_chat_turns and not chat_message_id:
      continue
    meta = message_meta.get(chat_message_id, {})
    trace = turn_key or f'round={idx}; parsed={len(parsed)}; media={len(media)}'
    composite = ''
    if include_trace:
      trace_id = meta.get('traceId') or ''
      fallback_session_id = meta.get('sessionId') or current_session_id or 'missing_session'
      fallback_chat_message_id = chat_message_id or 'missing_chat'
      task_message_id = meta.get('taskMessageId') or fallback_chat_message_id
      time_text = (
        meta.get('time')
        or _object_id_time_text(fallback_chat_message_id)
        or _object_id_time_text(task_message_id)
      )
      if not time_text:
        continue
      trace_user = user_id or 'missing_user'
      if trace_id and re.fullmatch(r'[0-9a-f]{32}', trace_id):
        composite = f".{trace_user}:{trace_id}_{fallback_session_id}.{task_message_id}.{fallback_chat_message_id}:{app_name}.T({time_text})"
      else:
        continue
      if composite in used_composites:
        continue
      used_composites.add(composite)
    raw_session_id_value = meta.get('sessionId') or current_session_id or '-'
    log_trace_value = composite or meta.get('traceId') or ''
    session_id_value = log_trace_value if include_trace and log_trace_value else raw_session_id_value
    rows.append({
      'sessionId': session_id_value,
      'rawSessionId': raw_session_id_value,
      'conversation': input_text,
      'logTraceId': log_trace_value if include_trace else '',
      'sessionComposite': log_trace_value if include_trace else '',
      'logTrace': '' if include_trace else (trace or ''),
      'screenshots': _normalize_trae_media_items(item, db_path),
    })

  return {
    'order': order_token,
    'db_path': db_path,
    'sessionId': current_session_id,
    'rows': rows,
    '_traceTimedOut': trace_timed_out,
  }


class Handler(SimpleHTTPRequestHandler):
  def _docs_data_path(self, request_path: str):
    if request_path == '/data':
      return DATA_DIR if os.path.isdir(DATA_DIR) else DOCS_DATA_DIR
    relative = str(request_path[len('/data'):]).lstrip('/')
    normalized = os.path.normpath(relative)
    if normalized in ('', '.'):
      return DATA_DIR if os.path.isdir(DATA_DIR) else DOCS_DATA_DIR
    parts = [part for part in normalized.split(os.sep) if part not in ('', '.', '..')]
    local_path = os.path.join(DATA_DIR, *parts)
    if os.path.exists(local_path):
      return local_path
    return os.path.join(DOCS_DATA_DIR, *parts)

  def _send_static_file(self, path: str):
    if not os.path.isfile(path):
      self.send_error(404, 'File not found')
      return
    try:
      with open(path, 'rb') as file:
        body = file.read()
    except OSError:
      self.send_error(404, 'File not found')
      return
    self.send_response(200)
    self.send_header('Content-Type', self.guess_type(path))
    self.send_header('Content-Length', str(len(body)))
    self.end_headers()
    self.wfile.write(body)

  def _json(self, status: int, payload: dict):
    body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    self.send_response(status)
    self.send_header('Content-Type', 'application/json; charset=utf-8')
    self.send_header('Content-Length', str(len(body)))
    self.end_headers()
    self.wfile.write(body)

  def _read_json_body(self):
    length = int(self.headers.get('Content-Length', '0') or '0')
    if length <= 0:
      return {}
    return json.loads(self.rfile.read(length).decode('utf-8') or '{}')

  def do_GET(self):
    parsed = urlparse(self.path)
    if parsed.path == '/data' or parsed.path.startswith('/data/'):
      self._send_static_file(self._docs_data_path(parsed.path))
      return

    if parsed.path == '/api/select-folder':
      query = parse_qs(parsed.query)
      start = (query.get('start') or [''])[0]
      try:
        path = pick_folder(start)
      except Exception as err:
        msg = str(err) or 'failed to pick folder'
        if msg == 'user canceled':
          self._json(499, {'ok': False, 'error': 'user canceled'})
        else:
          self._json(500, {'ok': False, 'error': msg})
        return
      self._json(200, {'ok': True, 'path': path})
      return

    if parsed.path == '/api/health':
      self._json(200, {'ok': True})
      return

    if parsed.path == '/api/workbench-config':
      self._json(200, {'ok': True, **workbench_defaults()})
      return

    if parsed.path == '/api/prompt-state':
      state = read_json(STATE_FILE, {'completed': {}, 'orders': {}})
      state.setdefault('completed', {})
      state.setdefault('orders', {})
      state.setdefault('trae_groups', {})
      self._json(200, {'ok': True, 'state': state})
      return

    if parsed.path == '/api/trae-groups':
      self._json(200, {'ok': True, 'groups': load_trae_groups()})
      return

    if parsed.path == '/api/trae-session-image':
      query = parse_qs(parsed.query)
      raw_path = (query.get('path') or [''])[0]
      image_path = os.path.abspath(raw_path)
      workspace_root = os.path.abspath(TRAE_WORKSPACE_STORAGE_DIR)
      if (
        not image_path.startswith(workspace_root + os.sep)
        or f'{os.sep}images{os.sep}' not in image_path
        or not os.path.isfile(image_path)
      ):
        self.send_error(404, 'Image not found')
        return
      self._send_static_file(image_path)
      return

    if parsed.path == '/api/trae-session-rounds':
      query = parse_qs(parsed.query)
      order = (query.get('order') or [''])[0]
      try:
        payload = read_trae_session_cache(order)
        self._json(200, {'ok': True, **payload})
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    return super().do_GET()

  def do_POST(self):
    parsed = urlparse(self.path)
    if parsed.path == '/api/prompt-state':
      try:
        payload = self._read_json_body()
        prompt_id = str(payload.get('prompt_id') or '').strip()
        completed = bool(payload.get('completed'))
        if not prompt_id:
          self._json(400, {'ok': False, 'error': 'prompt_id is required'})
          return
        state = read_json(STATE_FILE, {'completed': {}, 'orders': {}})
        state.setdefault('completed', {})
        state.setdefault('orders', {})
        if completed:
          state['completed'][prompt_id] = {'completed': True}
        else:
          state['completed'].pop(prompt_id, None)
        write_json(STATE_FILE, state)
        self._json(200, {'ok': True, 'state': state})
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/refresh-trae-session-rounds':
      try:
        payload = self._read_json_body()
        order = str(payload.get('order') or '').strip()
        result = queued_refresh_trae_session_cache(
          order,
          force=bool(payload.get('force')),
          discover=bool(payload.get('discover')),
        )
        self._json(200, result)
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/repair-trae-log-traces':
      try:
        payload = self._read_json_body()
        result = repair_trae_log_traces(
          payload.get('orders'),
          refresh_missing=bool(payload.get('refreshMissing')),
          limit=int(payload.get('limit') or 0),
        )
        self._json(200, result)
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/annotate-dissatisfaction':
      try:
        payload = self._read_json_body()
        result = annotate_dissatisfaction_for_orders(
          payload.get('orders'),
          model_id=payload.get('model_id') or payload.get('modelId') or '',
          force=payload.get('force') is not False,
        )
        self._json(200, result)
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/batch-trae-projects':
      try:
        payload = self._read_json_body()
        result = batch_trae_projects(payload.get('action'), payload.get('orders'), options=payload)
        self._json(200, result)
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/trae-groups':
      try:
        payload = self._read_json_body()
        action = str(payload.get('action') or 'save').strip().lower()
        if action == 'delete':
          result = delete_trae_group(payload.get('name'))
        else:
          result = save_trae_group(payload.get('name'), payload.get('orders'))
        self._json(200, result)
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/prompt-order':
      try:
        payload = self._read_json_body()
        prompt_id = str(payload.get('prompt_id') or '').strip()
        if not prompt_id:
          self._json(400, {'ok': False, 'error': 'prompt_id is required'})
          return
        prompts = load_prompts()
        prompt = next((item for item in prompts if item.get('id') == prompt_id), None)
        if not prompt:
          self._json(404, {'ok': False, 'error': 'prompt not found'})
          return
        raw_order = payload.get('order_token', payload.get('order'))
        order_token = normalize_order_token(prompt, raw_order)
        order_number = extract_order_number(order_token)
        if not order_number or order_number <= 0:
          self._json(400, {'ok': False, 'error': 'order must be a positive number or token'})
          return
        state = read_json(STATE_FILE, {'completed': {}, 'orders': {}})
        state.setdefault('completed', {})
        state.setdefault('orders', {})
        used = build_used_orders(state, current_prompt_id=prompt_id)
        if str(order_token) in used:
          self._json(409, {'ok': False, 'error': f'序号 {order_token} 已被占用'})
          return
        default_order = default_order_token(prompt)
        old_order = normalize_order_token(prompt, state.get('orders', {}).get(prompt_id, default_order))
        scene = prompt.get('business_domain')
        scene_dir = os.path.join(TRAE_ROOT, scene_segment(scene))
        old_folder = os.path.join(scene_dir, str(old_order)) if old_order else ''
        new_folder = os.path.join(scene_dir, str(order_token))

        if str(old_order) != str(order_token) and old_folder and os.path.isdir(old_folder) and not os.path.exists(new_folder):
          os.rename(old_folder, new_folder)
        else:
          os.makedirs(new_folder, exist_ok=True)

        if str(order_token) == str(default_order):
          state['orders'].pop(prompt_id, None)
        else:
          state['orders'][prompt_id] = order_token
        write_json(STATE_FILE, state)
        self._json(200, {'ok': True, 'state': state, 'folder': new_folder, 'old_order': old_order, 'order': order_number, 'order_token': order_token})
      except ValueError:
        self._json(400, {'ok': False, 'error': 'order must be a number'})
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/sync-folders':
      try:
        count = ensure_all_prompt_folders()
        self._json(200, {'ok': True, 'count': count, 'root': TRAE_ROOT})
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/sync-github-all':
      try:
        payload = self._read_json_body()
        repo_url = resolve_text_setting(payload, 'repo_url', DEFAULT_GITHUB_REPO_URL, 'GitHub 地址')
        result = sync_all_completed_to_github(repo_url)
        self._json(200, result)
      except Exception as err:
        traceback.print_exc()
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/claim-feishu-tasks':
      try:
        payload = self._read_json_body()
        count = int(payload.get('count') or 0)
        task_url = resolve_text_setting(payload, 'task_url', DEFAULT_FEISHU_TASK_URL, '飞书地址')
        result = claim_feishu_tasks(count, task_url)
        self._json(200, result)
      except ValueError:
        self._json(400, {'ok': False, 'error': 'count must be a positive integer'})
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/paste-feishu-screenshots':
      locked = FEISHU_PASTE_LOCK.acquire(blocking=False)
      if not locked:
        self._json(409, {'ok': False, 'error': '已有飞书粘贴任务正在执行，请等待完成'})
        return
      try:
        payload = self._read_json_body()
        task_url = str(payload.get('task_url') or '').strip()
        result = paste_feishu_screenshots(
          payload.get('rows'),
          task_url,
          delay_ms=int(payload.get('delay_ms') or 850),
        )
        self._json(200, result)
      except ValueError:
        self._json(400, {'ok': False, 'error': 'delay_ms must be an integer'})
      except Exception as err:
        print(f'[feishu-paste] error: {err}', flush=True)
        self._json(500, {'ok': False, 'error': str(err)})
      finally:
        FEISHU_PASTE_LOCK.release()
      return

    if parsed.path == '/api/paste-feishu-batch-sessions':
      locked = FEISHU_PASTE_LOCK.acquire(blocking=False)
      if not locked:
        self._json(409, {'ok': False, 'error': '已有飞书粘贴任务正在执行，请等待完成'})
        return
      try:
        payload = self._read_json_body()
        result = paste_feishu_batch_sessions(
          payload.get('rows'),
          delay_ms=int(payload.get('delay_ms') or 1200),
        )
        self._json(200, result)
      except ValueError:
        self._json(400, {'ok': False, 'error': 'delay_ms must be an integer'})
      except Exception as err:
        print(f'[feishu-batch-paste] error: {err}', flush=True)
        self._json(500, {'ok': False, 'error': str(err)})
      finally:
        FEISHU_PASTE_LOCK.release()
      return

    if parsed.path == '/api/project-map-image':
      try:
        payload = self._read_json_body()
        scene = str(payload.get('scene') or '').strip()
        order = str(payload.get('order') or '').strip()
        data_url = str(payload.get('data_url') or '').strip()
        filename = str(payload.get('filename') or '').strip()
        if not scene or not order or not data_url:
          self._json(400, {'ok': False, 'error': 'scene, order and data_url are required'})
          return
        match = re.fullmatch(r'data:([^;,]+(?:;[^,]+)?);base64,(.+)', data_url, re.DOTALL)
        if not match:
          self._json(400, {'ok': False, 'error': 'image data must be a base64 data URL'})
          return
        mime_type = match.group(1).split(';', 1)[0]
        if not mime_type.startswith('image/'):
          self._json(400, {'ok': False, 'error': 'only image data is allowed'})
          return
        image_bytes = base64.b64decode(match.group(2), validate=True)
        if len(image_bytes) > 30 * 1024 * 1024:
          self._json(413, {'ok': False, 'error': 'image is too large'})
          return
        project_dir = os.path.join(TRAE_ROOT, scene_segment(scene), order)
        os.makedirs(project_dir, exist_ok=True)
        maps_dir = os.path.join(project_dir, 'maps')
        os.makedirs(maps_dir, exist_ok=True)
        safe_name = safe_image_filename(filename, mime_type)
        target_path = os.path.join(maps_dir, safe_name)
        if os.path.exists(target_path):
          stem, ext = os.path.splitext(safe_name)
          target_path = os.path.join(maps_dir, f'{stem}_{int(time.time())}{ext or image_extension_from_mime(mime_type)}')
        with open(target_path, 'wb') as file:
          file.write(image_bytes)
        self._json(200, {'ok': True, 'path': target_path, 'folder': maps_dir, 'filename': os.path.basename(target_path)})
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/open-project-folder':
      try:
        payload = self._read_json_body()
        scene = str(payload.get('scene') or '').strip()
        order = str(payload.get('order') or '').strip()
        if not scene or not order:
          self._json(400, {'ok': False, 'error': 'scene and order are required'})
          return
        self._json(200, open_trae_project(order))
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/open-project-maps-folder':
      try:
        payload = self._read_json_body()
        scene = str(payload.get('scene') or '').strip()
        order = str(payload.get('order') or '').strip()
        if not scene or not order:
          self._json(400, {'ok': False, 'error': 'scene and order are required'})
          return
        maps_path = os.path.join(TRAE_ROOT, scene_segment(scene), order, 'maps')
        os.makedirs(maps_path, exist_ok=True)
        open_path_with_default_app(maps_path)
        self._json(200, {'ok': True, 'folder': maps_path})
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/trae-window-action':
      try:
        payload = self._read_json_body()
        order = str(payload.get('order') or '').strip()
        action = str(payload.get('action') or 'focus').strip()
        self._json(200, trae_window_action(order, action))
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    if parsed.path == '/api/trae-copy-log-trace':
      try:
        payload = self._read_json_body()
        order = str(payload.get('order') or '').strip()
        mode = str(payload.get('mode') or 'click').strip()
        scan = str(payload.get('scan') or ('scroll' if mode == 'collect' else 'visible')).strip()
        max_pages = int(payload.get('maxPages') or payload.get('max_pages') or 12)
        pick = int(payload.get('pick', -1))
        self._json(200, trae_copy_log_trace(order, mode, scan=scan, max_pages=max_pages, pick=pick))
      except Exception as err:
        self._json(500, {'ok': False, 'error': str(err)})
      return

    self._json(404, {'ok': False, 'error': 'not found'})


def main():
  port = 8090
  if len(sys.argv) > 1:
    port = int(sys.argv[1])
  host = '127.0.0.1'
  if len(sys.argv) > 2:
    host = str(sys.argv[2] or host)

  os.chdir(ROOT_DIR)
  ensure_local_data_files()
  migrate_legacy_scene_dirs()
  ensure_all_prompt_folders()
  server = ThreadingHTTPServer((host, port), Handler)
  print(f'Workbench API+UI server started at http://{host}:{port}/index.html')
  try:
    server.serve_forever()
  except KeyboardInterrupt:
    pass
  finally:
    server.server_close()


if __name__ == '__main__':
  main()
