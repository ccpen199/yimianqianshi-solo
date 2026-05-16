const rowsEl = document.getElementById('projectRows');
const detailPanel = document.getElementById('detailPanel');
const promptBackground = document.getElementById('promptBackground');
const promptFeatures = document.getElementById('promptFeatures');
const promptDelivery = document.getElementById('promptDelivery');
const statsBar = document.getElementById('statsBar');
const domainFilter = document.getElementById('domainFilter');
const userFilter = document.getElementById('userFilter');
const platformFilter = document.getElementById('platformFilter');
const scenarioFilter = document.getElementById('scenarioFilter');
const searchInput = document.getElementById('searchInput');
const sceneButtons = document.getElementById('sceneButtons');
const promptPreviewToggleButton = document.getElementById('togglePromptPreview');
const syncGithubAllButton = document.getElementById('syncGithubAll');
const githubRepoUrlInput = document.getElementById('githubRepoUrl');
const syncGithubStatus = document.getElementById('syncGithubStatus');
const feishuTaskUrlInput = document.getElementById('feishuTaskUrl');
const feishuClaimCountInput = document.getElementById('feishuClaimCount');
const claimFeishuTasksButton = document.getElementById('claimFeishuTasks');
const claimFeishuStatus = document.getElementById('claimFeishuStatus');
const sessionModal = document.getElementById('sessionModal');
const sessionMeta = document.getElementById('sessionMeta');
const sessionPrevButton = document.getElementById('sessionPrev');
const sessionNextButton = document.getElementById('sessionNext');
const sessionRows = document.getElementById('sessionRows');
const copySessionIdColumnButton = document.getElementById('copySessionIdColumn');
const copyDissatisfactionColumnButton = document.getElementById('copyDissatisfactionColumn');
const copyConversationColumnButton = document.getElementById('copyConversationColumn');
const copyLogTraceColumnButton = document.getElementById('copyLogTraceColumn');
const batchTraeInput = document.getElementById('batchTraeInput');
const batchOpenTraeButton = document.getElementById('batchOpenTrae');
const batchCloseTraeButton = document.getElementById('batchCloseTrae');
const batchTraeStatus = document.getElementById('batchTraeStatus');
const openBatchSessionsButton = document.getElementById('openBatchSessions');
const batchProjectList = document.getElementById('batchProjectList');
const batchGroupSelect = document.getElementById('batchGroupSelect');
const batchGroupListEl = document.getElementById('batchGroupList');
const batchGroupNameInput = document.getElementById('batchGroupName');
const addToBatchGroupButton = document.getElementById('addToBatchGroup');
const saveBatchGroupButton = document.getElementById('saveBatchGroup');
const deleteBatchGroupButton = document.getElementById('deleteBatchGroup');
const batchSessionModal = document.getElementById('batchSessionModal');
const batchSessionMeta = document.getElementById('batchSessionMeta');
const batchSessionRows = document.getElementById('batchSessionRows');
const copyBatchOrderColumnButton = document.getElementById('copyBatchOrderColumn');
const copyBatchSessionIdColumnButton = document.getElementById('copyBatchSessionIdColumn');
const copyBatchDissatisfactionColumnButton = document.getElementById('copyBatchDissatisfactionColumn');
const copyBatchConversationColumnButton = document.getElementById('copyBatchConversationColumn');
const copyBatchTraceOrderColumnButton = document.getElementById('copyBatchTraceOrderColumn');
const copyBatchScreenshotColumnButton = document.getElementById('copyBatchScreenshotColumn');
const copyBatchLogTraceColumnButton = document.getElementById('copyBatchLogTraceColumn');
const batchSessionMinRowsInput = document.getElementById('batchSessionMinRows');
const refreshBatchMissingSessionsButton = document.getElementById('refreshBatchMissingSessions');
const autoBatchMissingSessionsButton = document.getElementById('toggleAutoBatchMissingSessions');
const autoBatchMinRowsInput = document.getElementById('autoBatchMinRows');
const watchCurrentBatchGroupButton = document.getElementById('watchCurrentBatchGroup');
const autoBatchWatchedGroupsEl = document.getElementById('autoBatchWatchedGroups');
const llmAgentModelListEl = document.getElementById('llmAgentModelList');
const llmAgentStatusEl = document.getElementById('llmAgentStatus');
const runLlmDissatisfactionAnnotationButton = document.getElementById('runLlmDissatisfactionAnnotation');
const copyNextBatchScreenshotButton = document.getElementById('copyNextBatchScreenshot');
const pasteBatchScreenshotsToFeishuButton = document.getElementById('pasteBatchScreenshotsToFeishu');
const pasteBatchAllToFeishuButton = document.getElementById('pasteBatchAllToFeishu');
const batchSessionRefreshStatus = document.getElementById('batchSessionRefreshStatus');
const showBatchGroupTabButton = document.getElementById('showBatchGroupTab');
const showRoundAutomationTabButton = document.getElementById('showRoundAutomationTab');
const batchGroupTabPanel = document.getElementById('batchGroupTabPanel');
const roundAutomationTabPanel = document.getElementById('roundAutomationTabPanel');
const roundAutomationGroupNameInput = document.getElementById('roundAutomationGroupName');
const roundAutomationTargetRoundsInput = document.getElementById('roundAutomationTargetRounds');
const roundAutomationGroupListEl = document.getElementById('roundAutomationGroupList');
const startRoundAutomationButton = document.getElementById('startRoundAutomation');
const stopRoundAutomationButton = document.getElementById('stopRoundAutomation');
const runRoundAutomationProbeButton = document.getElementById('runRoundAutomationProbe');
const runRoundAutomationRoundDetectButton = document.getElementById('runRoundAutomationRoundDetect');
const runRoundAutomationRuntimeButton = document.getElementById('runRoundAutomationRuntime');
const runRoundAutomationBrowserButton = document.getElementById('runRoundAutomationBrowser');
const runRoundAutomationDraftsButton = document.getElementById('runRoundAutomationDrafts');
const runRoundAutomationQueueButton = document.getElementById('runRoundAutomationQueue');
const runRoundPromptQueueButton = document.getElementById('runRoundPromptQueue');
const restoreRoundAutomationWindowButton = document.getElementById('restoreRoundAutomationWindow');
const probeRoundAutomationWindowButton = document.getElementById('probeRoundAutomationWindow');
const prepareRoundAutomationSubmitButton = document.getElementById('prepareRoundAutomationSubmit');
const fastRoundAutomationSubmitButton = document.getElementById('fastRoundAutomationSubmit');
const roundAutomationStatusEl = document.getElementById('roundAutomationStatus');
const roundAutomationSummaryEl = document.getElementById('roundAutomationSummary');
const roundAutomationDraftPreviewEl = document.getElementById('roundAutomationDraftPreview');

let candidates = [];
let prompts = [];
let atoms = [];
let promptState = { completed: {} };
let filteredPrompts = [];
let selectedPromptId = '';
let selectedParts = { background: '', features: '', delivery: '' };
let selectedBatchOrders = new Set();
let batchGroups = {};
let activeBatchGroup = '';
let currentSessionRows = [];
let sessionOrderList = [];
let activeSessionOrder = '';
let currentBatchSessionRows = [];
let currentBatchSessionOrders = [];
let currentBatchSessionGroupName = '';
let sessionLoadRequestId = 0;
const MIN_VISIBLE_ORDER_NUMBER = 979;
const DEFAULT_TARGET_ROUNDS = 5;
const TARGET_ROUNDS_STORAGE_KEY = 'batchTargetRounds';
const DEFAULT_GITHUB_REPO_URL = 'git@github.com:ccpen199/Trae-solo.git';
const refreshingSessionOrders = new Set();
const sessionRefreshPollTimers = new Map();
const sessionFetchTimeoutMs = 30000;
const sessionRefreshTimeoutMs = 42000;
let activeSessionFetchController = null;
let batchScreenshotCopyQueue = [];
let batchScreenshotCopyIndex = 0;
let promptPreviewVisible = localStorage.getItem('promptPreviewVisible') !== 'false';
let batchMissingRefreshInProgress = false;
let batchMissingRefreshRunId = 0;
let batchMissingRefreshActiveGroup = '';
let batchPasteInProgress = false;
let autoBatchMissingEnabled = localStorage.getItem('autoBatchMissingSessions') === 'true';
let autoBatchMissingTimer = null;
let autoBatchWatchedGroups = new Set(loadStoredStringList('autoBatchWatchedGroups'));
let roundAutomationSelectedGroups = new Set(loadStoredStringList('roundAutomationSelectedGroups'));
let roundAutomationJobId = localStorage.getItem('roundAutomationJobId') || '';
let roundAutomationPollTimer = null;
let llmAnnotationModels = [];
let selectedLlmAnnotationModelId = localStorage.getItem('llmAnnotationModelId') || '';
const scenePrefix = {
  shopping: 'g',
  social: 's',
  entertainment: 'yl',
  travel: 'l',
  game: 'yx',
  health: 'jk',
  home: 'jj',
  news_weather: 'xw',
  art_design: 'ys',
  fun_leisure: 'qx',
  local_projects: 'may',
};

const domainAliases = {
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
};

const domainDisplayNames = {
  shopping: '购物',
  social: '社交',
  entertainment: '娱乐',
  travel: '旅游',
  game: '游戏',
  health: '健康',
  home: '家居',
  news_weather: '新闻与天气',
  art_design: '艺术与设计',
  fun_leisure: '趣味休闲',
  local_projects: '本机项目',
};

function loadStoredStringList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveStoredStringList(key, values) {
  localStorage.setItem(key, JSON.stringify(Array.from(values || []).map((item) => String(item || '').trim()).filter(Boolean)));
}

function normalizeDomainName(domain) {
  return domainAliases[domain] || domain || '';
}

function displayDomainName(domain) {
  const normalized = normalizeDomainName(domain);
  return domainDisplayNames[normalized] || domain || '';
}

function cell(text, className = '') {
  const td = document.createElement('td');
  td.textContent = text ?? '';
  if (className) td.className = className;
  return td;
}

function shortList(items, limit = 3) {
  if (!Array.isArray(items)) return '';
  const head = items.slice(0, limit).join(' / ');
  return items.length > limit ? `${head} / +${items.length - limit}` : head;
}

async function runWithConcurrency(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const size = Math.max(1, Math.min(Number.parseInt(String(limit || 1), 10) || 1, list.length || 1));
  const results = new Array(list.length);
  let nextIndex = 0;
  const runners = Array.from({ length: size }, async () => {
    while (nextIndex < list.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(list[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function isCompleted(promptId) {
  return Boolean(promptState.completed?.[promptId]);
}

function orderPrefix(prompt) {
  return 'may';
}

function orderToken(prompt, value) {
  const prefix = orderPrefix(prompt);
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return `${prefix}-${value}`;
  }
  const text = String(value ?? '').trim();
  if (!text) return `${prefix}-${prompt.global_order}`;
  if (/^\d+$/.test(text)) return `${prefix}-${Number.parseInt(text, 10)}`;
  const match = text.match(/^([a-zA-Z]+)-(\d+)$/);
  if (match) return `may-${Number.parseInt(match[2], 10)}`;
  return text;
}

function orderNumber(value) {
  const text = String(value ?? '').trim();
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  const match = text.match(/-(\d+)$/);
  if (match) return Number.parseInt(match[1], 10);
  return Number.NaN;
}

function orderPrefixRank(value) {
  const prefix = String(value ?? '').trim().split('-')[0].toLowerCase();
  if (prefix === 'may') return 0;
  return 1;
}

function getOrder(prompt) {
  const raw = promptState.orders?.[prompt.id];
  return orderToken(prompt, raw || prompt.order_folder || prompt.orderFolder || `${orderPrefix(prompt)}-${prompt.global_order}`);
}

function isVisiblePrompt(prompt) {
  const number = orderNumber(getOrder(prompt));
  return !Number.isInteger(number) || number >= MIN_VISIBLE_ORDER_NUMBER;
}

function visiblePromptList() {
  return prompts.filter(isVisiblePrompt);
}

function comparePromptOrder(a, b) {
  const orderA = getOrder(a);
  const orderB = getOrder(b);
  const numberA = orderNumber(orderA);
  const numberB = orderNumber(orderB);
  const prefixRankA = orderPrefixRank(orderA);
  const prefixRankB = orderPrefixRank(orderB);
  if (prefixRankA !== prefixRankB) return prefixRankA - prefixRankB;
  if (prefixRankA === 0 && Number.isInteger(numberA) && Number.isInteger(numberB) && numberA !== numberB) {
    return numberA - numberB;
  }
  const rank = (value) => {
    if (!Number.isInteger(value)) return 2;
    if (value > 555555) return 3;
    if (value < 1000) return 2;
    return 1;
  };
  const rankA = rank(numberA);
  const rankB = rank(numberB);
  if (rankA !== rankB) return rankA - rankB;
  if (Number.isInteger(numberA) && Number.isInteger(numberB) && numberA !== numberB) {
    return numberA - numberB;
  }
  return String(orderA).localeCompare(String(orderB), undefined, { numeric: true });
}

function parseBatchOrders() {
  return String(batchTraeInput?.value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBatchOrders(items) {
  const orders = [];
  const seen = new Set();
  for (const item of items || []) {
    let text = String(item || '').trim();
    if (!text) continue;
    if (/^\d+$/.test(text)) text = `may-${Number.parseInt(text, 10)}`;
    const match = text.match(/^([a-zA-Z]+)-(\d+)$/);
    if (match) text = `may-${Number.parseInt(match[2], 10)}`;
    if (!seen.has(text)) {
      seen.add(text);
      orders.push(text);
    }
  }
  return orders;
}

function setBatchStatus(text, isError = false) {
  if (!batchTraeStatus) return;
  batchTraeStatus.textContent = text || '';
  batchTraeStatus.classList.toggle('error', Boolean(isError));
}

function setAutoBatchStatus(text, isError = false) {
  if (!autoBatchWatchedGroupsEl) return;
  autoBatchWatchedGroupsEl.textContent = text || '';
  autoBatchWatchedGroupsEl.classList.toggle('error', Boolean(isError));
}

function currentBatchGroupName() {
  return String(batchGroupNameInput?.value || activeBatchGroup || '').trim();
}

function normalizeTargetRounds(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 99) : DEFAULT_TARGET_ROUNDS;
}

function targetRoundCount() {
  return normalizeTargetRounds(
    batchSessionMinRowsInput?.value
      || autoBatchMinRowsInput?.value
      || roundAutomationTargetRoundsInput?.value
      || localStorage.getItem(TARGET_ROUNDS_STORAGE_KEY),
  );
}

function syncTargetRoundInputs(value, persist = true) {
  const normalized = normalizeTargetRounds(value);
  [batchSessionMinRowsInput, autoBatchMinRowsInput, roundAutomationTargetRoundsInput].forEach((input) => {
    if (input) input.value = String(normalized);
  });
  if (persist) {
    localStorage.setItem(TARGET_ROUNDS_STORAGE_KEY, String(normalized));
    localStorage.setItem('autoBatchMinRows', String(normalized));
  }
  return normalized;
}

function persistAutoBatchWatchedGroups() {
  saveStoredStringList('autoBatchWatchedGroups', autoBatchWatchedGroups);
}

function persistRoundAutomationSelectedGroups() {
  saveStoredStringList('roundAutomationSelectedGroups', roundAutomationSelectedGroups);
}

function pruneAutoBatchWatchedGroups() {
  const validNames = new Set(Object.keys(batchGroups || {}));
  let changed = false;
  for (const name of Array.from(autoBatchWatchedGroups)) {
    if (!validNames.has(name)) {
      autoBatchWatchedGroups.delete(name);
      changed = true;
    }
  }
  if (changed) persistAutoBatchWatchedGroups();
}

function pruneRoundAutomationSelectedGroups() {
  const validNames = new Set(Object.keys(batchGroups || {}));
  let changed = false;
  for (const name of Array.from(roundAutomationSelectedGroups)) {
    if (!validNames.has(name)) {
      roundAutomationSelectedGroups.delete(name);
      changed = true;
    }
  }
  if (changed) persistRoundAutomationSelectedGroups();
}

function autoBatchThreshold() {
  return targetRoundCount();
}

function updateWatchCurrentBatchGroupButton() {
  if (!watchCurrentBatchGroupButton) return;
  const groupName = currentBatchGroupName();
  const watched = groupName && autoBatchWatchedGroups.has(groupName);
  watchCurrentBatchGroupButton.textContent = watched ? '取消当前组' : '纳入当前组';
  watchCurrentBatchGroupButton.classList.toggle('is-on', Boolean(watched));
  watchCurrentBatchGroupButton.disabled = !groupName;
}

function renderAutoBatchWatchedGroups() {
  pruneAutoBatchWatchedGroups();
  updateWatchCurrentBatchGroupButton();
  const names = Array.from(autoBatchWatchedGroups).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  if (!names.length) {
    setAutoBatchStatus(autoBatchMissingEnabled ? '自动检测已开，但还没有纳入任何组' : '未开启自动检测；先把已开始的组纳入检测');
    return;
  }
  const summary = names.map((name) => `${name}(${normalizeBatchOrders(batchGroups[name] || []).length})`).join('，');
  setAutoBatchStatus(`检测组：${summary}`);
}

function selectedLlmAnnotationModel() {
  if (!Array.isArray(llmAnnotationModels) || !llmAnnotationModels.length) return null;
  return (
    llmAnnotationModels.find((model) => model.id === selectedLlmAnnotationModelId)
    || llmAnnotationModels.find((model) => model.default)
    || llmAnnotationModels[0]
  );
}

function setLlmAgentStatus(text, isError = false) {
  if (!llmAgentStatusEl) return;
  llmAgentStatusEl.textContent = text || '';
  llmAgentStatusEl.classList.toggle('error', Boolean(isError));
}

function renderLlmAgentModels() {
  if (!llmAgentModelListEl) return;
  llmAgentModelListEl.innerHTML = '';
  if (!Array.isArray(llmAnnotationModels) || !llmAnnotationModels.length) {
    setLlmAgentStatus('暂无可用标注模型配置', true);
    return;
  }
  const active = selectedLlmAnnotationModel();
  selectedLlmAnnotationModelId = active?.id || '';
  if (selectedLlmAnnotationModelId) localStorage.setItem('llmAnnotationModelId', selectedLlmAnnotationModelId);
  for (const model of llmAnnotationModels) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'llm-agent-model-button';
    button.classList.toggle('is-active', model.id === selectedLlmAnnotationModelId);
    button.classList.toggle('is-disabled', model.available === false);
    button.dataset.modelId = model.id || '';
    const statusLabel = model.available === false ? (model.statusLabel || '待配置') : (model.statusLabel || '可用');
    button.innerHTML = `
      <span class="llm-model-main">
        <b>${model.name || model.model || model.id || '未命名模型'}</b>
        <em>${model.vendor || model.provider || 'provider'} · ${model.model || '-'}</em>
      </span>
      <span class="llm-model-badge">${statusLabel}</span>
      <span class="llm-model-desc">${model.description || model.role || ''}</span>
    `;
    button.addEventListener('click', () => {
      selectedLlmAnnotationModelId = model.id || '';
      localStorage.setItem('llmAnnotationModelId', selectedLlmAnnotationModelId);
      renderLlmAgentModels();
    });
    llmAgentModelListEl.appendChild(button);
  }
  const current = selectedLlmAnnotationModel();
  const message = current
    ? `当前用于不满意列：${current.name || current.model || current.id}`
    : '请选择标注模型';
  setLlmAgentStatus(message, current?.available === false);
}

async function runCurrentGroupDissatisfactionAnnotation() {
  if (!runLlmDissatisfactionAnnotationButton) return;
  const model = selectedLlmAnnotationModel();
  if (!model || model.available === false) {
    setLlmAgentStatus('当前模型不可用，不能重跑不满意列', true);
    return;
  }
  const { groupName, orders: collectedOrders } = collectBatchOrders();
  const orders = normalizeBatchOrders(currentBatchSessionOrders.length ? currentBatchSessionOrders : collectedOrders);
  if (!orders.length) {
    setLlmAgentStatus('当前组没有可标注项目', true);
    return;
  }
  runLlmDissatisfactionAnnotationButton.disabled = true;
  runLlmDissatisfactionAnnotationButton.dataset.originalLabel = runLlmDissatisfactionAnnotationButton.dataset.originalLabel || runLlmDissatisfactionAnnotationButton.textContent;
  runLlmDissatisfactionAnnotationButton.textContent = '标注中';
  setLlmAgentStatus(`正在使用 ${model.name || model.id} 重跑 ${orders.length} 个项目的不满意列`);
  try {
    const response = await fetchWithTimeout('/api/annotate-dissatisfaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orders,
        model_id: model.id || '',
        force: true,
      }),
    }, 0);
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '标注失败');
    const failedOrders = Array.isArray(payload.failedOrders) ? payload.failedOrders : [];
    const failedText = failedOrders.length ? `，失败 ${failedOrders.length} 个：${failedOrders.join(', ')}` : '';
    setLlmAgentStatus(`已写回不满意列：${payload.changedRows || 0}/${payload.totalRows || 0} 行，模型 ${payload.modelId || model.id}${failedText}`);
    if (batchSessionModal?.open || currentBatchSessionRows.length) {
      const refreshedRows = await fetchBatchRowsForOrders(currentBatchSessionGroupName || groupName, orders);
      renderBatchSessionRows({ groupName: currentBatchSessionGroupName || groupName, orders, rows: refreshedRows });
    }
  } catch (error) {
    setLlmAgentStatus(`不满意列标注失败：${error.message || error}`, true);
  } finally {
    runLlmDissatisfactionAnnotationButton.disabled = false;
    runLlmDissatisfactionAnnotationButton.textContent = runLlmDissatisfactionAnnotationButton.dataset.originalLabel || '重跑当前组不满意列';
  }
}

function syncRoundAutomationGroupName() {
  if (!roundAutomationGroupNameInput) return;
  const selected = Array.from(roundAutomationSelectedGroups).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  if (!selected.length) {
    roundAutomationGroupNameInput.value = '';
  } else if (selected.length === 1) {
    roundAutomationGroupNameInput.value = selected[0];
  } else {
    roundAutomationGroupNameInput.value = `${selected.length} 组：${selected.join('，')}`;
  }
}

function renderRoundAutomationGroupList() {
  if (!roundAutomationGroupListEl) return;
  pruneRoundAutomationSelectedGroups();
  const names = Object.keys(batchGroups || {}).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  roundAutomationGroupListEl.innerHTML = '';
  if (!names.length) {
    const empty = document.createElement('div');
    empty.className = 'round-auto-empty';
    empty.textContent = '暂无批量组，先在项目组里保存一组项目';
    roundAutomationGroupListEl.appendChild(empty);
    syncRoundAutomationGroupName();
    return;
  }
  for (const name of names) {
    roundAutomationGroupListEl.appendChild(createBatchGroupListItem(name, { mode: 'automation' }));
  }
  syncRoundAutomationGroupName();
}

function groupOrderSummary(orders) {
  const list = normalizeBatchOrders(orders || []);
  if (!list.length) return '空组';
  const first = list[0];
  const last = list[list.length - 1];
  return first === last ? first : `${first} - ${last}`;
}

function createBatchGroupListItem(name, options = {}) {
  const mode = options.mode || 'project';
  const orders = normalizeBatchOrders(batchGroups[name] || []);
  const selectedForAutomation = roundAutomationSelectedGroups.has(name);
  const isAutomation = mode === 'automation';
  const isActiveGroup = !isAutomation && activeBatchGroup === name;
  const item = document.createElement('div');
  item.className = 'batch-group-item';
  item.classList.toggle('is-project-mode', !isAutomation);
  item.classList.toggle('is-active', isActiveGroup);
  item.classList.toggle('is-selected', selectedForAutomation);
  item.innerHTML = `
    <span class="batch-group-control">
      <input type="checkbox" ${selectedForAutomation ? 'checked' : ''} aria-label="纳入 ${escapeHtml(name)}" />
    </span>
    <span class="batch-group-content">
      <span class="batch-group-title">${escapeHtml(name)}</span>
      <span class="batch-group-meta">
        <b>${orders.length}</b> 个项目
        <em>${escapeHtml(groupOrderSummary(orders))}</em>
      </span>
    </span>
    <span class="batch-group-badges">
      ${isActiveGroup ? '<i>当前</i>' : ''}
      ${selectedForAutomation ? '<i>自动化</i>' : ''}
    </span>
  `;
  const input = item.querySelector('input');
  input.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  input.addEventListener('change', (event) => {
    event.stopPropagation();
    if (input.checked) {
      roundAutomationSelectedGroups.add(name);
    } else {
      roundAutomationSelectedGroups.delete(name);
    }
    if (!isAutomation) {
      activeBatchGroup = name;
      if (batchGroupSelect) batchGroupSelect.value = name;
      if (batchGroupNameInput) batchGroupNameInput.value = name;
      if (batchTraeInput) batchTraeInput.value = normalizeBatchOrders(batchGroups[name] || []).join(',');
      selectedBatchOrders = new Set();
      renderBatchProjectList();
      renderAutoBatchWatchedGroups();
    }
    persistRoundAutomationSelectedGroups();
    renderBatchGroups();
    renderRoundAutomationGroupList();
    setBatchStatus(roundAutomationSelectedGroups.size ? `已纳入多轮自动化：${roundAutomationSelectedGroups.size} 个组` : '未纳入任何自动化组', !roundAutomationSelectedGroups.size);
    setRoundAutomationStatus(roundAutomationSelectedGroups.size ? `已选择 ${roundAutomationSelectedGroups.size} 个组` : '未选择自动化组', !roundAutomationSelectedGroups.size);
  });
  item.addEventListener('click', () => {
    if (isAutomation) {
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change', { bubbles: false }));
      return;
    }
    loadBatchGroup(name);
    setBatchStatus(`当前组已切换：${name}`);
  });
  return item;
}

function setBatchPanelTab(tabName) {
  const isAutomation = tabName === 'automation';
  if (batchGroupTabPanel) batchGroupTabPanel.hidden = isAutomation;
  if (roundAutomationTabPanel) roundAutomationTabPanel.hidden = !isAutomation;
  showBatchGroupTabButton?.classList.toggle('is-active', !isAutomation);
  showRoundAutomationTabButton?.classList.toggle('is-active', isAutomation);
  if (isAutomation) {
    renderRoundAutomationGroupList();
    syncRoundAutomationGroupName();
  }
}

function setRoundAutomationStatus(text, isError = false) {
  if (!roundAutomationStatusEl) return;
  roundAutomationStatusEl.textContent = text || '';
  roundAutomationStatusEl.classList.toggle('error', Boolean(isError));
}

function roundAutomationPayload() {
  const selected = Array.from(roundAutomationSelectedGroups).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  if (!selected.length) throw new Error('请先勾选一个自动化项目组');
  if (selected.length > 1) throw new Error('高级单步工具一次只处理一个组；多组请用一键开启多轮自动化');
  const groupName = selected[0];
  const orders = normalizeBatchOrders(batchGroups[groupName] || []);
  if (!orders.length) throw new Error('当前组没有项目');
  return {
    group: groupName,
    orders,
    targetRounds: targetRoundCount(),
  };
}

function automationDataLink(pathValue, label) {
  const text = String(pathValue || '').trim();
  if (!text) return '';
  const marker = '/docs/data/';
  const index = text.indexOf(marker);
  const href = index >= 0 ? `/data/${encodeURI(text.slice(index + marker.length))}` : '';
  return href ? `<a href="${href}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>` : escapeHtml(text);
}

function renderRoundAutomationProbe(payload) {
  const projects = payload?.report?.projects || [];
  const cards = projects.map((project) => {
    const listening = (project.ports || []).filter((item) => item.listening).map((item) => item.port);
    const httpOk = (project.http || []).filter((item) => item.ok).length;
    const status = listening.length ? '可访问' : '未启动';
    const cls = listening.length ? 'ok' : 'warn';
    return `
      <article class="round-auto-result-card ${cls}">
        <b>${escapeHtml(project.order || '-')}</b>
        <span>${status}</span>
        <small>前端 ${escapeHtml((project.frontendPorts || []).join(',') || '-')} / 后端 ${escapeHtml((project.backendPorts || []).join(',') || '-')}</small>
        <small>监听 ${escapeHtml(listening.join(',') || '-')} / HTTP OK ${httpOk}</small>
      </article>
    `;
  }).join('');
  if (roundAutomationSummaryEl) {
    roundAutomationSummaryEl.innerHTML = `
      <div class="round-auto-links">${automationDataLink(payload.reportPath, 'probe.json')}</div>
      <div class="round-auto-result-grid">${cards || '<span>没有探测结果</span>'}</div>
    `;
  }
  if (roundAutomationDraftPreviewEl) {
    roundAutomationDraftPreviewEl.textContent = JSON.stringify({
      group: payload.group,
      orders: payload.orders,
      traeWindows: payload.report?.traeWindows || [],
    }, null, 2);
  }
}

function renderRoundAutomationRoundDetect(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const cards = items.map((item) => {
    const completed = Number.parseInt(String(item.completedRounds ?? 0), 10) || 0;
    const target = Number.parseInt(String(item.targetRounds ?? payload.targetRounds ?? 0), 10) || '-';
    const reached = Boolean(item.reachedTarget);
    const nextRound = reached ? '-' : item.nextRound || completed + 1;
    const cls = reached ? 'ok' : completed > 0 ? 'warn' : 'error';
    const diagnostics = [
      `来源 ${item.source || 'cache'}`,
      `缓存 ${item.cachedRounds ?? 0}`,
      item.sentRoundCount != null ? `发送成功 ${item.sentRoundCount}` : '',
      item.effectiveInputCount != null ? `有效输入 ${item.effectiveInputCount}` : '',
      item.rawInputCount != null ? `原始输入 ${item.rawInputCount}` : '',
      item.duplicateInputCount ? `重复/重试 ${item.duplicateInputCount}` : '',
    ].filter(Boolean).join(' · ');
    return `
      <article class="round-auto-result-card ${cls}">
        <b>${escapeHtml(item.order || '-')}</b>
        <span>${reached ? '已达标' : '未达标'} · 已完成 ${escapeHtml(completed)} / 目标 ${escapeHtml(target)} · 下一轮 ${escapeHtml(nextRound)}</span>
        <small>${escapeHtml(diagnostics || (item.cacheExists ? '读取本地会话缓存' : '没有本地会话缓存，按 0 轮处理'))}</small>
        ${item.detectError ? `<small>检测提示：${escapeHtml(item.detectError)}</small>` : ''}
      </article>
    `;
  }).join('');
  if (roundAutomationSummaryEl) {
    roundAutomationSummaryEl.innerHTML = `
      <div class="round-auto-links">轮次检测完成：${escapeHtml(payload.group || '-')} · 本地精确检测优先，缓存兜底，不触发深扫拉取</div>
      <div class="round-auto-result-grid">${cards || '<span>没有轮次检测结果</span>'}</div>
    `;
  }
  if (roundAutomationDraftPreviewEl) {
    roundAutomationDraftPreviewEl.textContent = JSON.stringify(payload, null, 2);
  }
}

function renderRoundAutomationBrowser(payload) {
  const results = payload?.results || [];
  const cards = results.map((item) => {
    const cls = item.ok ? 'ok' : item.skipped ? 'warn' : 'error';
    const detail = item.skipped ? item.reason : item.error || `console ${item.consoleCount || 0} / request ${item.requestFailureCount || 0} / response ${item.responseErrorCount || 0}`;
    return `
      <article class="round-auto-result-card ${cls}">
        <b>${escapeHtml(item.order || '-')}</b>
        <span>${item.ok ? '浏览器检查完成' : item.skipped ? '跳过' : '失败'}</span>
        <small>${escapeHtml(item.url || detail || '-')}</small>
        <small>${automationDataLink(item.reportPath, '报告')}${item.screenshotPath ? ' · ' + automationDataLink(item.screenshotPath, '截图') : ''}</small>
      </article>
    `;
  }).join('');
  if (roundAutomationSummaryEl) {
    roundAutomationSummaryEl.innerHTML = `
      <div class="round-auto-links">完成 ${payload.checked || 0} 个，跳过 ${payload.skipped || 0} 个</div>
      <div class="round-auto-result-grid">${cards || '<span>没有浏览器检查结果</span>'}</div>
    `;
  }
  if (roundAutomationDraftPreviewEl) {
    roundAutomationDraftPreviewEl.textContent = JSON.stringify(results, null, 2);
  }
}

function renderRoundAutomationRuntime(payload) {
  const results = payload?.report?.results || [];
  const cards = results.map((item) => {
    const cls = item.ok ? 'ok' : item.blocked?.length ? 'error' : 'warn';
    const started = (item.started || []).map((entry) => `${entry.scope}:${entry.port}`).join(',') || '-';
    const errors = (item.errors || []).map((entry) => typeof entry === 'string' ? entry : entry.reason || JSON.stringify(entry)).join('；');
    const detail = item.ok ? `${item.frontendUrl || '-'} / ${item.backendHealthUrl || '-'}` : errors || '未形成完整运行态';
    return `
      <article class="round-auto-result-card ${cls}">
        <b>${escapeHtml(item.order || '-')}</b>
        <span>${item.ok ? '运行态可用' : item.blocked?.length ? '端口阻塞' : '需处理'}</span>
        <small>启动 ${escapeHtml(started)} / 前端 ${escapeHtml((item.frontendPorts || []).join(',') || '-')} / 后端 ${escapeHtml((item.backendPorts || []).join(',') || '-')}</small>
        <small>${escapeHtml(detail)}</small>
      </article>
    `;
  }).join('');
  if (roundAutomationSummaryEl) {
    roundAutomationSummaryEl.innerHTML = `
      <div class="round-auto-links">${automationDataLink(payload.reportPath, 'runtime_start_report.json')}</div>
      <div class="round-auto-result-grid">${cards || '<span>没有启动结果</span>'}</div>
    `;
  }
  if (roundAutomationDraftPreviewEl) {
    roundAutomationDraftPreviewEl.textContent = JSON.stringify(results, null, 2);
  }
}

function renderRoundAutomationDrafts(payload) {
  const drafts = payload?.drafts || [];
  const cards = drafts.map((item) => `
    <article class="round-auto-result-card ${item.issues?.length ? 'warn' : 'ok'}">
      <b>${escapeHtml(item.order || '-')}</b>
      <span>问题 ${item.issues?.length || 0} / 证据 ${item.evidence?.length || 0}</span>
      <small>${escapeHtml((item.issues || [])[0] || '已生成草稿')}</small>
    </article>
  `).join('');
  if (roundAutomationSummaryEl) {
    roundAutomationSummaryEl.innerHTML = `
      <div class="round-auto-links">${automationDataLink(payload.markdownPath, 'next_prompt_drafts.md')} · ${automationDataLink(payload.jsonPath, 'next_prompt_drafts.json')}</div>
      <div class="round-auto-result-grid">${cards || '<span>没有草稿结果</span>'}</div>
    `;
  }
  if (roundAutomationDraftPreviewEl) {
    roundAutomationDraftPreviewEl.textContent = payload.markdownPreview || JSON.stringify(drafts, null, 2);
  }
}

function renderRoundAutomationQueue(payload) {
  const queue = payload?.queue || [];
  const skipped = payload?.skipped || [];
  const cards = queue.map((item) => {
    const cls = item.priority === 'high' ? 'error' : item.priority === 'medium' ? 'warn' : 'ok';
    const firstIssue = (item.issues || [])[0] || item.reason || '待提交';
    return `
      <article class="round-auto-result-card ${cls}">
        <b>${escapeHtml(item.order || '-')}</b>
        <span>${escapeHtml(item.priority || 'normal')} · 分数 ${escapeHtml(item.score ?? '-')}</span>
        <small>${escapeHtml(firstIssue)}</small>
        <small>窗口 ${item.windowAvailable ? '已匹配' : '未匹配'} / 前端 ${escapeHtml(item.frontendUrl || '-')}</small>
      </article>
    `;
  }).join('');
  const skippedText = skipped.length ? `，跳过 ${skipped.length} 个：${skipped.map((item) => item.order).join(', ')}` : '';
  if (roundAutomationSummaryEl) {
    roundAutomationSummaryEl.innerHTML = `
      <div class="round-auto-links">${automationDataLink(payload.markdownPath, 'submit_queue.md')} · ${automationDataLink(payload.jsonPath, 'submit_queue.json')}</div>
      <div class="round-auto-links">待提交 ${queue.length} 个${skippedText}</div>
      <div class="round-auto-result-grid">${cards || '<span>没有待提交项目</span>'}</div>
    `;
  }
  if (roundAutomationDraftPreviewEl) {
    roundAutomationDraftPreviewEl.textContent = payload.markdownPreview || JSON.stringify({ queue, skipped }, null, 2);
  }
}

function renderRoundAutomationPrepare(payload) {
  const focus = payload?.focus || {};
  const cls = payload.blocked ? 'error' : focus.matched ? 'ok' : 'warn';
  if (roundAutomationSummaryEl) {
    roundAutomationSummaryEl.innerHTML = `
      <div class="round-auto-result-grid">
        <article class="round-auto-result-card ${cls}">
          <b>${escapeHtml(payload.order || '-')}</b>
          <span>${payload.blocked ? '已阻止准备' : payload.clipboardWritten ? '已复制 prompt 到剪贴板' : '未写剪贴板'} · ${focus.matched ? '窗口已聚焦' : '未匹配窗口'}</span>
          <small>${escapeHtml((payload.issues || [])[0] || '已准备队列首项')}</small>
          <small>${escapeHtml(payload.blockReason || focus.window || '请先恢复并确认 Trae 窗口可见')}</small>
        </article>
      </div>
    `;
  }
  if (roundAutomationDraftPreviewEl) {
    roundAutomationDraftPreviewEl.textContent = payload.promptPreview || JSON.stringify(payload, null, 2);
  }
}

function renderRoundAutomationFastSubmit(payload) {
  const submit = payload?.submit || {};
  const cls = submit.matched ? 'ok' : 'error';
  if (roundAutomationSummaryEl) {
    roundAutomationSummaryEl.innerHTML = `
      <div class="round-auto-result-grid">
        <article class="round-auto-result-card ${cls}">
          <b>${escapeHtml(payload.order || '-')}</b>
          <span>${submit.matched ? '已执行快捷键粘贴运行' : '未匹配目标窗口'}</span>
          <small>prompt ${escapeHtml(payload.promptLength ?? 0)} 字 · ${escapeHtml(submit.window || '没有匹配窗口')}</small>
          <small>${escapeHtml(payload.note || '读取已有提交队列，不重扫、不重建、不截图')}</small>
        </article>
      </div>
    `;
  }
  if (roundAutomationDraftPreviewEl) {
    roundAutomationDraftPreviewEl.textContent = JSON.stringify(payload, null, 2);
  }
}

function renderRoundAutomationJob(payload) {
  const job = payload?.job || payload || {};
  const groups = Array.isArray(job.groups) ? job.groups : [];
  const orders = job.orders || {};
  const events = Array.isArray(job.events) ? job.events.slice(-12).reverse() : [];
  const running = job.status === 'running' || job.status === 'stopping';
  const orderEntries = Object.entries(orders).sort((a, b) => a[0].localeCompare(b[0], 'zh-CN', { numeric: true }));
  const completedOrders = orderEntries.filter(([, state]) => state?.status === 'completed').map(([order]) => order);
  const pendingOrders = orderEntries.filter(([, state]) => state?.status === 'pending').map(([order]) => order);
  const blockedOrders = orderEntries.filter(([, state]) => state?.status === 'blocked' || state?.status === 'failed').map(([order]) => order);
  const readyOrders = orderEntries.filter(([, state]) => !['completed', 'pending', 'blocked', 'failed'].includes(state?.status || '')).map(([order]) => order);
  const compactOrders = (items) => items.length ? items.slice(0, 10).join('，') + (items.length > 10 ? ` 等 ${items.length} 个` : '') : '-';
  const orderCards = orderEntries.map(([order, state]) => {
    const status = state?.status || '-';
    const cls = status === 'completed' ? 'ok' : status === 'blocked' || status === 'failed' ? 'error' : status === 'pending' || status === 'running' || status === 'submitted' ? 'warn' : 'ok';
    const statusText = status === 'completed' ? '已达标' : status === 'pending' ? '等待确认' : status === 'blocked' ? '已阻塞' : status === 'ready' ? '待提交' : status;
    const completedRounds = Number.parseInt(String(state?.completedRounds ?? 0), 10) || 0;
    const targetRounds = Number.parseInt(String(state?.targetRounds ?? job.targetRounds ?? 0), 10) || '-';
    const nextRound = state?.pendingRound || (Number.isInteger(targetRounds) ? Math.min(completedRounds + 1, targetRounds) : completedRounds + 1);
    const roundText = `已完成 ${completedRounds} / 目标 ${targetRounds}`;
    const pending = state?.pendingRound ? `，待确认第 ${state.pendingRound} 轮` : '';
    return `
      <article class="round-auto-result-card ${cls}">
        <b>${escapeHtml(order)}</b>
        <span>${escapeHtml(statusText)} · ${escapeHtml(roundText)} · 下一轮 ${escapeHtml(nextRound)}${escapeHtml(pending)}</span>
        <small>${escapeHtml(state?.message || state?.lastError || state?.group || '')}</small>
      </article>
    `;
  }).join('');
  const eventText = events.map((event) => {
    const order = event.order ? `${event.order} ` : '';
    const round = event.round ? `R${event.round} ` : '';
    return `${event.time || ''} ${order}${round}${event.message || event.action || ''}`;
  }).join('\n');
  if (roundAutomationSummaryEl) {
    roundAutomationSummaryEl.innerHTML = `
      <div class="round-auto-links">状态 ${escapeHtml(job.status || '-')} · 组 ${groups.length} · 轮次 ${escapeHtml(job.targetRounds ?? '-')} · job ${escapeHtml(job.id || '-')}</div>
      <div class="round-auto-links">已达标 ${completedOrders.length} · 等待确认 ${pendingOrders.length} · 待提交 ${readyOrders.length} · 异常 ${blockedOrders.length}</div>
      <div class="round-auto-links">已达标项目：${escapeHtml(compactOrders(completedOrders))}</div>
      <div class="round-auto-result-grid">${orderCards || '<span>还没有项目状态</span>'}</div>
    `;
  }
  if (roundAutomationDraftPreviewEl) {
    roundAutomationDraftPreviewEl.textContent = eventText || JSON.stringify(job, null, 2);
  }
  setRoundAutomationStatus(
    job.status === 'running'
      ? `多轮自动化运行中：${groups.join('，') || '-'}`
      : job.status === 'completed'
        ? `多轮自动化已完成：${groups.join('，') || '-'}`
        : job.status === 'stopped'
          ? '多轮自动化已停止'
          : `多轮自动化状态：${job.status || '-'}`,
    job.status === 'failed',
  );
  if (startRoundAutomationButton) startRoundAutomationButton.disabled = running;
  if (stopRoundAutomationButton) stopRoundAutomationButton.disabled = !running || job.status === 'stopping';
}

async function pollRoundAutomationJob(immediate = false) {
  if (!roundAutomationJobId) return;
  if (roundAutomationPollTimer) {
    window.clearTimeout(roundAutomationPollTimer);
    roundAutomationPollTimer = null;
  }
  const run = async () => {
    try {
      const response = await fetch(`/api/trae-round-automation-job-status?id=${encodeURIComponent(roundAutomationJobId)}`);
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error || '读取调度状态失败');
      renderRoundAutomationJob(payload);
      const status = payload.job?.status || '';
      if (status === 'running' || status === 'stopping') {
        roundAutomationPollTimer = window.setTimeout(() => pollRoundAutomationJob(true), 5000);
      }
    } catch (error) {
      setRoundAutomationStatus(`读取调度状态失败：${error.message || error}`, true);
    }
  };
  if (immediate) {
    await run();
  } else {
    roundAutomationPollTimer = window.setTimeout(run, 5000);
  }
}

async function startRoundAutomation() {
  const groups = Array.from(roundAutomationSelectedGroups).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  if (!groups.length) {
    setRoundAutomationStatus('请先勾选要纳入多轮自动化的批量组', true);
    return;
  }
  if (startRoundAutomationButton) startRoundAutomationButton.disabled = true;
  if (stopRoundAutomationButton) stopRoundAutomationButton.disabled = false;
  setRoundAutomationStatus(`正在开启 ${groups.length} 个组的多轮自动化...`);
  let started = false;
  try {
    const response = await fetchWithTimeout('/api/trae-round-automation-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groups,
        targetRounds: targetRoundCount(),
      }),
    }, 0);
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '开启失败');
    roundAutomationJobId = payload.job?.id || payload.id || '';
    if (roundAutomationJobId) localStorage.setItem('roundAutomationJobId', roundAutomationJobId);
    started = true;
    renderRoundAutomationJob(payload);
    await pollRoundAutomationJob(true);
  } catch (error) {
    setRoundAutomationStatus(`开启多轮自动化失败：${error.message || error}`, true);
  } finally {
    if (!started && startRoundAutomationButton) startRoundAutomationButton.disabled = false;
  }
}

async function stopRoundAutomation() {
  if (!roundAutomationJobId) {
    setRoundAutomationStatus('当前没有运行中的多轮自动化任务');
    return;
  }
  if (stopRoundAutomationButton) stopRoundAutomationButton.disabled = true;
  try {
    const response = await fetchWithTimeout('/api/trae-round-automation-stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: roundAutomationJobId }),
    }, 0);
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '停止失败');
    renderRoundAutomationJob(payload);
    await pollRoundAutomationJob(true);
  } catch (error) {
    setRoundAutomationStatus(`停止失败：${error.message || error}`, true);
  } finally {
    if (stopRoundAutomationButton) stopRoundAutomationButton.disabled = false;
  }
}

function renderRoundAutomationAxProbe(payload) {
  const cls = payload.ok ? 'ok' : 'warn';
  if (roundAutomationSummaryEl) {
    roundAutomationSummaryEl.innerHTML = `
      <div class="round-auto-result-grid">
        <article class="round-auto-result-card ${cls}">
          <b>${escapeHtml(payload.order || '-')}</b>
          <span>${payload.ok ? 'AX 窗口已匹配' : 'AX 未匹配'}</span>
          <small>${automationDataLink(payload.path, 'AX 树报告')} · 行数 ${escapeHtml(payload.lineCount ?? '-')}</small>
          <small>${payload.focused ? '已聚焦窗口' : '未聚焦，仅探测'}</small>
        </article>
      </div>
    `;
  }
  if (roundAutomationDraftPreviewEl) {
    roundAutomationDraftPreviewEl.textContent = payload.preview || JSON.stringify(payload, null, 2);
  }
}

function renderRoundAutomationRestore(payload) {
  const ax = payload?.ax || {};
  const open = payload?.open || {};
  const cls = ax.ok ? 'ok' : 'warn';
  if (roundAutomationSummaryEl) {
    roundAutomationSummaryEl.innerHTML = `
      <div class="round-auto-result-grid">
        <article class="round-auto-result-card ${cls}">
          <b>${escapeHtml(payload.order || '-')}</b>
          <span>${ax.ok ? '窗口已恢复并匹配' : '已尝试恢复，仍未匹配'}</span>
          <small>打开方式 ${escapeHtml(open.launchMode || '-')} / ${automationDataLink(ax.path, 'AX 树报告')}</small>
          <small>${escapeHtml(ax.preview || ax.window || '没有可枚举窗口时，请切到目标 Trae 所在桌面后重试')}</small>
        </article>
      </div>
    `;
  }
  if (roundAutomationDraftPreviewEl) {
    roundAutomationDraftPreviewEl.textContent = JSON.stringify({
      order: payload.order,
      open: {
        ok: open.ok,
        launchMode: open.launchMode,
        folder: open.folder,
        userDataDir: open.userDataDir,
      },
      ax,
    }, null, 2);
  }
}

async function runRoundAutomationStep(step) {
  const endpointMap = {
    probe: '/api/trae-round-automation-probe',
    roundDetect: '/api/trae-round-automation-round-detect',
    runtime: '/api/trae-round-automation-runtime-start',
    browser: '/api/trae-round-automation-browser-check',
    drafts: '/api/trae-round-automation-drafts',
    queue: '/api/trae-round-automation-submit-queue',
    roundQueue: '/api/trae-round-automation-round-prompt-queue',
    restore: '/api/trae-round-automation-restore-window',
    ax: '/api/trae-round-automation-ax-probe',
    prepare: '/api/trae-round-automation-prepare-submit',
    submit: '/api/trae-round-automation-fast-submit',
  };
  const buttonMap = {
    probe: runRoundAutomationProbeButton,
    roundDetect: runRoundAutomationRoundDetectButton,
    runtime: runRoundAutomationRuntimeButton,
    browser: runRoundAutomationBrowserButton,
    drafts: runRoundAutomationDraftsButton,
    queue: runRoundAutomationQueueButton,
    roundQueue: runRoundPromptQueueButton,
    restore: restoreRoundAutomationWindowButton,
    ax: probeRoundAutomationWindowButton,
    prepare: prepareRoundAutomationSubmitButton,
    submit: fastRoundAutomationSubmitButton,
  };
  const labelMap = {
    probe: '探测',
    roundDetect: '轮次检测',
    runtime: '安全启动运行态',
    browser: '浏览器检查',
    drafts: '反馈草稿',
    queue: '提交队列',
    roundQueue: '轮次输入队列',
    restore: '恢复窗口',
    ax: '窗口探测',
    prepare: '准备首项',
    submit: '快速粘贴运行',
  };
  const endpoint = endpointMap[step];
  const button = buttonMap[step];
  if (!endpoint) return;
  let payload;
  try {
    payload = roundAutomationPayload();
    if (step === 'prepare') payload.requireWindow = true;
    if (step === 'submit') payload.run = true;
  } catch (error) {
    setRoundAutomationStatus(error.message || String(error), true);
    return;
  }
  const buttons = [runRoundAutomationProbeButton, runRoundAutomationRoundDetectButton, runRoundAutomationRuntimeButton, runRoundAutomationBrowserButton, runRoundAutomationDraftsButton, runRoundAutomationQueueButton, runRoundPromptQueueButton, restoreRoundAutomationWindowButton, probeRoundAutomationWindowButton, prepareRoundAutomationSubmitButton, fastRoundAutomationSubmitButton].filter(Boolean);
  buttons.forEach((item) => { item.disabled = true; });
  if (button) {
    button.dataset.originalLabel = button.dataset.originalLabel || button.textContent;
    button.textContent = '执行中';
  }
  setRoundAutomationStatus(`正在执行${labelMap[step]}：${payload.group}`);
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 0);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || `${labelMap[step]}失败`);
    if (step === 'probe') renderRoundAutomationProbe(result);
    if (step === 'roundDetect') renderRoundAutomationRoundDetect(result);
    if (step === 'runtime') renderRoundAutomationRuntime(result);
    if (step === 'browser') renderRoundAutomationBrowser(result);
    if (step === 'drafts') renderRoundAutomationDrafts(result);
    if (step === 'queue') renderRoundAutomationQueue(result);
    if (step === 'roundQueue') renderRoundAutomationQueue(result);
    if (step === 'restore') renderRoundAutomationRestore(result);
    if (step === 'ax') renderRoundAutomationAxProbe(result);
    if (step === 'prepare') renderRoundAutomationPrepare(result);
    if (step === 'submit') renderRoundAutomationFastSubmit(result);
    setRoundAutomationStatus(`${labelMap[step]}完成：${payload.group}`);
  } catch (error) {
    console.error('Trae 多轮自动化失败:', error);
    setRoundAutomationStatus(`${labelMap[step]}失败：${error.message || error}`, true);
  } finally {
    buttons.forEach((item) => { item.disabled = false; });
    if (button) button.textContent = button.dataset.originalLabel || labelMap[step];
  }
}

function renderBatchGroups() {
  if (!batchGroupSelect) return;
  pruneAutoBatchWatchedGroups();
  pruneRoundAutomationSelectedGroups();
  const previous = activeBatchGroup || batchGroupSelect.value;
  batchGroupSelect.innerHTML = '';
  const names = Object.keys(batchGroups).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = names.length ? '选择组' : '暂无组';
  batchGroupSelect.appendChild(empty);
  for (const name of names) {
    const option = document.createElement('option');
    option.value = name;
    const watchedPrefix = autoBatchWatchedGroups.has(name) ? '● ' : '';
    option.textContent = `${watchedPrefix}${name} (${normalizeBatchOrders(batchGroups[name]).length})`;
    batchGroupSelect.appendChild(option);
  }
  if (previous && names.includes(previous)) {
    batchGroupSelect.value = previous;
    activeBatchGroup = previous;
  } else if (names.length && !activeBatchGroup) {
    batchGroupSelect.value = names[0];
    activeBatchGroup = names[0];
  }
  renderBatchGroupList(names);
  renderAutoBatchWatchedGroups();
}

function renderBatchGroupList(names = null) {
  if (!batchGroupListEl) return;
  const groupNames = Array.isArray(names)
    ? names
    : Object.keys(batchGroups || {}).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  batchGroupListEl.innerHTML = '';
  if (!groupNames.length) {
    const empty = document.createElement('div');
    empty.className = 'batch-group-empty';
    empty.textContent = '暂无批量组';
    batchGroupListEl.appendChild(empty);
    return;
  }
  for (const name of groupNames) {
    batchGroupListEl.appendChild(createBatchGroupListItem(name, { mode: 'project' }));
  }
}

function loadBatchGroup(name) {
  activeBatchGroup = String(name || '').trim();
  if (batchGroupSelect) batchGroupSelect.value = activeBatchGroup;
  if (batchGroupNameInput) batchGroupNameInput.value = activeBatchGroup;
  if (batchTraeInput) batchTraeInput.value = normalizeBatchOrders(batchGroups[activeBatchGroup] || []).join(',');
  selectedBatchOrders = new Set();
  renderBatchProjectList();
  renderAutoBatchWatchedGroups();
  renderBatchGroupList();
  renderRoundAutomationGroupList();
  syncRoundAutomationGroupName();
}

async function fetchBatchGroups() {
  try {
    const response = await fetch('/api/trae-groups');
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '读取组失败');
    batchGroups = payload.groups || {};
    renderBatchGroups();
    renderRoundAutomationGroupList();
    if (activeBatchGroup && batchGroups[activeBatchGroup]) {
      loadBatchGroup(activeBatchGroup);
    } else if (Object.keys(batchGroups).length && !batchTraeInput?.value) {
      loadBatchGroup(Object.keys(batchGroups).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))[0]);
    }
  } catch (error) {
    setBatchStatus(`读取组失败：${error.message || error}`, true);
  }
}

async function saveBatchGroup(name, orders) {
  const groupName = String(name || '').trim();
  const normalizedOrders = normalizeBatchOrders(orders);
  if (!groupName) {
    setBatchStatus('请输入组名', true);
    batchGroupNameInput?.focus();
    return false;
  }
  if (!normalizedOrders.length) {
    setBatchStatus('组内没有项目', true);
    return false;
  }
  const response = await fetch('/api/trae-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', name: groupName, orders: normalizedOrders }),
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || '保存组失败');
  batchGroups = payload.groups || {};
  activeBatchGroup = payload.active || groupName;
  renderBatchGroups();
  loadBatchGroup(activeBatchGroup);
  renderAutoBatchWatchedGroups();
  renderRoundAutomationGroupList();
  setBatchStatus(`已保存组 ${activeBatchGroup}：${normalizedOrders.length} 个项目`);
  return true;
}

async function deleteActiveBatchGroup() {
  const groupName = currentBatchGroupName();
  if (!groupName) {
    setBatchStatus('请选择要删除的组', true);
    return;
  }
  const response = await fetch('/api/trae-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', name: groupName }),
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || '删除组失败');
  batchGroups = payload.groups || {};
  autoBatchWatchedGroups.delete(groupName);
  roundAutomationSelectedGroups.delete(groupName);
  persistAutoBatchWatchedGroups();
  persistRoundAutomationSelectedGroups();
  activeBatchGroup = '';
  renderBatchGroups();
  renderRoundAutomationGroupList();
  if (Object.keys(batchGroups).length) {
    loadBatchGroup(Object.keys(batchGroups).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))[0]);
  } else {
    if (batchGroupNameInput) batchGroupNameInput.value = '';
    if (batchTraeInput) batchTraeInput.value = '';
    selectedBatchOrders = new Set();
    renderBatchProjectList();
  }
  setBatchStatus(`已删除组 ${groupName}`);
}

async function addSelectionToActiveGroup() {
  const selected = normalizeBatchOrders(Array.from(selectedBatchOrders));
  if (!selected.length) {
    setBatchStatus('请先在列表中选择项目', true);
    return;
  }
  const existing = normalizeBatchOrders(parseBatchOrders());
  const merged = normalizeBatchOrders([...existing, ...selected]);
  if (batchTraeInput) batchTraeInput.value = merged.join(',');
  const groupName = currentBatchGroupName() || `组${Object.keys(batchGroups).length + 1}`;
  if (batchGroupNameInput) batchGroupNameInput.value = groupName;
  await saveBatchGroup(groupName, merged);
  selectedBatchOrders = new Set();
  renderBatchProjectList();
}

async function toggleCurrentBatchGroupWatch() {
  const groupName = currentBatchGroupName();
  if (!groupName) {
    setAutoBatchStatus('请先选择或保存一个组', true);
    return;
  }
  if (autoBatchWatchedGroups.has(groupName)) {
    autoBatchWatchedGroups.delete(groupName);
    persistAutoBatchWatchedGroups();
    renderBatchGroups();
    setAutoBatchStatus(`已取消检测：${groupName}`);
    return;
  }
  const orders = normalizeBatchOrders(parseBatchOrders());
  if (!orders.length) {
    setAutoBatchStatus('当前组没有项目，不能纳入自动检测', true);
    return;
  }
  if (!batchGroups[groupName] || normalizeBatchOrders(batchGroups[groupName]).join(',') !== orders.join(',')) {
    await saveBatchGroup(groupName, orders);
  }
  autoBatchWatchedGroups.add(groupName);
  persistAutoBatchWatchedGroups();
  renderBatchGroups();
  setAutoBatchStatus(`已纳入自动检测：${groupName}`);
  scheduleAutoBatchMissingCheck(autoBatchMissingEnabled ? 1000 : 0);
}

function syncBatchInputFromSelection() {
  if (!batchTraeInput) return;
  const selected = normalizeBatchOrders(Array.from(selectedBatchOrders));
  setBatchStatus(selected.length ? `已选择 ${selected.length} 个，点击“选择加入组”写入当前组` : '');
}

function syncBatchSelectionFromInput() {
  selectedBatchOrders = new Set(selectedBatchOrders);
}

function renderBatchProjectList() {
  if (!batchProjectList) return;
  syncBatchSelectionFromInput();
  batchProjectList.innerHTML = '';
  const sorted = visiblePromptList().sort(comparePromptOrder);
  for (const prompt of sorted) {
    const order = getOrder(prompt);
    const label = document.createElement('label');
    label.className = 'batch-project-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = order;
    checkbox.checked = selectedBatchOrders.has(order);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedBatchOrders.add(order);
      } else {
        selectedBatchOrders.delete(order);
      }
      syncBatchInputFromSelection();
    });
    const text = document.createElement('span');
    text.textContent = `${order} ${prompt.name || ''}`;
    label.append(checkbox, text);
    batchProjectList.appendChild(label);
  }
}

async function runBatchTrae(action) {
  const groupName = currentBatchGroupName();
  const orders = normalizeBatchOrders(parseBatchOrders());
  if (!orders.length) {
    setBatchStatus('当前组没有项目，请先选择项目并加入组', true);
    batchTraeInput?.focus();
    return;
  }
  const button = action === 'open' ? batchOpenTraeButton : batchCloseTraeButton;
  const otherButton = action === 'open' ? batchCloseTraeButton : batchOpenTraeButton;
  const launcherName = 'Trae';
  if (button) button.disabled = true;
  if (otherButton) otherButton.disabled = true;
  setBatchStatus(action === 'open' ? `启动 ${launcherName} 组 ${groupName || '-'}：${orders.join(',')}` : `关闭组 ${groupName || '-'}：${orders.join(',')}`);
  try {
    const response = await fetch('/api/batch-trae-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, orders }),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '批量操作失败');
    const results = Array.isArray(payload.results) ? payload.results : [];
    const okCount = results.filter((item) => item && item.ok).length;
    const failed = results.filter((item) => item && !item.ok);
    const failedText = failed.length ? `；失败 ${failed.length}：${failed.map((item) => item.order).join(',')}` : '';
    setBatchStatus(`完成 ${okCount}/${results.length || orders.length}${failedText}`, Boolean(failed.length));
  } catch (error) {
    setBatchStatus(`失败：${error.message || error}`, true);
  } finally {
    if (button) button.disabled = false;
    if (otherButton) otherButton.disabled = false;
  }
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function markCopied(button, label = '已复制') {
  if (!button) return;
  const original = button.dataset.originalLabel || button.textContent;
  button.dataset.originalLabel = original;
  button.textContent = label;
  button.classList.add('copied');
  setTimeout(() => {
    button.textContent = button.dataset.originalLabel || original;
    button.classList.remove('copied');
  }, 1000);
}

async function copyText(text, button) {
  await navigator.clipboard.writeText(text);
  markCopied(button);
}

function splitPrompt(prompt) {
  const parts = String(prompt || '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return { background: prompt || '', features: '', delivery: '' };
  if (parts.length === 2) return { background: parts[0], features: parts[1], delivery: '' };
  return { background: parts[0], features: parts.slice(1, -1).join('\n\n'), delivery: parts[parts.length - 1] };
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function fillSelect(select, values, label, formatValue = (value) => value) {
  select.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = `全部${label}`;
  select.appendChild(all);
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = formatValue(value);
    select.appendChild(option);
  }
}

function renderStats() {
  const visiblePrompts = visiblePromptList();
  const candidateCount = new Set(visiblePrompts.map((prompt) => prompt.candidate_id)).size;
  const completedCount = visiblePrompts.filter((prompt) => isCompleted(prompt.id)).length;
  const cards = [
    ['素材', atoms.length],
    ['方案', candidateCount],
    ['Prompt', visiblePrompts.length],
    ['完成', completedCount],
    ['当前筛选', filteredPrompts.length],
  ];
  statsBar.innerHTML = cards.map(([label, value]) => `<article class="${label === '完成' ? 'done-stat' : ''}"><b>${value}</b><span>${label}</span></article>`).join('');
}

function matchesSearch(prompt, keyword) {
  if (!keyword) return true;
  const haystack = [
    prompt.name,
    prompt.target_user,
    prompt.product_form,
    prompt.scenario,
    prompt.business_domain,
    prompt.monetization,
    prompt.prompt_persona,
    prompt.prompt_subtone,
    prompt.prompt_intent,
    prompt.prompt_detail,
    ...(prompt.capability_bundle || []),
  ].join(' ').toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

function applyFilters() {
  const domain = domainFilter.value;
  const user = userFilter.value;
  const platform = platformFilter.value;
  const scenario = scenarioFilter.value;
  const keyword = searchInput.value.trim();

  filteredPrompts = visiblePromptList().filter((prompt) => {
    if (domain && prompt.business_domain !== domain) return false;
    if (user && prompt.target_user !== user) return false;
    if (platform && prompt.product_form !== platform) return false;
    if (scenario && prompt.scenario !== scenario) return false;
    return matchesSearch(prompt, keyword);
  }).sort(comparePromptOrder);

  renderStats();
  renderSceneButtons();
  renderRows();
  sessionOrderList = filteredPrompts.map((prompt) => getOrder(prompt));
  if (activeSessionOrder && !sessionOrderList.includes(activeSessionOrder)) {
    activeSessionOrder = '';
  }
  if (filteredPrompts.length && !filteredPrompts.some((prompt) => prompt.id === selectedPromptId)) {
    selectPrompt(filteredPrompts[0].id);
  } else if (!filteredPrompts.length) {
    selectedPromptId = '';
    detailPanel.hidden = true;
  }
}

function updatePromptPreviewVisibility() {
  if (promptPreviewToggleButton) {
    promptPreviewToggleButton.textContent = promptPreviewVisible ? '隐藏提示词预览' : '显示提示词预览';
    promptPreviewToggleButton.classList.toggle('is-off', !promptPreviewVisible);
    promptPreviewToggleButton.setAttribute('aria-pressed', promptPreviewVisible ? 'true' : 'false');
  }
  if (detailPanel) detailPanel.hidden = !promptPreviewVisible || !selectedPromptId;
}

function actionButton(label, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

function fetchWithTimeout(url, options = {}, timeoutMs = sessionFetchTimeoutMs) {
  if (!timeoutMs || timeoutMs < 0) {
    return fetch(url, options);
  }
  const controller = options.signal ? null : new AbortController();
  const timeout = window.setTimeout(() => {
    if (controller) controller.abort();
  }, timeoutMs);
  const requestOptions = controller ? { ...options, signal: controller.signal } : options;
  return fetch(url, requestOptions).finally(() => window.clearTimeout(timeout));
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isCompositeTraeSessionId(value) {
  return /^\.[^:\s]+:[0-9a-f]{32}_[0-9a-f]{24}\.[0-9a-f]{24}\.[0-9a-f]{24}:Trae CN\.T\(/.test(String(value || '').trim());
}

function rawSessionIdFromComposite(value) {
  const match = String(value || '').trim().match(/^\.[^:\s]+:[0-9a-f]{32}_([0-9a-f]{24})\.[0-9a-f]{24}\.[0-9a-f]{24}:Trae CN\.T\(/);
  return match ? match[1] : '';
}

function displaySessionId(value) {
  return String(value || '').trim().replace(
    /^(\.[^:\s]+:[0-9a-f]{32}_[0-9a-f]{24}\.[0-9a-f]{24})\.[0-9a-f]{24}(:Trae CN\.T\([^)]+\))$/,
    '$1$2',
  );
}

function sessionColumnText(row) {
  return String(row?.sessionId || row?.sessionComposite || row?.logTraceId || '-').trim() || '-';
}

function normalizeSessionRow(row) {
  const normalized = { ...(row || {}) };
  const sessionId = String(normalized.sessionId || '').trim();
  let rawSessionId = String(normalized.rawSessionId || '').trim();
  const logTrace = String(normalized.logTrace || '').trim();
  const logTraceId = String(normalized.logTraceId || '').trim();
  const sessionComposite = String(normalized.sessionComposite || '').trim();
  let composite = '';
  if (isCompositeTraeSessionId(sessionId)) {
    composite = sessionId;
  } else if (isCompositeTraeSessionId(logTraceId)) {
    composite = logTraceId;
  } else if (isCompositeTraeSessionId(sessionComposite)) {
    composite = sessionComposite;
  } else if (isCompositeTraeSessionId(logTrace)) {
    composite = logTrace;
  }
  if (composite) {
    normalized.logTraceId = normalized.logTraceId || composite;
    normalized.sessionComposite = normalized.sessionComposite || composite;
    if (isCompositeTraeSessionId(logTrace)) {
      normalized.logTrace = '';
    }
    rawSessionId = rawSessionId || rawSessionIdFromComposite(composite);
  }
  if (rawSessionId) {
    normalized.rawSessionId = rawSessionId;
  }
  if (!composite && rawSessionId && !sessionId) {
    normalized.sessionId = rawSessionId;
  }
  const existingDisplayId = String(normalized.sessionDisplayId || '').trim();
  const displaySessionId = isCompositeTraeSessionId(sessionId)
    ? rawSessionId
    : (sessionId || rawSessionId);
  normalized.sessionDisplayId = existingDisplayId || String(displaySessionId || '').trim();
  normalized.dissatisfactionReason = String(normalized.dissatisfactionReason || '').trim();
  normalized.screenshots = Array.isArray(normalized.screenshots) ? normalized.screenshots : [];
  return normalized;
}

const batchOrderThemes = [
  { color: '#1d4ed8', bg: '#dbeafe', tint: '#dbeafe', border: '#60a5fa', hover: '#bfdbfe' },
  { color: '#047857', bg: '#d1fae5', tint: '#d1fae5', border: '#34d399', hover: '#bbf7d0' },
  { color: '#b45309', bg: '#fef3c7', tint: '#fef3c7', border: '#f59e0b', hover: '#fde68a' },
  { color: '#be123c', bg: '#ffe4e6', tint: '#ffe4e6', border: '#fb7185', hover: '#fecdd3' },
  { color: '#6d28d9', bg: '#ede9fe', tint: '#ede9fe', border: '#a78bfa', hover: '#ddd6fe' },
  { color: '#0f766e', bg: '#ccfbf1', tint: '#ccfbf1', border: '#2dd4bf', hover: '#99f6e4' },
  { color: '#c2410c', bg: '#ffedd5', tint: '#ffedd5', border: '#fb923c', hover: '#fed7aa' },
  { color: '#4338ca', bg: '#e0e7ff', tint: '#e0e7ff', border: '#818cf8', hover: '#c7d2fe' },
];

function batchOrderTheme(order) {
  const text = String(order || '');
  const match = text.match(/-(\d+)$/);
  if (match) {
    return batchOrderThemes[Number.parseInt(match[1], 10) % batchOrderThemes.length];
  }
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return batchOrderThemes[hash % batchOrderThemes.length];
}

function applyBatchOrderTheme(tr, order) {
  const theme = batchOrderTheme(order);
  tr.classList.add('batch-order-row');
  tr.style.setProperty('background-color', theme.tint, 'important');
  tr.style.setProperty('--batch-order-color', theme.color);
  tr.style.setProperty('--batch-order-bg', theme.bg);
  tr.style.setProperty('--batch-order-border', theme.border);
  tr.style.setProperty('--batch-order-hover', theme.hover);
  tr.style.setProperty('--batch-order-tint', theme.tint);
  return theme;
}

function paintBatchOrderRow(tr, orderCell, order) {
  const theme = applyBatchOrderTheme(tr, order);
  for (const cellNode of tr.children) {
    const td = cellNode;
    td.style.setProperty('background-color', theme.tint, 'important');
    td.style.setProperty('background-image', 'none', 'important');
    td.style.setProperty('border-color', theme.border, 'important');
    td.style.setProperty('border-top-color', theme.border, 'important');
    td.style.setProperty('border-bottom-color', theme.border, 'important');
    td.style.setProperty('color', theme.color, 'important');
    const textNode = td.querySelector('.session-cell-text');
    if (textNode) {
      textNode.style.setProperty('color', theme.color, 'important');
    }
  }
  orderCell.style.setProperty('background-color', theme.bg, 'important');
  orderCell.style.setProperty('color', theme.color, 'important');
  orderCell.style.setProperty('border-left', `7px solid ${theme.border}`, 'important');
  const orderText = orderCell.querySelector('.session-cell-text');
  if (orderText) {
    orderText.style.setProperty('background-color', theme.bg, 'important');
    orderText.style.setProperty('color', theme.color, 'important');
    orderText.style.setProperty('border', `1px solid ${theme.border}`, 'important');
  }
}

function sessionLogTraceText(row) {
  const logTrace = String(row?.logTrace || '').trim();
  if (!logTrace || isCompositeTraeSessionId(logTrace)) return '未找到真实日志轨迹文件/内容';
  if (logTrace.startsWith('[reconstructed: true]') || logTrace.startsWith('[reconstructed: unavailable]')) {
    return '未找到真实日志轨迹文件/内容';
  }
  if (logTrace.includes('source: local-trae-logs') || logTrace.includes('Core Timeline:')) {
    return '未找到真实日志轨迹文件/内容';
  }
  if (logTrace) return logTrace;
  return '未找到真实日志轨迹文件/内容';
}

function dissatisfactionReasonText(value) {
  const text = String(value || '').trim();
  if (!text || text === '-') return '产物不满意:';
  if (/^产物不满意[:：]/.test(text)) return text;
  return `产物不满意: ${text}`;
}

function spreadsheetColumnText(value) {
  return String(value || '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '-';
}

function makeSessionCopyCell(value, className, shorten = false, displayValue = '', maxChars = 90) {
  const td = document.createElement('td');
  td.className = className;
  const text = String(value || '-');
  const visibleText = String(displayValue || text || '-');
  const limit = Number.isFinite(maxChars) && maxChars > 0 ? maxChars : 90;
  const show = shorten && visibleText.length > limit ? `${visibleText.slice(0, limit)}...` : visibleText;
  const textEl = document.createElement('span');
  textEl.className = 'session-cell-text';
  textEl.textContent = show;
  textEl.title = displayValue ? `${visibleText}\n\n复制完整值：${text}` : text;
  const copyBtn = actionButton('复制', 'session-copy-button');
  copyBtn.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyText(text, copyBtn);
  });
  td.append(textEl, copyBtn);
  return td;
}

function sessionScreenshots(row) {
  return Array.isArray(row?.screenshots)
    ? row.screenshots.filter((item) => item && (item.url || item.resourceId || item.path))
    : [];
}

function rowsWithScreenshotsShiftedBack(rows) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const shiftedRows = sourceRows.map((row) => ({ ...row }));
  for (let index = 0; index < shiftedRows.length; index += 1) {
    const order = String(sourceRows[index]?.order || '').trim();
    const next = sourceRows[index + 1];
    const nextOrder = String(next?.order || '').trim();
    shiftedRows[index].screenshots = order && nextOrder === order
      ? sessionScreenshots(next)
      : [];
  }
  return shiftedRows;
}

function absoluteUrl(url) {
  const text = String(url || '').trim();
  if (!text) return '';
  try {
    return new URL(text, window.location.origin).href;
  } catch {
    return text;
  }
}

function screenshotColumnText(row) {
  const values = sessionScreenshots(row)
    .map((item) => absoluteUrl(item.url || item.path || item.resourceId))
    .filter(Boolean);
  return values.join(' ');
}

function screenshotHtmlItems(row) {
  return sessionScreenshots(row)
    .map((item) => ({
      src: absoluteUrl(item.url || item.path || item.resourceId),
      title: item.filename || item.resourceId || item.path || '截图',
    }))
    .filter((item) => item.src);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = src;
  });
}

async function loadScreenshotImages(row) {
  const screenshots = sessionScreenshots(row);
  const images = [];
  for (const item of screenshots) {
    const url = absoluteUrl(item.url || item.path || item.resourceId);
    if (!url) continue;
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;
      const blob = await response.blob();
      const type = blob.type || 'image/png';
      if (!type.startsWith('image/')) continue;
      images.push({
        blob: blob.type ? blob : new Blob([blob], { type }),
        type,
        dataUrl: await blobToDataUrl(blob),
        src: url,
        title: item.filename || item.resourceId || item.path || '截图',
      });
    } catch (error) {
      console.warn('读取截图失败:', error);
    }
  }
  return images;
}

async function composeImagesBlob(images) {
  const loaded = [];
  for (const image of images || []) {
    if (!image?.dataUrl) continue;
    try {
      loaded.push(await loadImageElement(image.dataUrl));
    } catch (error) {
      console.warn('合成截图时图片加载失败:', error);
    }
  }
  if (!loaded.length) return null;
  const maxWidth = Math.min(900, Math.max(...loaded.map((image) => image.naturalWidth || image.width || 1)));
  const gap = 12;
  const padding = 12;
  const sizes = loaded.map((image) => {
    const width = image.naturalWidth || image.width || 1;
    const height = image.naturalHeight || image.height || 1;
    const scale = Math.min(1, maxWidth / width);
    return {
      image,
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  });
  const canvas = document.createElement('canvas');
  canvas.width = maxWidth + padding * 2;
  canvas.height = sizes.reduce((total, item, index) => total + item.height + (index ? gap : 0), padding * 2);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let y = padding;
  for (const item of sizes) {
    const x = padding + Math.floor((maxWidth - item.width) / 2);
    ctx.drawImage(item.image, x, y, item.width, item.height);
    y += item.height + gap;
  }
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function writeScreenshotImagesToClipboard(images) {
  const validImages = (images || []).filter(Boolean);
  if (!validImages.length) {
    await navigator.clipboard.writeText('-');
    return 'empty';
  }
  if (!window.ClipboardItem) {
    throw new Error('当前浏览器不支持图片剪贴板写入');
  }
  if (validImages.length === 1) {
    const image = validImages[0];
    await navigator.clipboard.write([new ClipboardItem({ [image.type || 'image/png']: image.blob })]);
    return 'image';
  }
  const blob = await composeImagesBlob(validImages);
  if (!blob) {
    await navigator.clipboard.writeText('-');
    return 'empty';
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  return 'image';
}

function screenshotHtmlTable(rowImages, srcKey = 'src') {
  const rowsHtml = rowImages.map((images) => {
    const inner = images.length
      ? images.map((image) => {
        const src = image[srcKey] || image.dataUrl || image.src || '';
        return (
          `<img src="${escapeHtml(src)}" alt="${escapeHtml(image.title)}" ` +
          'style="max-width:220px;max-height:180px;display:inline-block;margin:2px;border:1px solid #d9d9d9;" />'
        );
      }).join('')
      : '&nbsp;';
    return `<tr><td>${inner}</td></tr>`;
  }).join('');
  return `<table style="border-collapse:collapse;"><tbody>${rowsHtml}</tbody></table>`;
}

function screenshotHtmlDocument(rowImages, srcKey = 'dataUrl') {
  const table = screenshotHtmlTable(rowImages, srcKey);
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>' +
    `<!--StartFragment-->${table}<!--EndFragment-->` +
    '</body></html>'
  );
}

function screenshotPlainTable(rowImages) {
  return rowImages.map((images) => (images.length ? ' ' : '-')).join('\n');
}

async function copyScreenshotRowsAsHtmlTable(rowImageItems) {
  if (!window.ClipboardItem) {
    throw new Error('当前浏览器不支持富文本剪贴板写入');
  }
  const rowImages = rowImageItems.map((item) => item.images || []);
  const html = screenshotHtmlDocument(rowImages, 'dataUrl');
  const plain = screenshotPlainTable(rowImages);
  await navigator.clipboard.write([new ClipboardItem({
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/plain': new Blob([plain], { type: 'text/plain' }),
  })]);
}

function waitForImages(root, timeoutMs = 1800) {
  const images = Array.from(root.querySelectorAll('img'));
  if (!images.length) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    let remaining = images.length;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) finish();
    };
    window.setTimeout(finish, timeoutMs);
    for (const img of images) {
      if (img.complete) {
        tick();
      } else {
        img.addEventListener('load', tick, { once: true });
        img.addEventListener('error', tick, { once: true });
      }
    }
  });
}

async function copyHtmlTableBySelection(html, waitForLoad = false) {
  const wrapper = document.createElement('div');
  wrapper.contentEditable = 'true';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = '900px';
  wrapper.style.background = '#fff';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  if (waitForLoad) await waitForImages(wrapper);
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(wrapper);
  selection.removeAllRanges();
  selection.addRange(range);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } finally {
    selection.removeAllRanges();
    wrapper.remove();
  }
  if (!ok) throw new Error('浏览器表格复制失败');
}

async function copyScreenshotRowsAsImages(rows, button) {
  const targetRows = Array.isArray(rows) ? rows : [];
  try {
    if (button) {
      button.dataset.originalLabel = button.dataset.originalLabel || button.textContent;
      button.textContent = '复制中';
    }
    const rowImages = [];
    const orderCounts = new Map();
    for (const row of targetRows) {
      const order = String(row?.order || activeSessionOrder || '').trim() || '-';
      const indexInOrder = (orderCounts.get(order) || 0) + 1;
      orderCounts.set(order, indexInOrder);
      rowImages.push({
        order,
        indexInOrder,
        images: await loadScreenshotImages(row),
      });
    }
    const imageCount = rowImages.reduce((total, item) => total + item.images.length, 0);
    if (!imageCount) {
      await copyText(targetRows.map(() => '-').join('\n') || '-', button);
      return;
    }

    if (targetRows.length > 1) {
      batchScreenshotCopyQueue = rowImages;
      batchScreenshotCopyIndex = 0;
      try {
        await copyScreenshotRowsAsHtmlTable(rowImages);
        markCopied(button);
        updateBatchScreenshotQueueStatus(
          `已复制批量截图表格：${rowImages.length} 行。如果飞书仍只进第一格，可用“复制下一张截图”逐行粘贴。`,
        );
        return;
      } catch (error) {
        console.warn('批量截图表格复制失败，改用逐张队列:', error);
        await copyNextBatchScreenshotQueueItem(button);
      }
      return;
    }

    await writeScreenshotImagesToClipboard(rowImages[0]?.images || []);
    markCopied(button);
  } catch (error) {
    console.error('复制截图失败:', error);
    markCopied(button, '失败');
  }
}

async function screenshotRowsForFeishuPaste(rows) {
  const targetRows = Array.isArray(rows) ? rows : [];
  const orderCounts = new Map();
  const prepared = [];
  for (const row of targetRows) {
    const order = String(row?.order || activeSessionOrder || '').trim() || '-';
    const indexInOrder = (orderCounts.get(order) || 0) + 1;
    orderCounts.set(order, indexInOrder);
    const screenshots = sessionScreenshots(row);
    const imagePaths = screenshots
      .map((item) => String(item.path || '').trim())
      .filter(Boolean);
    prepared.push({
      order,
      indexInOrder,
      imagePaths,
      imageCount: imagePaths.length,
    });
  }
  return prepared;
}

async function rowsForFeishuBatchPaste(rows) {
  const targetRows = Array.isArray(rows) ? rows : [];
  const orderCounts = new Map();
  const prepared = [];
  for (const row of targetRows) {
    const order = String(row?.order || activeSessionOrder || '').trim() || '-';
    const indexInOrder = (orderCounts.get(order) || 0) + 1;
    orderCounts.set(order, indexInOrder);
    const screenshots = sessionScreenshots(row);
    const imagePaths = screenshots
      .map((item) => String(item.path || '').trim())
      .filter(Boolean);
    prepared.push({
      order,
      indexInOrder,
      sessionId: spreadsheetColumnText(sessionColumnText(row)),
      conversation: spreadsheetColumnText(row?.conversation || ''),
      dissatisfactionReason: spreadsheetColumnText(dissatisfactionReasonText(row?.dissatisfactionReason)),
      logTrace: spreadsheetColumnText(sessionLogTraceText(row)),
      imagePaths,
      imageCount: imagePaths.length,
    });
  }
  return prepared;
}

async function pasteBatchScreenshotsToFeishu() {
  if (!pasteBatchScreenshotsToFeishuButton) return;
  const rows = batchRowsForColumnCopy();
  if (!rows.length) {
    setBatchSessionRefreshStatus('当前批量列表没有可粘贴行', true);
    return;
  }
  batchPasteInProgress = true;
  pasteBatchScreenshotsToFeishuButton.disabled = true;
  pasteBatchScreenshotsToFeishuButton.dataset.originalLabel = pasteBatchScreenshotsToFeishuButton.dataset.originalLabel || pasteBatchScreenshotsToFeishuButton.textContent;
  pasteBatchScreenshotsToFeishuButton.textContent = '准备图片';
  try {
    setBatchSessionRefreshStatus(`正在准备 ${rows.length} 行截图路径，请保持飞书目标单元格已选中`);
    const preparedRows = await screenshotRowsForFeishuPaste(rows);
    const imageRows = preparedRows.filter((row) => Array.isArray(row.imagePaths) && row.imagePaths.length).length;
    pasteBatchScreenshotsToFeishuButton.textContent = '粘贴中';
    const requestBody = {
      rows: preparedRows,
      delay_ms: 1600,
    };
    const response = await fetch('/api/paste-feishu-screenshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '自动粘贴失败');
    setBatchSessionRefreshStatus(`已自动粘贴 ${payload.pasted || 0} 张图片，跳过空行 ${payload.empty || 0} 行，共 ${payload.total || rows.length} 行`);
    markCopied(pasteBatchScreenshotsToFeishuButton, imageRows ? '已粘贴' : '无图片');
  } catch (error) {
    console.error('自动粘贴截图列失败:', error);
    setBatchSessionRefreshStatus(`自动粘贴失败：${error.message || error}`, true);
    window.alert(`自动粘贴截图列失败：${error.message || error}`);
    markCopied(pasteBatchScreenshotsToFeishuButton, '失败');
  } finally {
    batchPasteInProgress = false;
    pasteBatchScreenshotsToFeishuButton.disabled = false;
    scheduleAutoBatchMissingCheck(autoBatchMissingEnabled ? 3000 : 0);
  }
}

async function pasteBatchAllToFeishu() {
  if (!pasteBatchAllToFeishuButton) return;
  const rows = batchRowsForColumnCopy();
  if (!rows.length) {
    setBatchSessionRefreshStatus('当前批量列表没有可粘贴行', true);
    return;
  }
  batchPasteInProgress = true;
  pasteBatchAllToFeishuButton.disabled = true;
  pasteBatchAllToFeishuButton.dataset.originalLabel = pasteBatchAllToFeishuButton.dataset.originalLabel || pasteBatchAllToFeishuButton.textContent;
  pasteBatchAllToFeishuButton.textContent = '粘贴中';
  try {
    setBatchSessionRefreshStatus(`正在自动粘贴 ${rows.length} 行：请确认飞书“Session”第一行单元格已选中`);
    const preparedRows = await rowsForFeishuBatchPaste(rows);
    const response = await fetch('/api/paste-feishu-batch-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: preparedRows,
        delay_ms: 1400,
      }),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '自动粘贴失败');
    setBatchSessionRefreshStatus(
      `已自动粘贴：Session、会话、不满意原因、序号、日志轨迹和截图；文本列 ${payload.textColumns || 0}，图片 ${payload.screenshots?.pasted || 0}，空截图 ${payload.screenshots?.empty || 0}`,
    );
    markCopied(pasteBatchAllToFeishuButton, '已粘贴');
  } catch (error) {
    console.error('自动粘贴主要列失败:', error);
    setBatchSessionRefreshStatus(`自动粘贴主要列失败：${error.message || error}`, true);
    window.alert(`自动粘贴主要列失败：${error.message || error}`);
    markCopied(pasteBatchAllToFeishuButton, '失败');
  } finally {
    batchPasteInProgress = false;
    pasteBatchAllToFeishuButton.disabled = false;
    scheduleAutoBatchMissingCheck(autoBatchMissingEnabled ? 3000 : 0);
  }
}

function makeScreenshotCell(row) {
  const td = document.createElement('td');
  td.className = 'session-screenshot-cell';
  const screenshots = sessionScreenshots(row);
  if (!screenshots.length) {
    const textEl = document.createElement('span');
    textEl.className = 'session-cell-text screenshot-empty-text';
    textEl.textContent = '-';
    td.appendChild(textEl);
  } else {
    const imageWrap = document.createElement('div');
    imageWrap.className = `session-screenshot-wrap${screenshots.length > 1 ? ' is-multiple' : ''}`;
    imageWrap.title = screenshots.length > 1 ? `共 ${screenshots.length} 张截图` : '';
    for (const [index, screenshot] of screenshots.entries()) {
      if (screenshot.url) {
        const img = document.createElement('img');
        img.className = 'session-screenshot-thumb';
        img.src = screenshot.url;
        img.alt = `截图 ${index + 1}`;
        img.loading = 'lazy';
        img.title = screenshot.resourceId || screenshot.path || `截图 ${index + 1}`;
        imageWrap.appendChild(img);
      } else {
        const badge = document.createElement('span');
        badge.className = 'session-screenshot-badge';
        badge.textContent = `图${index + 1}`;
        badge.title = screenshot.resourceId || '';
        imageWrap.appendChild(badge);
      }
    }
    td.appendChild(imageWrap);
  }
  const copyBtn = actionButton('复制', 'session-copy-button');
  copyBtn.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyScreenshotRowsAsImages([row], copyBtn);
  });
  td.appendChild(copyBtn);
  return td;
}

function renderSessionRows(payload) {
  if (!sessionRows || !sessionMeta) return;
  sessionRows.innerHTML = '';
  if (payload?.loading) {
    currentSessionRows = [];
    sessionMeta.textContent = `序号: ${payload?.order || '-'} | 读取本地缓存中...`;
    const tr = document.createElement('tr');
    tr.append(
      cell('-', 'session-id-cell'),
      cell('读取中，请稍候', 'session-conv-cell'),
      cell('-', 'session-reason-cell'),
      cell('-', 'session-log-cell'),
    );
    sessionRows.appendChild(tr);
    return;
  }
  const rows = Array.isArray(payload?.rows) ? payload.rows.map(normalizeSessionRow) : [];
  currentSessionRows = rows;
  const cacheText = payload?.cached
    ? ` | 已缓存${payload?.refreshedAt ? `: ${payload.refreshedAt}` : ''}${payload?.traceTimedOut ? ' | 日志仍在拉取' : ''}`
    : ' | 未刷新';
  sessionMeta.textContent = `序号: ${payload?.order || '-'} | 轮次: ${rows.length} | 当前会话: ${payload?.sessionId || '-'}${cacheText}`;
  if (!rows.length) {
    const tr = document.createElement('tr');
    const emptyText = payload?.justRefreshed
      ? '精准刷新完成，但没有匹配到真实 create message；未写 miss 或假 sessionId'
      : (payload?.cached ? '暂无会话输入记录' : '暂无本地缓存，请先点击该项目操作列的刷新按钮');
    tr.append(cell('-', ''), cell(emptyText, ''), cell('-', ''), cell('-', ''));
    sessionRows.appendChild(tr);
    return;
  }
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.append(
      makeSessionCopyCell(sessionColumnText(row), 'session-id-cell'),
      makeSessionCopyCell(row.conversation || '', 'session-conv-cell', true),
      makeSessionCopyCell(dissatisfactionReasonText(row.dissatisfactionReason), 'session-reason-cell', true),
      makeSessionCopyCell(sessionLogTraceText(row), 'session-log-cell', true),
    );
    sessionRows.appendChild(tr);
  }
}

function renderBatchSessionRows(payload) {
  if (!batchSessionRows || !batchSessionMeta) return;
  batchSessionRows.innerHTML = '';
  batchScreenshotCopyQueue = [];
  batchScreenshotCopyIndex = 0;
  if (copyNextBatchScreenshotButton) {
    copyNextBatchScreenshotButton.hidden = true;
    copyNextBatchScreenshotButton.disabled = true;
  }
  const rawRows = Array.isArray(payload?.rows) ? payload.rows.map(normalizeSessionRow) : [];
  const rows = rowsWithScreenshotsShiftedBack(rawRows);
  currentBatchSessionRows = rows;
  const groupName = payload?.groupName || currentBatchGroupName() || '-';
  if (
    batchMissingRefreshInProgress
    && batchMissingRefreshActiveGroup
    && !batchMissingRefreshActiveGroup.startsWith('auto:')
    && batchMissingRefreshActiveGroup !== groupName
  ) {
    batchMissingRefreshRunId += 1;
    batchMissingRefreshInProgress = false;
    batchMissingRefreshActiveGroup = '';
    if (refreshBatchMissingSessionsButton) refreshBatchMissingSessionsButton.disabled = false;
    if (autoBatchMissingSessionsButton) autoBatchMissingSessionsButton.disabled = false;
    setBatchSessionRefreshStatus('');
  }
  const orders = normalizeBatchOrders(payload?.orders || currentBatchSessionOrders || []);
  currentBatchSessionOrders = orders;
  currentBatchSessionGroupName = groupName;
  batchSessionMeta.textContent = `组: ${groupName} | 项目: ${orders.length || payload?.orders?.length || 0} | 记录: ${rows.length}`;
  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.append(
      cell('-', 'session-order-cell'),
      cell('-', 'session-id-cell'),
      cell('暂无批量会话数据', 'session-conv-cell'),
      cell('-', 'session-reason-cell'),
      cell('-', 'session-trace-order-cell'),
      cell('-', 'session-screenshot-cell'),
      cell('-', 'session-log-cell'),
    );
    batchSessionRows.appendChild(tr);
    return;
  }
  for (const row of rows) {
    const tr = document.createElement('tr');
    const orderCell = makeSessionCopyCell(row.order || '-', 'session-order-cell');
    orderCell.classList.add('batch-order-cell');
    tr.append(
      orderCell,
      makeSessionCopyCell(sessionColumnText(row), 'session-id-cell batch-session-id-cell'),
      makeSessionCopyCell(row.conversation || '', 'session-conv-cell', true),
      makeSessionCopyCell(dissatisfactionReasonText(row.dissatisfactionReason), 'session-reason-cell', true),
      makeSessionCopyCell(row.order || '-', 'session-trace-order-cell'),
      makeScreenshotCell(row),
      makeSessionCopyCell(sessionLogTraceText(row), 'session-log-cell', true),
    );
    paintBatchOrderRow(tr, orderCell, row.order);
    batchSessionRows.appendChild(tr);
  }
}

function setBatchSessionRefreshStatus(text, isError = false) {
  if (!batchSessionRefreshStatus) return;
  batchSessionRefreshStatus.textContent = text || '';
  batchSessionRefreshStatus.classList.toggle('error', Boolean(isError));
}

function updateBatchScreenshotQueueStatus(text = '', isError = false) {
  setBatchSessionRefreshStatus(text, isError);
  if (!copyNextBatchScreenshotButton) return;
  const hasNext = batchScreenshotCopyIndex < batchScreenshotCopyQueue.length;
  copyNextBatchScreenshotButton.hidden = !hasNext;
  copyNextBatchScreenshotButton.disabled = !hasNext;
  if (hasNext) {
    copyNextBatchScreenshotButton.textContent = `复制下一张截图 ${batchScreenshotCopyIndex + 1}/${batchScreenshotCopyQueue.length}`;
  } else {
    copyNextBatchScreenshotButton.textContent = '复制下一张截图';
  }
}

async function copyNextBatchScreenshotQueueItem(button = copyNextBatchScreenshotButton) {
  if (batchScreenshotCopyIndex >= batchScreenshotCopyQueue.length) {
    updateBatchScreenshotQueueStatus('截图队列已复制完成');
    return;
  }
  const item = batchScreenshotCopyQueue[batchScreenshotCopyIndex];
  const isQueueButton = button === copyNextBatchScreenshotButton;
  try {
    if (button) {
      button.dataset.originalLabel = button.dataset.originalLabel || button.textContent;
      button.textContent = '复制中';
      button.disabled = true;
    }
    const kind = await writeScreenshotImagesToClipboard(item.images);
    batchScreenshotCopyIndex += 1;
    const copiedText = kind === 'empty' ? '空截图占位' : '图片';
    updateBatchScreenshotQueueStatus(
      `已复制 ${batchScreenshotCopyIndex}/${batchScreenshotCopyQueue.length}：${item.order} 第 ${item.indexInOrder} 轮 ${copiedText}，粘贴后点“复制下一张截图”`,
    );
    if (!isQueueButton) markCopied(button);
  } catch (error) {
    console.error('复制队列截图失败:', error);
    updateBatchScreenshotQueueStatus(`复制截图失败：${error.message || error}`, true);
    if (!isQueueButton) markCopied(button, '失败');
  } finally {
    if (button) {
      if (isQueueButton) {
        button.disabled = batchScreenshotCopyIndex >= batchScreenshotCopyQueue.length;
      } else {
        button.disabled = false;
      }
    }
  }
}

function batchSessionRowCounts(rows = currentBatchSessionRows) {
  const counts = new Map();
  for (const row of rows || []) {
    const order = String(row?.order || '').trim();
    if (!order) continue;
    const sessionId = String(row?.sessionId || '').trim();
    const conversation = String(row?.conversation || '').trim();
    if (!sessionId || sessionId === '-' || conversation.startsWith('读取失败:')) continue;
    counts.set(order, (counts.get(order) || 0) + 1);
  }
  return counts;
}

function batchCopyLimit() {
  return targetRoundCount();
}

function batchRowsForColumnCopy(rows = currentBatchSessionRows) {
  const limit = batchCopyLimit();
  if (!Number.isFinite(limit)) return Array.isArray(rows) ? rows : [];
  const counts = new Map();
  const selected = [];
  for (const row of rows || []) {
    const order = String(row?.order || '').trim() || '__missing_order__';
    const nextCount = (counts.get(order) || 0) + 1;
    counts.set(order, nextCount);
    if (nextCount <= limit) selected.push(row);
  }
  return selected;
}

async function fetchSessionRowsForOrder(order) {
  try {
    const response = await fetchWithTimeout(`/api/trae-session-rounds?order=${encodeURIComponent(order)}`, { cache: 'no-store' });
    const payload = await response.json();
    if (payload.ok) {
      return (Array.isArray(payload.rows) ? payload.rows : []).map((row) => ({
        order,
        sessionId: row.sessionId || payload.sessionId || '-',
        rawSessionId: row.rawSessionId || '',
        logTraceId: row.logTraceId || '',
        sessionComposite: row.sessionComposite || '',
        dissatisfactionReason: row.dissatisfactionReason || '-',
        conversation: row.conversation || '',
        logTrace: row.logTrace || '',
        screenshots: Array.isArray(row.screenshots) ? row.screenshots : [],
      }));
    }
    return [{
      order,
      sessionId: '-',
      rawSessionId: '',
      dissatisfactionReason: '-',
      conversation: `读取失败: ${payload.error || 'unknown'}`,
      logTrace: '',
      screenshots: [],
    }];
  } catch (error) {
    return [{
      order,
      sessionId: '-',
      rawSessionId: '',
      dissatisfactionReason: '-',
      conversation: `读取失败: ${error.message || error}`,
      logTrace: '',
      screenshots: [],
    }];
  }
}

async function fetchBatchRowsForOrders(groupName, orders) {
  const orderResults = new Array((orders || []).length).fill(null);
  const flattenResults = () => orderResults.flatMap((item) => Array.isArray(item) ? item : []);
  await runWithConcurrency(orders || [], 6, async (order, index) => {
    const rowsForOrder = await fetchSessionRowsForOrder(order);
    orderResults[index] = rowsForOrder;
    renderBatchSessionRows({ groupName, orders, rows: flattenResults() });
    return rowsForOrder;
  });
  return flattenResults();
}

async function reloadBatchSessionsIfOrderVisible(order) {
  const targetOrder = String(order || '').trim();
  if (!targetOrder || !batchSessionModal?.open || !currentBatchSessionOrders.length) return;
  if (!currentBatchSessionOrders.includes(targetOrder)) return;
  const groupName = currentBatchSessionGroupName || currentBatchGroupName();
  setBatchSessionRefreshStatus(`正在同步批量列表：${targetOrder}`);
  try {
    const results = await fetchBatchRowsForOrders(groupName, currentBatchSessionOrders);
    renderBatchSessionRows({ groupName, orders: currentBatchSessionOrders, rows: results });
    setBatchSessionRefreshStatus(`批量列表已同步：${targetOrder}`);
  } catch (error) {
    console.warn('同步批量会话列表失败:', error);
    setBatchSessionRefreshStatus(`批量列表同步失败：${error.message || error}`, true);
  }
}

function updateSessionNavState() {
  if (!sessionPrevButton || !sessionNextButton) return;
  const index = sessionOrderList.indexOf(activeSessionOrder);
  sessionPrevButton.disabled = index <= 0;
  sessionNextButton.disabled = index < 0 || index >= sessionOrderList.length - 1;
}

async function copySessionColumn(field, button) {
  if (field === 'logTrace') {
    const values = currentSessionRows.map((row) => spreadsheetColumnText(sessionLogTraceText(row)));
    await copyText(values.join('\n'), button);
    return;
  }
  const values = currentSessionRows.map((row) => {
    if (field === 'sessionId') return sessionColumnText(row);
    if (field === 'dissatisfactionReason') return dissatisfactionReasonText(row?.[field]);
    return String(row?.[field] || '').trim();
  });
  await copyText(values.map(spreadsheetColumnText).join('\n'), button);
}

async function copyBatchColumn(field, button) {
  const rows = batchRowsForColumnCopy();
  if (field === 'logTrace') {
    const values = rows.map((row) => spreadsheetColumnText(sessionLogTraceText(row)));
    await copyText(values.join('\n'), button);
    return;
  }
  if (field === 'screenshot') {
    await copyScreenshotRowsAsImages(rows, button);
    return;
  }
  const values = rows.map((row) => {
    if (field === 'sessionId') return sessionColumnText(row);
    if (field === 'dissatisfactionReason') return dissatisfactionReasonText(row?.[field]);
    return String(row?.[field] || '').trim();
  });
  await copyText(values.map(spreadsheetColumnText).join('\n'), button);
}

async function showSessionModal(order) {
  if (!sessionModal) return;
  const targetOrder = String(order || '').trim();
  const requestId = ++sessionLoadRequestId;
  if (activeSessionFetchController) activeSessionFetchController.abort();
  const controller = new AbortController();
  activeSessionFetchController = controller;
  activeSessionOrder = targetOrder;
  updateSessionNavState();
  renderSessionRows({ order: targetOrder, loading: true });
  if (!sessionModal.open) sessionModal.showModal();
  const timeout = window.setTimeout(() => controller.abort(), sessionFetchTimeoutMs);
  try {
    const response = await fetch(`/api/trae-session-rounds?order=${encodeURIComponent(targetOrder)}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '读取失败');
    if (requestId !== sessionLoadRequestId || activeSessionOrder !== targetOrder) return;
    renderSessionRows(payload);
    updateSessionNavState();
  } catch (error) {
    if (error?.name === 'AbortError' && requestId !== sessionLoadRequestId) return;
    if (requestId !== sessionLoadRequestId || activeSessionOrder !== targetOrder) return;
    renderSessionRows({
      order: targetOrder,
      rows: [{
        sessionId: '-',
        rawSessionId: '',
        dissatisfactionReason: '-',
        conversation: error?.name === 'AbortError' ? '读取超时或已切换序号，请重试' : `读取失败: ${error.message || error}`,
        logTrace: '-',
      }],
      sessionId: '-',
    });
    updateSessionNavState();
  } finally {
    window.clearTimeout(timeout);
    if (activeSessionFetchController === controller) activeSessionFetchController = null;
  }
}

async function openSessionByOrder(order) {
  await showSessionModal(order);
}

function collectBatchOrders() {
  const groupName = currentBatchGroupName();
  const explicitOrders = normalizeBatchOrders(parseBatchOrders());
  if (explicitOrders.length) return { groupName, orders: explicitOrders };
  const groupOrders = normalizeBatchOrders(batchGroups[groupName] || []);
  return { groupName, orders: groupOrders };
}

async function openBatchSessions() {
  if (!batchSessionModal) return;
  const { groupName, orders } = collectBatchOrders();
  if (!orders.length) {
    setBatchStatus('当前组没有项目', true);
    return;
  }
  renderBatchSessionRows({ groupName, orders, rows: [] });
  if (!batchSessionModal.open) batchSessionModal.showModal();
  setBatchStatus(`批量会话加载中：${orders.join(',')}`);
  setBatchSessionRefreshStatus('');
  try {
    const results = await fetchBatchRowsForOrders(groupName, orders);
    renderBatchSessionRows({ groupName, orders, rows: results });
    setBatchStatus(`批量会话已加载：${results.length} 条`);
  } catch (error) {
    renderBatchSessionRows({
      groupName,
      orders,
      rows: [{
        order: '-',
        sessionId: '-',
        rawSessionId: '',
        dissatisfactionReason: '-',
        conversation: `读取失败: ${error.message || error}`,
        logTrace: '',
      }],
    });
    setBatchStatus(`批量会话读取失败：${error.message || error}`, true);
  }
}

async function moveSessionOrder(step) {
  const index = sessionOrderList.indexOf(activeSessionOrder);
  const nextOrder = sessionOrderList[index + step];
  if (!nextOrder) return;
  renderSessionRows({ order: nextOrder, loading: true });
  activeSessionOrder = nextOrder;
  updateSessionNavState();
  await openSessionByOrder(nextOrder);
}

function sessionRefreshButtonsForOrder(order) {
  const targetOrder = String(order || '').trim();
  return Array.from(document.querySelectorAll('[data-session-refresh-order]'))
    .filter((button) => button.dataset.sessionRefreshOrder === targetOrder);
}

function applySessionRefreshButtonState(button, state) {
  if (!button) return;
  button.classList.remove('session-refresh-loading', 'session-refresh-success', 'session-refresh-error', 'session-refresh-empty');
  if (state === 'loading') {
    button.disabled = true;
    button.textContent = '…';
    button.classList.add('session-refresh-loading');
  } else if (state === 'success') {
    button.disabled = true;
    button.textContent = '✓';
    button.classList.add('session-refresh-success');
  } else if (state === 'error') {
    button.disabled = true;
    button.textContent = '!';
    button.classList.add('session-refresh-error');
  } else if (state === 'empty') {
    button.disabled = false;
    button.textContent = '↻';
    button.classList.add('session-refresh-empty');
  } else {
    button.disabled = false;
    button.textContent = '↻';
  }
}

function setSessionRefreshButtonState(order, state) {
  const buttons = sessionRefreshButtonsForOrder(order);
  for (const button of buttons) {
    applySessionRefreshButtonState(button, state);
  }
}

function clearSessionRefreshPoll(order) {
  const targetOrder = String(order || '').trim();
  const timer = sessionRefreshPollTimers.get(targetOrder);
  if (timer) {
    window.clearTimeout(timer);
    sessionRefreshPollTimers.delete(targetOrder);
  }
}

function scheduleSessionRefreshPoll(order) {
  const targetOrder = String(order || '').trim();
  if (!targetOrder || !refreshingSessionOrders.has(targetOrder)) return;
  clearSessionRefreshPoll(targetOrder);
  const timer = window.setTimeout(() => {
    refreshSessionCache(targetOrder, null, { poll: true });
  }, 2500);
  sessionRefreshPollTimers.set(targetOrder, timer);
}

async function refreshSessionCache(order, button, options = {}) {
  const targetOrder = String(order || '').trim();
  if (!targetOrder) return;
  const isPoll = Boolean(options.poll);
  if (!isPoll) refreshingSessionOrders.add(targetOrder);
  setSessionRefreshButtonState(targetOrder, 'loading');
  setBatchStatus(isPoll ? `继续拉取会话缓存：${targetOrder}` : `刷新会话缓存：${targetOrder}`);
  const isTargetSessionOpen = () => sessionModal?.open && activeSessionOrder === targetOrder;
  if (isTargetSessionOpen() && !isPoll) {
    renderSessionRows({ order: targetOrder, loading: true });
  }
  try {
    const response = await fetchWithTimeout('/api/refresh-trae-session-rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: targetOrder, force: !isPoll }),
    }, 0);
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.busy ? '刷新繁忙，请稍后再点' : (payload.error || '刷新失败'));
    const queuedText = payload.queued ? '，复用队列任务' : '';
    if (payload.refreshPending) {
      if (isTargetSessionOpen() && payload.order === targetOrder && Array.isArray(payload.rows) && payload.rows.length > 0) {
        renderSessionRows(payload);
      }
      setBatchStatus(`正在后台拉取：${targetOrder}${queuedText}`);
      scheduleSessionRefreshPoll(targetOrder);
      return;
    }
    if (isTargetSessionOpen() && payload.order === targetOrder) {
      renderSessionRows({ ...payload, justRefreshed: true });
      updateSessionNavState();
    }
    await reloadBatchSessionsIfOrderVisible(targetOrder);
    clearSessionRefreshPoll(targetOrder);
    let rowCount = Array.isArray(payload.rows) ? payload.rows.length : 0;
    if (payload.refreshNoNewRows) {
      setBatchStatus(`本次未拉到新会话：${targetOrder}，保留现有缓存`, true);
      setSessionRefreshButtonState(targetOrder, 'empty');
      setTimeout(() => {
        refreshingSessionOrders.delete(targetOrder);
        setSessionRefreshButtonState(targetOrder, 'idle');
      }, 1400);
      return;
    }
    if (payload.order === targetOrder && rowCount === 0) {
      try {
        const verifyResponse = await fetchWithTimeout(`/api/trae-session-rounds?order=${encodeURIComponent(targetOrder)}`, { cache: 'no-store' });
        const verifyPayload = await verifyResponse.json();
        if (verifyPayload.ok) {
          rowCount = Array.isArray(verifyPayload.rows) ? verifyPayload.rows.length : 0;
          if (isTargetSessionOpen()) {
            renderSessionRows({ ...verifyPayload, justRefreshed: true });
            updateSessionNavState();
          }
          await reloadBatchSessionsIfOrderVisible(targetOrder);
        }
      } catch (verifyError) {
        console.warn('刷新后复核会话缓存失败:', verifyError);
      }
    }
    setSessionRefreshButtonState(targetOrder, rowCount > 0 ? 'success' : 'empty');
    setBatchStatus(rowCount > 0 ? `刷新完成：${targetOrder}${queuedText}` : `刷新完成但无真实会话行：${targetOrder}${queuedText}`);
    setTimeout(() => {
      refreshingSessionOrders.delete(targetOrder);
      setSessionRefreshButtonState(targetOrder, 'idle');
    }, 900);
  } catch (error) {
    console.error('刷新会话缓存失败:', error);
    clearSessionRefreshPoll(targetOrder);
    setSessionRefreshButtonState(targetOrder, 'error');
    if (isTargetSessionOpen()) {
      renderSessionRows({
        order: targetOrder,
        rows: [{ sessionId: '-', conversation: `刷新失败: ${error.message || error}`, logTrace: '-' }],
        sessionId: '-',
      });
    }
    setTimeout(() => {
      refreshingSessionOrders.delete(targetOrder);
      setSessionRefreshButtonState(targetOrder, 'idle');
    }, 1400);
  }
}

function sessionPayloadRowCount(payload) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  return sessionRowsValidCount(rows);
}

function sessionRowsValidCount(rows) {
  let count = 0;
  for (const row of rows) {
    const sessionId = String(row?.sessionId || '').trim();
    const conversation = String(row?.conversation || '').trim();
    if (!sessionId || sessionId === '-' || conversation.startsWith('读取失败:')) continue;
    count += 1;
  }
  return count;
}

async function refreshMissingSessionOrder(order, threshold, options = {}) {
  const targetOrder = String(order || '').trim();
  const startedAt = Date.now();
  const maxWaitMs = Math.max(30000, Number.parseInt(String(options.maxWaitMs || 180000), 10) || 180000);
  const requestTimeoutMs = Math.max(10000, Number.parseInt(String(options.requestTimeoutMs || sessionRefreshTimeoutMs), 10) || sessionRefreshTimeoutMs);
  let lastPayload = null;
  const report = (text) => {
    if (typeof options.onProgress === 'function') options.onProgress(targetOrder, text);
    else setBatchSessionRefreshStatus(text);
  };
  setSessionRefreshButtonState(targetOrder, 'loading');
  refreshingSessionOrders.add(targetOrder);
  try {
    while (Date.now() - startedAt < maxWaitMs) {
      if (typeof options.isActive === 'function' && !options.isActive()) {
        return { payload: lastPayload, rowCount: sessionPayloadRowCount(lastPayload), complete: false, cancelled: true };
      }
      const response = await fetchWithTimeout('/api/refresh-trae-session-rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: targetOrder, force: true, discover: true }),
      }, requestTimeoutMs);
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.busy ? '刷新繁忙，请稍后再点' : (payload.error || '刷新失败'));
      lastPayload = payload;
      const rowCount = sessionPayloadRowCount(payload);
      if (payload.refreshPending) {
        const expectedText = payload.expectedRows ? `，预计 ${payload.expectedRows}` : '';
        report(`后台发现轮次中：${targetOrder} 当前 ${rowCount}/${threshold}${expectedText}`);
        await sleep(2500);
        continue;
      }
      if (rowCount >= threshold) {
        setSessionRefreshButtonState(targetOrder, 'success');
        return { payload, rowCount, complete: true };
      }
      if (payload.deepScan) {
        setSessionRefreshButtonState(targetOrder, rowCount > 0 ? 'success' : 'empty');
        return { payload, rowCount, complete: true };
      }
      report(`继续发现轮次：${targetOrder} 当前 ${rowCount}/${threshold}`);
      await sleep(700);
    }
    setSessionRefreshButtonState(targetOrder, 'empty');
    return { payload: lastPayload, rowCount: sessionPayloadRowCount(lastPayload), complete: false };
  } finally {
    refreshingSessionOrders.delete(targetOrder);
    window.setTimeout(() => setSessionRefreshButtonState(targetOrder, 'idle'), 1200);
  }
}

async function refreshBatchMissingSessions(options = {}) {
  if (!refreshBatchMissingSessionsButton) return;
  const threshold = syncTargetRoundInputs(targetRoundCount());
  if (!Number.isInteger(threshold) || threshold <= 0) {
    setBatchSessionRefreshStatus('请输入大于 0 的最低记录数', true);
    return;
  }
  const { groupName, orders: collectedOrders } = collectBatchOrders();
  const refreshGroupName = currentBatchSessionGroupName || groupName || '-';
  if (batchMissingRefreshInProgress) {
    if (!batchMissingRefreshActiveGroup || batchMissingRefreshActiveGroup === refreshGroupName) {
      if (!options.auto) setBatchSessionRefreshStatus(`已有未达标刷新正在进行中：${batchMissingRefreshActiveGroup || refreshGroupName}`);
      return false;
    }
    batchMissingRefreshRunId += 1;
    batchMissingRefreshInProgress = false;
    batchMissingRefreshActiveGroup = '';
  }
  const orders = normalizeBatchOrders(currentBatchSessionOrders.length ? currentBatchSessionOrders : collectedOrders);
  if (!orders.length) {
    setBatchSessionRefreshStatus('当前组没有项目', true);
    return;
  }
  const counts = batchSessionRowCounts();
  const missingOrders = orders.filter((order) => (counts.get(order) || 0) < threshold);
  if (!missingOrders.length) {
    setBatchSessionRefreshStatus(`全部项目已达到 ${threshold} 条`);
    return;
  }

  batchMissingRefreshInProgress = true;
  batchMissingRefreshActiveGroup = refreshGroupName;
  const runId = ++batchMissingRefreshRunId;
  const isCurrentRun = () => batchMissingRefreshRunId === runId && batchMissingRefreshActiveGroup === refreshGroupName;
  const setRunStatus = (text, isError = false) => {
    if (isCurrentRun()) setBatchSessionRefreshStatus(text, isError);
  };
  refreshBatchMissingSessionsButton.disabled = true;
  if (autoBatchMissingSessionsButton) autoBatchMissingSessionsButton.disabled = true;
  const progress = new Map(missingOrders.map((order) => [order, '等待']));
  const summarizeProgress = () => {
    if (!isCurrentRun()) return;
    const finished = Array.from(progress.values()).filter((value) => value.startsWith('完成') || value.startsWith('失败')).length;
    const running = missingOrders
      .filter((order) => {
        const value = progress.get(order) || '';
        return value && !value.startsWith('等待') && !value.startsWith('完成') && !value.startsWith('失败');
      })
      .slice(0, 3);
    const runningText = running.length ? `；进行中：${running.join(', ')}` : '';
    setRunStatus(`${options.auto ? '自动检测' : '并行刷新'} ${finished}/${missingOrders.length}${runningText}`);
  };
  setRunStatus(`待刷新 ${missingOrders.length} 项，并行上限 3：${missingOrders.join(', ')}`);
  try {
    await runWithConcurrency(missingOrders, 3, async (order) => {
      if (!isCurrentRun()) return { cancelled: true, rowCount: counts.get(order) || 0 };
      const beforeCount = counts.get(order) || 0;
      progress.set(order, `启动 ${beforeCount}/${threshold}`);
      summarizeProgress();
      try {
        const result = await refreshMissingSessionOrder(order, threshold, {
          maxWaitMs: options.auto ? 90000 : 180000,
          requestTimeoutMs: sessionRefreshTimeoutMs,
          isActive: isCurrentRun,
          onProgress: (_, text) => {
            if (!isCurrentRun()) return;
            progress.set(order, text);
            summarizeProgress();
          },
        });
        if (result?.cancelled) return result;
        progress.set(order, `完成 ${result.rowCount}/${threshold}`);
        summarizeProgress();
        return result;
      } catch (error) {
        progress.set(order, `失败 ${error.message || error}`);
        summarizeProgress();
        throw error;
      }
    });
    if (!isCurrentRun()) return false;
    setRunStatus('已发起未达标项目刷新，正在重新读取批量会话...');
    const results = await fetchBatchRowsForOrders(currentBatchSessionGroupName || groupName, orders);
    if (!isCurrentRun()) return false;
    renderBatchSessionRows({ groupName: currentBatchSessionGroupName || groupName, orders, rows: results });
    const nextCounts = batchSessionRowCounts(results);
    const stillMissing = orders.filter((order) => (nextCounts.get(order) || 0) < threshold);
    setRunStatus(
      stillMissing.length
        ? `已刷新一次，仍未达标：${stillMissing.join(', ')}`
        : `刷新完成，全部达到 ${threshold} 条`,
      stillMissing.length > 0,
    );
  } catch (error) {
    setRunStatus(`批量刷新失败：${error.name === 'AbortError' ? '请求超时' : (error.message || error)}`, true);
  } finally {
    if (isCurrentRun()) {
      batchMissingRefreshInProgress = false;
      batchMissingRefreshActiveGroup = '';
      refreshBatchMissingSessionsButton.disabled = false;
      if (autoBatchMissingSessionsButton) autoBatchMissingSessionsButton.disabled = false;
    }
  }
  return true;
}

function updateAutoBatchMissingButton() {
  if (!autoBatchMissingSessionsButton) return;
  autoBatchMissingSessionsButton.textContent = autoBatchMissingEnabled ? '自动检测开' : '自动检测关';
  autoBatchMissingSessionsButton.classList.toggle('is-on', autoBatchMissingEnabled);
  autoBatchMissingSessionsButton.setAttribute('aria-pressed', autoBatchMissingEnabled ? 'true' : 'false');
  renderAutoBatchWatchedGroups();
}

function scheduleAutoBatchMissingCheck(delayMs = 30000) {
  if (autoBatchMissingTimer) {
    window.clearTimeout(autoBatchMissingTimer);
    autoBatchMissingTimer = null;
  }
  if (!autoBatchMissingEnabled) return;
  autoBatchMissingTimer = window.setTimeout(runAutoBatchMissingCheck, delayMs);
}

async function runAutoBatchMissingCheck() {
  autoBatchMissingTimer = null;
  if (!autoBatchMissingEnabled) return;
  let startedRefresh = false;
  try {
    if (batchPasteInProgress) {
      setAutoBatchStatus('自动检测暂停：正在执行一键粘贴');
      return;
    }
    if (batchMissingRefreshInProgress) return;
    const watchedGroups = Array.from(autoBatchWatchedGroups)
      .filter((name) => normalizeBatchOrders(batchGroups[name] || []).length > 0)
      .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
    if (!watchedGroups.length) {
      setAutoBatchStatus('自动检测已开，但还没有纳入任何组');
      return;
    }
    const threshold = autoBatchThreshold();
    if (autoBatchMinRowsInput) autoBatchMinRowsInput.value = String(threshold);
    const orders = normalizeBatchOrders(watchedGroups.flatMap((name) => batchGroups[name] || []));
    if (!orders.length) {
      setAutoBatchStatus('自动检测暂停：检测组里没有项目', true);
      return;
    }
    const autoRunGroupName = `auto:${watchedGroups.join('|')}`;
    batchMissingRefreshInProgress = true;
    batchMissingRefreshActiveGroup = autoRunGroupName;
    const autoRunId = ++batchMissingRefreshRunId;
    const isAutoRunCurrent = () => (
      autoBatchMissingEnabled
      && batchMissingRefreshRunId === autoRunId
      && batchMissingRefreshActiveGroup === autoRunGroupName
    );
    const setAutoRunStatus = (text, isError = false) => {
      if (isAutoRunCurrent()) setAutoBatchStatus(text, isError);
    };
    startedRefresh = true;
    if (refreshBatchMissingSessionsButton) refreshBatchMissingSessionsButton.disabled = true;
    if (autoBatchMissingSessionsButton) autoBatchMissingSessionsButton.disabled = true;
    setAutoRunStatus(`自动检测 ${watchedGroups.length} 组，读取 ${orders.length} 个项目...`);

    const rowsByOrder = new Map();
    await runWithConcurrency(orders, 6, async (order) => {
      if (!isAutoRunCurrent()) return [];
      const rows = await fetchSessionRowsForOrder(order);
      rowsByOrder.set(order, rows);
      return rows;
    });
    if (!isAutoRunCurrent()) return;

    const missingOrders = orders.filter((order) => sessionRowsValidCount(rowsByOrder.get(order) || []) < threshold);
    if (!missingOrders.length) {
      setAutoRunStatus(`自动检测通过：${watchedGroups.length} 组全部达到 ${threshold} 轮`);
      return;
    }

    const progress = new Map(missingOrders.map((order) => [order, '等待']));
    const summarize = () => {
      const finished = Array.from(progress.values()).filter((value) => value.startsWith('完成') || value.startsWith('失败')).length;
      const running = missingOrders
        .filter((order) => {
          const value = progress.get(order) || '';
          return value && !value.startsWith('等待') && !value.startsWith('完成') && !value.startsWith('失败');
        })
        .slice(0, 4);
      setAutoRunStatus(`自动拉取 ${finished}/${missingOrders.length}${running.length ? `；进行中：${running.join(', ')}` : ''}`);
    };

    await runWithConcurrency(missingOrders, 3, async (order) => {
      if (!isAutoRunCurrent()) return { cancelled: true };
      progress.set(order, `启动 ${sessionRowsValidCount(rowsByOrder.get(order) || [])}/${threshold}`);
      summarize();
      try {
        const result = await refreshMissingSessionOrder(order, threshold, {
          maxWaitMs: 90000,
          requestTimeoutMs: sessionRefreshTimeoutMs,
          isActive: isAutoRunCurrent,
          onProgress: (_, text) => {
            if (!isAutoRunCurrent()) return;
            progress.set(order, text);
            summarize();
          },
        });
        if (result?.cancelled) return result;
        progress.set(order, `完成 ${result.rowCount}/${threshold}`);
        summarize();
        return result;
      } catch (error) {
        progress.set(order, `失败 ${error.message || error}`);
        summarize();
        return null;
      }
    });
    if (!isAutoRunCurrent()) return;

    setAutoRunStatus(`自动检测完成：本轮处理 ${missingOrders.length} 个未达标项目`);
    if (batchSessionModal?.open && currentBatchSessionOrders.length) {
      const results = await fetchBatchRowsForOrders(currentBatchSessionGroupName || currentBatchGroupName(), currentBatchSessionOrders);
      if (!isAutoRunCurrent()) return;
      renderBatchSessionRows({
        groupName: currentBatchSessionGroupName || currentBatchGroupName(),
        orders: currentBatchSessionOrders,
        rows: results,
      });
    }
  } finally {
    if (startedRefresh && batchMissingRefreshActiveGroup.startsWith('auto:')) {
      batchMissingRefreshInProgress = false;
      batchMissingRefreshActiveGroup = '';
      if (refreshBatchMissingSessionsButton) refreshBatchMissingSessionsButton.disabled = false;
      if (autoBatchMissingSessionsButton) autoBatchMissingSessionsButton.disabled = false;
    }
    scheduleAutoBatchMissingCheck();
  }
}

async function setCompleted(promptId, completed) {
  const prompt = prompts.find((item) => item.id === promptId);
  if (completed && prompt && !isVisiblePrompt(prompt)) {
    setBatchStatus(`小于 ${MIN_VISIBLE_ORDER_NUMBER} 的序号不属于第二期，不保存完成状态`);
    return;
  }
  const response = await fetch('/api/prompt-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt_id: promptId, completed }),
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || '状态保存失败');
  promptState = payload.state || { completed: {} };
  renderStats();
  renderSceneButtons();
  renderRows();
}


async function savePromptOrder(row, order, input) {
  if (!Number.isInteger(order) || order <= 0) {
    input.classList.add('invalid-order');
    return false;
  }
  const nextToken = orderToken(row, order);
  const duplicate = prompts.find((item) => item.id !== row.id && orderToken(item, getOrder(item)) === nextToken);
  if (duplicate) {
    input.classList.add('invalid-order');
    return false;
  }
  const response = await fetch('/api/prompt-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt_id: row.id, order, order_token: nextToken }),
  });
  const payload = await response.json();
  if (!payload.ok) {
    input.classList.add('invalid-order');
    return false;
  }
  promptState = payload.state || promptState;
  renderStats();
  renderSceneButtons();
  renderBatchProjectList();
  renderRows();
  return true;
}

function beginOrderEdit(row, orderTd) {
  const current = getOrder(row);
  const currentNumber = orderNumber(current);
  orderTd.innerHTML = '';
  orderTd.classList.add('editing');
  const input = document.createElement('input');
  input.className = 'order-input';
  input.type = 'number';
  input.min = '1';
  input.step = '1';
  input.value = Number.isInteger(currentNumber) && currentNumber > 0 ? String(currentNumber) : String(row.global_order || 1);
  orderTd.appendChild(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = async (save) => {
    if (finished) return;
    finished = true;
    if (!save) {
      renderRows();
      return;
    }
    const next = Number.parseInt(input.value, 10);
    const ok = await savePromptOrder(row, next, input);
    if (!ok) {
      finished = false;
      input.focus();
      input.select();
    }
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') finish(true);
    if (event.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

async function saveMapImage(row, file, statusEl) {
  if (!file || !file.type.startsWith('image/')) {
    statusEl.textContent = '仅支持图片';
    statusEl.classList.add('error');
    return;
  }
  statusEl.textContent = '保存中...';
  statusEl.classList.remove('error', 'saved');
  const dataUrl = await readFileAsDataUrl(file);
  const response = await fetch('/api/project-map-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scene: normalizeDomainName(row.business_domain),
      order: getOrder(row),
      filename: file.name || '',
      data_url: dataUrl,
    }),
  });
  const payload = await response.json();
  if (!payload.ok) {
    statusEl.textContent = payload.error || '保存失败';
    statusEl.classList.add('error');
    return;
  }
  statusEl.textContent = `已保存 ${payload.filename}`;
  statusEl.classList.add('saved');
}

function mapInputCell(row) {
  const td = document.createElement('td');
  td.className = 'map-cell';

  const wrapper = document.createElement('div');
  wrapper.className = 'map-input-wrapper';

  const dropBox = document.createElement('div');
  dropBox.className = 'map-input-box';
  dropBox.tabIndex = 0;
  dropBox.textContent = '粘贴/拖入/选择图片';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.className = 'map-file-input';

  const status = document.createElement('span');
  status.className = 'map-save-status';

  const saveFirstFile = async (files) => {
    const file = Array.from(files || []).find((item) => item && item.type.startsWith('image/'));
    if (!file) {
      status.textContent = '未检测到图片';
      status.classList.add('error');
      return;
    }
    try {
      await saveMapImage(row, file, status);
    } catch (error) {
      status.textContent = error.message || '保存失败';
      status.classList.add('error');
    }
  };

  dropBox.addEventListener('click', (event) => {
    event.stopPropagation();
    fileInput.click();
  });
  dropBox.addEventListener('paste', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await saveFirstFile(event.clipboardData?.files);
  });
  dropBox.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropBox.classList.add('dragging');
  });
  dropBox.addEventListener('dragleave', () => {
    dropBox.classList.remove('dragging');
  });
  dropBox.addEventListener('drop', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropBox.classList.remove('dragging');
    await saveFirstFile(event.dataTransfer?.files);
  });
  fileInput.addEventListener('click', (event) => event.stopPropagation());
  fileInput.addEventListener('change', async () => {
    await saveFirstFile(fileInput.files);
    fileInput.value = '';
  });

  wrapper.append(dropBox, fileInput, status);
  td.appendChild(wrapper);
  return td;
}

function renderRows() {
  rowsEl.innerHTML = '';
  for (const [index, row] of filteredPrompts.entries()) {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    if (row.id === selectedPromptId) tr.classList.add('selected-row');
    if (isCompleted(row.id)) tr.classList.add('completed-row');
    const orderTd = document.createElement('td');
    orderTd.className = 'number-cell order-cell';
    
    const orderWrapper = document.createElement('div');
    orderWrapper.className = 'order-wrapper';
    
    const orderSpan = document.createElement('span');
    orderSpan.className = 'order-text';
    orderSpan.textContent = getOrder(row);
    
    const orderButtons = document.createElement('div');
    orderButtons.className = 'order-buttons';
    
    const copyOrder = actionButton('⧉', 'order-copy-button');
    copyOrder.addEventListener('click', async (event) => {
      event.stopPropagation();
      await copyText(getOrder(row), copyOrder);
    });
    const editOrder = actionButton('✎', 'order-button');
    editOrder.addEventListener('click', async (event) => {
      event.stopPropagation();
      beginOrderEdit(row, orderTd);
    });
    
    orderButtons.append(copyOrder, editOrder);
    orderWrapper.append(orderSpan, orderButtons);
    orderTd.appendChild(orderWrapper);

    tr.append(
      cell(row.name, 'name-cell'),
      orderTd,
      mapInputCell(row)
    );

    const actionTd = document.createElement('td');
    actionTd.className = 'action-cell';

    const doneButton = actionButton(isCompleted(row.id) ? '🔒' : '🔓', 'done-button');
    doneButton.title = '标记完成/未完成';
    doneButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      await setCompleted(row.id, !isCompleted(row.id));
    });

    const copyButton = actionButton('⧉', 'mini-button');
    copyButton.title = '复制 Prompt';
    copyButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      await copyText(row.prompt, copyButton);
    });

    const openButton = actionButton('🏷️', 'mini-button');
    openButton.title = '在 Trae 中打开项目目录';
    openButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      const scene = normalizeDomainName(row.business_domain);
      const order = getOrder(row);
      openButton.disabled = true;
      const previousText = openButton.textContent;
      openButton.textContent = '…';
      setBatchStatus(`正在开启 Trae：${order}`);
      try {
        const response = await fetch('/api/open-project-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene, order }),
        });
        const payload = await response.json();
        if (!payload.ok) {
          throw new Error(payload.error || '打开项目目录失败');
        }
        setBatchStatus(`已发送 Trae 开启命令：${order}`);
      } catch (error) {
        console.error('打开项目目录失败:', error);
        setBatchStatus(`开启 Trae 失败：${order}，${error.message || error}`, true);
      } finally {
        openButton.disabled = false;
        openButton.textContent = previousText;
      }
    });

    const mapsButton = actionButton('🖼', 'mini-button');
    mapsButton.title = '打开 maps 目录';
    mapsButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      const scene = normalizeDomainName(row.business_domain);
      const order = getOrder(row);
      try {
        const response = await fetch('/api/open-project-maps-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene, order }),
        });
        const payload = await response.json();
        if (!payload.ok) {
          console.error('打开 maps 目录失败:', payload.error);
        }
      } catch (error) {
        console.error('打开 maps 目录失败:', error);
      }
    });

    const sessionButton = actionButton('📄', 'mini-button');
    sessionButton.title = '查看会话缓存';
    sessionButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      await openSessionByOrder(getOrder(row));
    });

    const refreshSessionButton = actionButton('↻', 'mini-button session-refresh-button');
    const refreshOrder = getOrder(row);
    refreshSessionButton.dataset.sessionRefreshOrder = refreshOrder;
    refreshSessionButton.title = '刷新会话缓存';
    applySessionRefreshButtonState(refreshSessionButton, refreshingSessionOrders.has(refreshOrder) ? 'loading' : 'idle');
    refreshSessionButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await refreshSessionCache(refreshOrder, refreshSessionButton);
    });

    actionTd.append(doneButton, copyButton, openButton, mapsButton, refreshSessionButton, sessionButton);
    tr.appendChild(actionTd);

    tr.addEventListener('click', () => selectPrompt(row.id));
    rowsEl.appendChild(tr);
  }
}

function selectPrompt(promptId) {
  selectedPromptId = promptId;
  const prompt = prompts.find((item) => item.id === promptId);
  selectedParts = splitPrompt(prompt?.prompt || '未找到 Prompt，请先重新生成方案数据。');
  promptBackground.textContent = selectedParts.background;
  promptFeatures.textContent = selectedParts.features;
  promptDelivery.textContent = selectedParts.delivery;
  updatePromptPreviewVisibility();
  renderRows();
}

async function loadJson(path, fallback) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) return fallback;
  return response.json();
}

async function loadPromptState() {
  try {
    const response = await fetch('/api/prompt-state', { cache: 'no-store' });
    const payload = await response.json();
    promptState = payload.state || { completed: {} };
  } catch {
    promptState = { completed: {} };
  }
}

async function loadWorkbenchConfig() {
  try {
    const response = await fetch('/api/workbench-config', { cache: 'no-store' });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '读取配置失败');
    if (githubRepoUrlInput) githubRepoUrlInput.value = DEFAULT_GITHUB_REPO_URL;
    if (feishuTaskUrlInput) feishuTaskUrlInput.value = String(payload.default_feishu_task_url || '').trim();
    llmAnnotationModels = Array.isArray(payload.llm_annotation_models) ? payload.llm_annotation_models : [];
    if (!selectedLlmAnnotationModelId) {
      selectedLlmAnnotationModelId = String(payload.default_llm_annotation_model_id || '').trim();
      if (selectedLlmAnnotationModelId) localStorage.setItem('llmAnnotationModelId', selectedLlmAnnotationModelId);
    }
    renderLlmAgentModels();
  } catch (error) {
    if (githubRepoUrlInput && !githubRepoUrlInput.value) githubRepoUrlInput.placeholder = `配置读取失败：${error.message}`;
    if (feishuTaskUrlInput && !feishuTaskUrlInput.value) feishuTaskUrlInput.placeholder = `配置读取失败：${error.message}`;
    setLlmAgentStatus(`模型配置读取失败：${error.message}`, true);
  }
}

function bindBatchTraeControls() {
  localStorage.removeItem('workbench.executionEngine');
  if (batchOpenTraeButton) batchOpenTraeButton.textContent = '开启 Trae';
  if (batchTraeInput) {
    batchTraeInput.addEventListener('input', () => {
      if (activeBatchGroup && batchGroups[activeBatchGroup]) {
        batchGroups[activeBatchGroup] = normalizeBatchOrders(parseBatchOrders());
      }
      renderAutoBatchWatchedGroups();
      syncRoundAutomationGroupName();
    });
  }
  if (batchGroupNameInput) {
    batchGroupNameInput.addEventListener('input', () => {
      updateWatchCurrentBatchGroupButton();
      syncRoundAutomationGroupName();
    });
  }
  if (batchGroupSelect) {
    batchGroupSelect.addEventListener('change', () => loadBatchGroup(batchGroupSelect.value));
  }
  if (addToBatchGroupButton) {
    addToBatchGroupButton.addEventListener('click', async () => {
      try {
        await addSelectionToActiveGroup();
      } catch (error) {
        setBatchStatus(`加入组失败：${error.message || error}`, true);
      }
    });
  }
  if (saveBatchGroupButton) {
    saveBatchGroupButton.addEventListener('click', async () => {
      try {
        await saveBatchGroup(currentBatchGroupName(), parseBatchOrders());
      } catch (error) {
        setBatchStatus(`保存组失败：${error.message || error}`, true);
      }
    });
  }
  if (deleteBatchGroupButton) {
    deleteBatchGroupButton.addEventListener('click', async () => {
      try {
        await deleteActiveBatchGroup();
      } catch (error) {
        setBatchStatus(`删除组失败：${error.message || error}`, true);
      }
    });
  }
  if (batchOpenTraeButton) {
    batchOpenTraeButton.addEventListener('click', () => runBatchTrae('open'));
  }
if (batchCloseTraeButton) {
  batchCloseTraeButton.addEventListener('click', () => runBatchTrae('close'));
}

if (openBatchSessionsButton) {
  openBatchSessionsButton.addEventListener('click', async () => {
    await openBatchSessions();
  });
}
}


function renderSceneButtons() {
  const domains = uniqueSorted(visiblePromptList().map((prompt) => prompt.business_domain));
  sceneButtons.innerHTML = '';
  for (const domain of domains) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scene-button';
    button.textContent = displayDomainName(domain);
    if (domainFilter.value === domain) button.classList.add('active');
    button.addEventListener('click', () => {
      domainFilter.value = domain;
      applyFilters();
      renderSceneButtons();
    });
    sceneButtons.appendChild(button);
  }
}

function bindFilters() {
  const visiblePrompts = visiblePromptList();
  fillSelect(domainFilter, uniqueSorted(visiblePrompts.map((prompt) => prompt.business_domain)), '业务', displayDomainName);
  fillSelect(userFilter, uniqueSorted(visiblePrompts.map((prompt) => prompt.target_user)), '用户');
  fillSelect(platformFilter, uniqueSorted(visiblePrompts.map((prompt) => prompt.product_form)), '平台');
  fillSelect(scenarioFilter, uniqueSorted(visiblePrompts.map((prompt) => prompt.scenario)), '场景');
  for (const control of [domainFilter, userFilter, platformFilter, scenarioFilter, searchInput]) {
    control.addEventListener('input', applyFilters);
    control.addEventListener('change', applyFilters);
  }
}

function setSyncStatus(text, isError = false) {
  if (!syncGithubStatus) return;
  syncGithubStatus.textContent = text || '';
  syncGithubStatus.classList.toggle('error', Boolean(isError));
}

function setClaimStatus(text, isError = false) {
  if (!claimFeishuStatus) return;
  claimFeishuStatus.textContent = text || '';
  claimFeishuStatus.classList.toggle('error', Boolean(isError));
}

async function claimFeishuTasks() {
  if (!claimFeishuTasksButton || !feishuClaimCountInput || !feishuTaskUrlInput) return;
  const count = Number.parseInt(feishuClaimCountInput.value, 10);
  const taskUrl = String(feishuTaskUrlInput.value || '').trim();
  if (!Number.isInteger(count) || count <= 0) {
    setClaimStatus('请输入大于 0 的数量', true);
    feishuClaimCountInput.focus();
    return;
  }
  if (!taskUrl) {
    setClaimStatus('请输入飞书地址', true);
    feishuTaskUrlInput.focus();
    return;
  }

  claimFeishuTasksButton.disabled = true;
  setClaimStatus(`开始领取 ${count} 道题...`);
  try {
    const response = await fetch('/api/claim-feishu-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, task_url: taskUrl }),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '领取失败');
    setClaimStatus(`完成：计划 ${payload.requested}，点击领取 ${payload.claimed}，翻页 ${payload.page_turns || 0}`);
  } catch (error) {
    setClaimStatus(`失败：${error.message}`, true);
  } finally {
    claimFeishuTasksButton.disabled = false;
  }
}

async function syncCompletedToGithub() {
  if (!syncGithubAllButton || !githubRepoUrlInput) return;
  const repoUrl = String(githubRepoUrlInput.value || '').trim();
  if (!repoUrl) {
    setSyncStatus('请输入 GitHub 地址', true);
    githubRepoUrlInput.focus();
    return;
  }
  syncGithubAllButton.disabled = true;
  setSyncStatus('同步中...');
  try {
    const response = await fetch('/api/sync-github-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl }),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '同步失败');
    const synced = Number(payload.synced || 0);
    const skipped = Number(payload.skipped || 0);
    const failed = Number(payload.failed || 0);
    const firstFailed = (payload.results || []).find((item) => item && item.status === 'failed');
    const failureText = firstFailed ? `；首个失败：${firstFailed.order || firstFailed.prompt_id} ${firstFailed.reason || ''}` : '';
    setSyncStatus(`完成：同步 ${synced}，跳过 ${skipped}，失败 ${failed}${failureText}`);
  } catch (error) {
    setSyncStatus(`失败：${error.message}`, true);
  } finally {
    syncGithubAllButton.disabled = false;
  }
}

async function loadPromptFactory() {
  await loadWorkbenchConfig();
  candidates = await loadJson('./data/generated/zero_to_one_candidates.json', []);
  prompts = await loadJson('./data/generated/generation_prompts.json', []);
  atoms = await loadJson('./data/normalized/product_atoms.json', []);
  prompts = prompts.map((prompt) => ({
    ...prompt,
    business_domain: normalizeDomainName(prompt.business_domain),
  }));
  candidates = candidates.map((candidate) => ({
    ...candidate,
    business_domain: normalizeDomainName(candidate.business_domain),
  }));
  atoms = atoms.map((atom) => ({
    ...atom,
    business_domain: normalizeDomainName(atom.business_domain),
  }));
  await loadPromptState();
  await fetchBatchGroups();
  bindFilters();
  bindBatchTraeControls();
  if ([...domainFilter.options].some((option) => option.value === 'shopping')) domainFilter.value = 'shopping';
  renderSceneButtons();
  renderBatchProjectList();
  applyFilters();
  renderRoundAutomationGroupList();
  if (roundAutomationJobId) pollRoundAutomationJob(true);
}


document.querySelectorAll('.part-copy').forEach((button) => {
  button.addEventListener('click', async () => {
    const part = button.dataset.part;
    await copyText(selectedParts[part] || '', button);
  });
});

function initDraggableDetailPanel() {
  if (!detailPanel) return;

  let dragState = null;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  detailPanel.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    const rect = detailPanel.getBoundingClientRect();
    dragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    detailPanel.classList.add('dragging');
    detailPanel.setPointerCapture(event.pointerId);
  });

  detailPanel.addEventListener('pointermove', (event) => {
    if (!dragState) return;
    const rect = detailPanel.getBoundingClientRect();
    const left = clamp(event.clientX - dragState.offsetX, 0, window.innerWidth - rect.width);
    const top = clamp(event.clientY - dragState.offsetY, 0, window.innerHeight - rect.height);
    detailPanel.style.left = `${left}px`;
    detailPanel.style.top = `${top}px`;
    detailPanel.style.right = 'auto';
    detailPanel.style.bottom = 'auto';
    detailPanel.style.transform = 'none';
  });

  const stopDragging = (event) => {
    if (!dragState) return;
    dragState = null;
    detailPanel.classList.remove('dragging');
    if (detailPanel.hasPointerCapture(event.pointerId)) {
      detailPanel.releasePointerCapture(event.pointerId);
    }
  };

  detailPanel.addEventListener('pointerup', stopDragging);
  detailPanel.addEventListener('pointercancel', stopDragging);
}

initDraggableDetailPanel();

if (promptPreviewToggleButton) {
  updatePromptPreviewVisibility();
  promptPreviewToggleButton.addEventListener('click', () => {
    promptPreviewVisible = !promptPreviewVisible;
    localStorage.setItem('promptPreviewVisible', promptPreviewVisible ? 'true' : 'false');
    updatePromptPreviewVisibility();
  });
}

if (syncGithubAllButton) {
  syncGithubAllButton.addEventListener('click', syncCompletedToGithub);
}

if (claimFeishuTasksButton) {
  claimFeishuTasksButton.addEventListener('click', claimFeishuTasks);
}

if (sessionModal) {
  sessionModal.addEventListener('cancel', () => {
    if (activeSessionFetchController) activeSessionFetchController.abort();
    sessionModal.close();
  });
  sessionModal.addEventListener('click', (event) => {
    if (event.target === sessionModal) {
      if (activeSessionFetchController) activeSessionFetchController.abort();
      sessionModal.close();
    }
  });
}

if (sessionPrevButton) {
  sessionPrevButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await moveSessionOrder(-1);
  });
}

if (sessionNextButton) {
  sessionNextButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await moveSessionOrder(1);
  });
}

if (copySessionIdColumnButton) {
  copySessionIdColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copySessionColumn('sessionId', copySessionIdColumnButton);
  });
}

if (copyDissatisfactionColumnButton) {
  copyDissatisfactionColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copySessionColumn('dissatisfactionReason', copyDissatisfactionColumnButton);
  });
}

if (copyConversationColumnButton) {
  copyConversationColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copySessionColumn('conversation', copyConversationColumnButton);
  });
}

if (copyLogTraceColumnButton) {
  copyLogTraceColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copySessionColumn('logTrace', copyLogTraceColumnButton);
  });
}

if (showBatchGroupTabButton) {
  showBatchGroupTabButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setBatchPanelTab('group');
  });
}

if (showRoundAutomationTabButton) {
  showRoundAutomationTabButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setBatchPanelTab('automation');
  });
}

if (startRoundAutomationButton) {
  startRoundAutomationButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await startRoundAutomation();
  });
}

if (stopRoundAutomationButton) {
  stopRoundAutomationButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await stopRoundAutomation();
  });
}

if (runRoundAutomationProbeButton) {
  runRoundAutomationProbeButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runRoundAutomationStep('probe');
  });
}

if (runRoundAutomationRoundDetectButton) {
  runRoundAutomationRoundDetectButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runRoundAutomationStep('roundDetect');
  });
}

if (runRoundAutomationRuntimeButton) {
  runRoundAutomationRuntimeButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runRoundAutomationStep('runtime');
  });
}

if (runRoundAutomationBrowserButton) {
  runRoundAutomationBrowserButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runRoundAutomationStep('browser');
  });
}

if (runRoundAutomationDraftsButton) {
  runRoundAutomationDraftsButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runRoundAutomationStep('drafts');
  });
}

if (runRoundAutomationQueueButton) {
  runRoundAutomationQueueButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runRoundAutomationStep('queue');
  });
}

if (runRoundPromptQueueButton) {
  runRoundPromptQueueButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runRoundAutomationStep('roundQueue');
  });
}

if (restoreRoundAutomationWindowButton) {
  restoreRoundAutomationWindowButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runRoundAutomationStep('restore');
  });
}

if (probeRoundAutomationWindowButton) {
  probeRoundAutomationWindowButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runRoundAutomationStep('ax');
  });
}

if (prepareRoundAutomationSubmitButton) {
  prepareRoundAutomationSubmitButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runRoundAutomationStep('prepare');
  });
}

if (fastRoundAutomationSubmitButton) {
  fastRoundAutomationSubmitButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runRoundAutomationStep('submit');
  });
}

if (batchSessionModal) {
  batchSessionModal.addEventListener('cancel', () => batchSessionModal.close());
  batchSessionModal.addEventListener('click', (event) => {
    if (event.target === batchSessionModal) batchSessionModal.close();
  });
}

if (refreshBatchMissingSessionsButton) {
  refreshBatchMissingSessionsButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await refreshBatchMissingSessions();
  });
}

if (autoBatchMissingSessionsButton) {
  updateAutoBatchMissingButton();
  scheduleAutoBatchMissingCheck(5000);
  autoBatchMissingSessionsButton.addEventListener('click', (event) => {
    event.stopPropagation();
    autoBatchMissingEnabled = !autoBatchMissingEnabled;
    localStorage.setItem('autoBatchMissingSessions', autoBatchMissingEnabled ? 'true' : 'false');
    updateAutoBatchMissingButton();
    setAutoBatchStatus(autoBatchMissingEnabled ? '自动检测已开启' : '自动检测已关闭');
    scheduleAutoBatchMissingCheck(autoBatchMissingEnabled ? 1000 : 0);
  });
}

if (watchCurrentBatchGroupButton) {
  watchCurrentBatchGroupButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    try {
      await toggleCurrentBatchGroupWatch();
    } catch (error) {
      setAutoBatchStatus(`检测组设置失败：${error.message || error}`, true);
    }
  });
}

syncTargetRoundInputs(
  localStorage.getItem(TARGET_ROUNDS_STORAGE_KEY)
    || localStorage.getItem('autoBatchMinRows')
    || DEFAULT_TARGET_ROUNDS,
);

[batchSessionMinRowsInput, autoBatchMinRowsInput, roundAutomationTargetRoundsInput]
  .filter(Boolean)
  .forEach((input) => {
    input.addEventListener('change', () => {
      const threshold = syncTargetRoundInputs(input.value);
      setAutoBatchStatus(`全局目标轮次已设为 ${threshold} 轮`);
      scheduleAutoBatchMissingCheck(autoBatchMissingEnabled ? 1000 : 0);
    });
  });

if (copyNextBatchScreenshotButton) {
  copyNextBatchScreenshotButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyNextBatchScreenshotQueueItem(copyNextBatchScreenshotButton);
  });
}

if (pasteBatchScreenshotsToFeishuButton) {
  pasteBatchScreenshotsToFeishuButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await pasteBatchScreenshotsToFeishu();
  });
}

if (pasteBatchAllToFeishuButton) {
  pasteBatchAllToFeishuButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await pasteBatchAllToFeishu();
  });
}

if (runLlmDissatisfactionAnnotationButton) {
  runLlmDissatisfactionAnnotationButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await runCurrentGroupDissatisfactionAnnotation();
  });
}

if (copyBatchOrderColumnButton) {
  copyBatchOrderColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('order', copyBatchOrderColumnButton);
  });
}

if (copyBatchSessionIdColumnButton) {
  copyBatchSessionIdColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('sessionId', copyBatchSessionIdColumnButton);
  });
}

if (copyBatchDissatisfactionColumnButton) {
  copyBatchDissatisfactionColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('dissatisfactionReason', copyBatchDissatisfactionColumnButton);
  });
}

if (copyBatchConversationColumnButton) {
  copyBatchConversationColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('conversation', copyBatchConversationColumnButton);
  });
}

if (copyBatchTraceOrderColumnButton) {
  copyBatchTraceOrderColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('order', copyBatchTraceOrderColumnButton);
  });
}

if (copyBatchScreenshotColumnButton) {
  copyBatchScreenshotColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('screenshot', copyBatchScreenshotColumnButton);
  });
}

if (copyBatchLogTraceColumnButton) {
  copyBatchLogTraceColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('logTrace', copyBatchLogTraceColumnButton);
  });
}

loadPromptFactory().catch((error) => {
  rowsEl.innerHTML = `<tr><td colspan="3">数据加载失败：${error.message}</td></tr>`;
});
