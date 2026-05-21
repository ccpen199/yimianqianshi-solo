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
const batchGroupPickerStatus = document.getElementById('batchGroupPickerStatus');
const batchGroupPickerSummary = document.getElementById('batchGroupPickerSummary');
const batchGroupPickerList = document.getElementById('batchGroupPickerList');
const batchSelectAllGroupsButton = document.getElementById('batchSelectAllGroups');
const batchClearSelectedGroupsButton = document.getElementById('batchClearSelectedGroups');
const batchAddSelectedGroupsButton = document.getElementById('batchAddSelectedGroupsToAutoBatch');
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
const runLlmDissatisfactionButton = document.getElementById('runLlmDissatisfaction');
const llmAgentStatusEl = document.getElementById('llmAgentStatus');
const runLlmDissatisfactionAnnotationButton = document.getElementById('runLlmDissatisfactionAnnotation');
const copyNextBatchScreenshotButton = document.getElementById('copyNextBatchScreenshot');
const pasteBatchScreenshotsToFeishuButton = document.getElementById('pasteBatchScreenshotsToFeishu');
const pasteBatchAllToFeishuButton = document.getElementById('pasteBatchAllToFeishu');
const batchSessionRefreshStatus = document.getElementById('batchSessionRefreshStatus');

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
let selectedBatchGroupNames = new Set(loadStoredStringList('batchGroupSelection'));
let currentSessionRows = [];
let sessionOrderList = [];
let activeSessionOrder = '';
let currentBatchSessionRows = [];
let currentBatchSessionOrders = [];
let currentBatchSessionGroupName = '';
let sessionLoadRequestId = 0;
const refreshingSessionOrders = new Set();
const sessionRefreshPollTimers = new Map();
const sessionFetchTimeoutMs = 30000;
const sessionRefreshTimeoutMs = 42000;
let activeSessionFetchController = null;
let batchScreenshotCopyQueue = [];
let batchScreenshotCopyIndex = 0;
let promptPreviewVisible = localStorage.getItem('promptPreviewVisible') !== 'false';
let batchMissingRefreshInProgress = false;
let batchPasteInProgress = false;
let autoBatchMissingEnabled = false;
let autoBatchWatchedGroups = new Set(loadStoredStringList('autoBatchWatchedGroups'));
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
  local_projects: 'xm',
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
  const explicitOrder = String(promptState.orders?.[prompt?.id] || prompt?.order_folder || '').trim();
  const explicitMatch = explicitOrder.match(/^([a-zA-Z][a-zA-Z0-9]*)-\d+$/);
  if (explicitMatch) return explicitMatch[1].toLowerCase();
  if (String(prompt?.id || '').startsWith('prd_300_may_')) return 'may';
  const domain = normalizeDomainName(prompt.business_domain);
  return scenePrefix[domain] || 'x';
}

function orderToken(prompt, value) {
  const prefix = orderPrefix(prompt);
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return `${prefix}-${value}`;
  }
  const text = String(value ?? '').trim();
  if (!text) return `${prefix}-${prompt.global_order}`;
  if (/^\d+$/.test(text)) return `${prefix}-${Number.parseInt(text, 10)}`;
  const match = text.match(/^([a-zA-Z][a-zA-Z0-9]*)-(\d+)$/);
  if (match) return `${match[1].toLowerCase()}-${Number.parseInt(match[2], 10)}`;
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
  if (prefix === 'xm') return 1;
  return 2;
}

function getOrder(prompt) {
  const raw = promptState.orders?.[prompt.id];
  return orderToken(prompt, raw || `${orderPrefix(prompt)}-${prompt.global_order}`);
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
    if (/^\d+$/.test(text)) text = `xm-${Number.parseInt(text, 10)}`;
    const match = text.match(/^([a-zA-Z][a-zA-Z0-9]*)-(\d+)$/);
    if (match) text = `${match[1].toLowerCase()}-${Number.parseInt(match[2], 10)}`;
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

function persistAutoBatchWatchedGroups() {
  saveStoredStringList('autoBatchWatchedGroups', autoBatchWatchedGroups);
}

function persistSelectedBatchGroups() {
  saveStoredStringList('batchGroupSelection', selectedBatchGroupNames);
}

function pruneSelectedBatchGroups() {
  const validNames = new Set(Object.keys(batchGroups || {}));
  let changed = false;
  for (const name of Array.from(selectedBatchGroupNames)) {
    if (!validNames.has(name)) {
      selectedBatchGroupNames.delete(name);
      changed = true;
    }
  }
  if (changed) persistSelectedBatchGroups();
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

function autoBatchThreshold() {
  const value = Number.parseInt(String(autoBatchMinRowsInput?.value || batchSessionMinRowsInput?.value || ''), 10);
  return Number.isInteger(value) && value > 0 ? value : 5;
}

function updateWatchCurrentBatchGroupButton() {
  if (!watchCurrentBatchGroupButton) return;
  const groupName = currentBatchGroupName();
  const watched = groupName && autoBatchWatchedGroups.has(groupName);
  watchCurrentBatchGroupButton.textContent = watched ? '取消当前组入队' : '当前组入队';
  watchCurrentBatchGroupButton.classList.toggle('is-on', Boolean(watched));
  watchCurrentBatchGroupButton.disabled = !groupName;
}

function updateBatchGroupPickerSummary() {
  if (!batchGroupPickerSummary) return;
  const selectedCount = selectedBatchGroupNames.size;
  const watchedCount = autoBatchWatchedGroups.size;
  if (!Object.keys(batchGroups || {}).length) {
    batchGroupPickerSummary.textContent = '暂无组';
    return;
  }
  batchGroupPickerSummary.textContent = selectedCount
    ? `已选 ${selectedCount} 组 · 队列 ${watchedCount} 组`
    : `未选组 · 队列 ${watchedCount} 组`;
}

function setBatchGroupPickerStatus(text, isError = false) {
  if (!batchGroupPickerStatus) return;
  batchGroupPickerStatus.textContent = text || '';
  batchGroupPickerStatus.classList.toggle('error', Boolean(isError));
}

function syncBatchGroupPickerButtons() {
  const hasSelection = selectedBatchGroupNames.size > 0;
  if (batchSelectAllGroupsButton) batchSelectAllGroupsButton.disabled = !Object.keys(batchGroups || {}).length;
  if (batchClearSelectedGroupsButton) batchClearSelectedGroupsButton.disabled = !hasSelection;
  if (batchAddSelectedGroupsButton) batchAddSelectedGroupsButton.disabled = !hasSelection;
}

function renderBatchGroupPicker() {
  if (!batchGroupPickerList) return;
  pruneSelectedBatchGroups();
  const names = Object.keys(batchGroups || {}).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  batchGroupPickerList.innerHTML = '';
  if (!names.length) {
    batchGroupPickerList.innerHTML = '<div class="batch-group-picker-empty">暂无组</div>';
    updateBatchGroupPickerSummary();
    syncBatchGroupPickerButtons();
    setBatchGroupPickerStatus('');
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const name of names) {
    const label = document.createElement('label');
    label.className = 'batch-group-picker-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = name;
    checkbox.checked = selectedBatchGroupNames.has(name);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedBatchGroupNames.add(name);
      else selectedBatchGroupNames.delete(name);
      persistSelectedBatchGroups();
      updateBatchGroupPickerSummary();
      syncBatchGroupPickerButtons();
      setBatchGroupPickerStatus(selectedBatchGroupNames.size ? `已选 ${selectedBatchGroupNames.size} 组` : '');
    });
    const text = document.createElement('span');
    text.textContent = `${name} (${normalizeBatchOrders(batchGroups[name]).length})`;
    if (autoBatchWatchedGroups.has(name)) {
      text.appendChild(document.createTextNode(' · 队列'));
    }
    label.append(checkbox, text);
    fragment.appendChild(label);
  }
  batchGroupPickerList.appendChild(fragment);
  updateBatchGroupPickerSummary();
  syncBatchGroupPickerButtons();
  setBatchGroupPickerStatus(selectedBatchGroupNames.size ? `已选 ${selectedBatchGroupNames.size} 组` : '');
}

function setSelectedBatchGroups(names) {
  selectedBatchGroupNames = new Set(
    Array.from(names || [])
      .map((name) => String(name || '').trim())
      .filter((name) => name && Object.prototype.hasOwnProperty.call(batchGroups || {}, name)),
  );
  persistSelectedBatchGroups();
  renderBatchGroupPicker();
}

function selectAllBatchGroups() {
  const names = Object.keys(batchGroups || {});
  setSelectedBatchGroups(names);
}

function clearSelectedBatchGroups() {
  selectedBatchGroupNames.clear();
  persistSelectedBatchGroups();
  renderBatchGroupPicker();
}

function selectedValidBatchGroupNames() {
  return Array.from(selectedBatchGroupNames)
    .map((name) => String(name || '').trim())
    .filter((name) => Object.prototype.hasOwnProperty.call(batchGroups || {}, name));
}

function sortBatchGroupNames(names) {
  return Array.from(names || [])
    .map((name) => String(name || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
}

function autoBatchQueueGroupNames() {
  const selectedGroupNames = sortBatchGroupNames(selectedValidBatchGroupNames());
  if (selectedGroupNames.length) {
    const selectedNames = selectedGroupNames
      .filter((name) => normalizeBatchOrders(batchGroups[name] || []).length > 0);
    return { names: selectedNames, source: 'selected' };
  }
  const watchedNames = sortBatchGroupNames(autoBatchWatchedGroups)
    .filter((name) => normalizeBatchOrders(batchGroups[name] || []).length > 0);
  return { names: watchedNames, source: 'watched' };
}

function addBatchGroupsToAutoBatch(groupNames) {
  const names = Array.from(groupNames || [])
    .map((name) => String(name || '').trim())
    .filter((name) => Object.prototype.hasOwnProperty.call(batchGroups || {}, name));
  let added = 0;
  for (const name of names) {
    if (!autoBatchWatchedGroups.has(name)) {
      autoBatchWatchedGroups.add(name);
      added += 1;
    }
  }
  if (names.length) persistAutoBatchWatchedGroups();
  return { names, added };
}

async function addSelectedBatchGroupsToAutoBatch() {
  const { names, added } = addBatchGroupsToAutoBatch(selectedValidBatchGroupNames());
  if (!names.length) {
    setBatchGroupPickerStatus('请先勾选要加入刷新队列的组', true);
    return;
  }
  renderBatchGroups();
  renderBatchGroupPicker();
  renderAutoBatchWatchedGroups();
  setBatchGroupPickerStatus(
    added
      ? `已加入刷新队列：${names.join('，')}`
      : `所选组都已在刷新队列中：${names.join('，')}`,
  );
}

function renderAutoBatchWatchedGroups() {
  pruneAutoBatchWatchedGroups();
  updateWatchCurrentBatchGroupButton();
  updateBatchGroupPickerSummary();
  const queued = autoBatchQueueGroupNames();
  if (queued.source === 'selected') {
    if (!queued.names.length) {
      setAutoBatchStatus('已选组没有项目，不能排队刷新未达标项目', true);
      return;
    }
    const summary = queued.names.map((name) => `${name}(${normalizeBatchOrders(batchGroups[name] || []).length})`).join('，');
    setAutoBatchStatus(`批组队列：已选 ${queued.names.length} 组，按顺序刷新未达标项目：${summary}`);
    return;
  }
  const names = sortBatchGroupNames(autoBatchWatchedGroups);
  if (!names.length) {
    setAutoBatchStatus('勾选组后点击“批组刷新”，会按组排队刷新未达标项目');
    return;
  }
  const summary = names.map((name) => `${name}(${normalizeBatchOrders(batchGroups[name] || []).length})`).join('，');
  setAutoBatchStatus(`刷新队列：${summary}`);
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

function updateLlmAnnotationAction() {
  if (!runLlmDissatisfactionButton) return;
  const current = selectedLlmAnnotationModel();
  const canAnnotate = Boolean(current && current.supportsAnnotation && current.available !== false);
  runLlmDissatisfactionButton.disabled = !canAnnotate;
  runLlmDissatisfactionButton.title = canAnnotate
    ? '用当前模型生成当前组的不满意原因'
    : (current?.supportsAnnotation === false ? '该模型只用于本机复核，不直接写回不满意列' : '当前模型未配置完成');
}

function renderLlmAgentModels() {
  if (!llmAgentModelListEl) return;
  llmAgentModelListEl.innerHTML = '';
  if (!Array.isArray(llmAnnotationModels) || !llmAnnotationModels.length) {
    setLlmAgentStatus('暂无可用标注模型配置', true);
    updateLlmAnnotationAction();
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
    ? `当前用于不满意列：${current.name || current.model || current.id}${current.supportsAnnotation === false ? '（复核入口，不直接写回）' : ''}`
    : '请选择标注模型';
  setLlmAgentStatus(message, current?.available === false);
  updateLlmAnnotationAction();
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

function renderBatchGroups() {
  if (!batchGroupSelect) return;
  pruneSelectedBatchGroups();
  pruneAutoBatchWatchedGroups();
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
  renderBatchGroupPicker();
  renderAutoBatchWatchedGroups();
}

function loadBatchGroup(name) {
  activeBatchGroup = String(name || '').trim();
  if (batchGroupSelect) batchGroupSelect.value = activeBatchGroup;
  if (batchGroupNameInput) batchGroupNameInput.value = activeBatchGroup;
  if (batchTraeInput) batchTraeInput.value = normalizeBatchOrders(batchGroups[activeBatchGroup] || []).join(',');
  selectedBatchOrders = new Set();
  renderBatchProjectList();
  renderAutoBatchWatchedGroups();
}

async function fetchBatchGroups() {
  try {
    const response = await fetch('/api/trae-groups');
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '读取组失败');
    batchGroups = payload.groups || {};
    renderBatchGroups();
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
  persistAutoBatchWatchedGroups();
  activeBatchGroup = '';
  pruneSelectedBatchGroups();
  renderBatchGroups();
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
    setAutoBatchStatus(`已从刷新队列移除：${groupName}`);
    return;
  }
  const orders = normalizeBatchOrders(parseBatchOrders());
  if (!orders.length) {
    setAutoBatchStatus('当前组没有项目，不能加入刷新队列', true);
    return;
  }
  if (!batchGroups[groupName] || normalizeBatchOrders(batchGroups[groupName]).join(',') !== orders.join(',')) {
    await saveBatchGroup(groupName, orders);
  }
  autoBatchWatchedGroups.add(groupName);
  persistAutoBatchWatchedGroups();
  renderBatchGroups();
  setAutoBatchStatus(`已加入刷新队列：${groupName}`);
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
  const fragment = document.createDocumentFragment();
  const sorted = [...prompts].sort(comparePromptOrder);
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
    fragment.appendChild(label);
  }
  batchProjectList.appendChild(fragment);
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

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(String(value ?? ''));
  }
  return String(value ?? '').replace(/["\\]/g, '\\$&');
}

function updateSelectedRowHighlight(previousId, nextId) {
  if (!rowsEl) return;
  if (previousId && previousId !== nextId) {
    const previousRow = rowsEl.querySelector(`tr[data-id="${cssEscape(previousId)}"]`);
    if (previousRow) previousRow.classList.remove('selected-row');
  }
  if (nextId) {
    const nextRow = rowsEl.querySelector(`tr[data-id="${cssEscape(nextId)}"]`);
    if (nextRow) nextRow.classList.add('selected-row');
  }
}

function renderStats() {
  const candidateCount = new Set(prompts.map((prompt) => prompt.candidate_id)).size;
  const completedCount = Object.keys(promptState.completed || {}).length;
  const cards = [
    ['素材', atoms.length],
    ['方案', candidateCount],
    ['Prompt', prompts.length],
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

  filteredPrompts = prompts.filter((prompt) => {
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
  return String(row?.sessionId || '-').trim() || '-';
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
  if (logTrace && !isCompositeTraeSessionId(logTrace)) return logTrace;
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
      order: isBatchBlankSlot(row) ? '' : order,
      indexInOrder,
      __blankSlot: isBatchBlankSlot(row),
      conversation: batchPasteCellText(row, 'conversation'),
      dissatisfactionReason: batchPasteCellText(row, 'dissatisfactionReason'),
      logTrace: batchPasteCellText(row, 'logTrace'),
      imagePaths,
      imageCount: imagePaths.length,
    });
  }
  return prepared;
}

async function pasteBatchScreenshotsToFeishu() {
  if (!pasteBatchScreenshotsToFeishuButton) return;
  const rows = batchRowsForScreenshotCopy();
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
    setBatchSessionRefreshStatus(`正在自动粘贴 ${rows.length} 行：请确认飞书 User Prompt 第一行单元格已选中`);
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
      `已自动粘贴主要列：文本列 ${payload.textColumns || 0}，图片 ${payload.screenshots?.pasted || 0}，空截图 ${payload.screenshots?.empty || 0}；Session 未粘贴`,
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
  const value = Number.parseInt(String(batchSessionMinRowsInput?.value || ''), 10);
  return Number.isInteger(value) && value > 0 ? value : Infinity;
}

function isBatchBlankSlot(row) {
  return Boolean(row?.__batchBlankSlot || row?.__blankSlot);
}

function isCopyableBatchSessionRow(row) {
  if (!row || isBatchBlankSlot(row)) return false;
  const sessionId = String(row?.sessionId || '').trim();
  const conversation = String(row?.conversation || '').trim();
  if (!sessionId || sessionId === '-') return false;
  if (!conversation || conversation.startsWith('读取失败:') || conversation.startsWith('刷新失败:')) return false;
  return true;
}

function batchOrdersForSlotCopy(rows = currentBatchSessionRows) {
  const explicit = normalizeBatchOrders(currentBatchSessionOrders || []);
  if (explicit.length) return explicit;
  const seen = new Set();
  const orders = [];
  for (const row of rows || []) {
    const order = String(row?.order || '').trim();
    if (!order || seen.has(order)) continue;
    seen.add(order);
    orders.push(order);
  }
  return orders;
}

function makeBatchBlankSlot(order, indexInOrder) {
  return {
    __batchBlankSlot: true,
    order,
    indexInOrder,
    sessionId: '',
    rawSessionId: '',
    logTraceId: '',
    sessionComposite: '',
    dissatisfactionReason: '',
    conversation: '',
    logTrace: '',
    screenshots: [],
  };
}

function batchRowsForColumnCopy(rows = currentBatchSessionRows) {
  const limit = batchCopyLimit();
  if (!Number.isFinite(limit)) return Array.isArray(rows) ? rows : [];
  const rowsByOrder = new Map();
  for (const row of rows || []) {
    const order = String(row?.order || '').trim();
    if (!order || !isCopyableBatchSessionRow(row)) continue;
    if (!rowsByOrder.has(order)) rowsByOrder.set(order, []);
    rowsByOrder.get(order).push(row);
  }
  const orders = batchOrdersForSlotCopy(rows);
  const selected = [];
  for (const order of orders) {
    const orderRows = rowsByOrder.get(order) || [];
    const cappedRows = orderRows.slice(0, limit);
    for (const row of cappedRows) selected.push(row);
    for (let index = cappedRows.length + 1; index <= limit; index += 1) {
      selected.push(makeBatchBlankSlot(order, index));
    }
  }
  return selected;
}

function batchRowsForScreenshotCopy(rows = currentBatchSessionRows) {
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

function batchPasteCellText(row, field) {
  if (isBatchBlankSlot(row)) return '';
  if (field === 'sessionId') return spreadsheetColumnText(sessionColumnText(row));
  if (field === 'dissatisfactionReason') return spreadsheetColumnText(dissatisfactionReasonText(row?.dissatisfactionReason));
  if (field === 'logTrace') return spreadsheetColumnText(sessionLogTraceText(row));
  return spreadsheetColumnText(row?.[field] || '');
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
  const rows = field === 'screenshot' ? batchRowsForScreenshotCopy() : batchRowsForColumnCopy();
  if (field === 'logTrace') {
    const values = rows.map((row) => batchPasteCellText(row, 'logTrace'));
    await copyText(values.join('\n'), button);
    return;
  }
  if (field === 'screenshot') {
    await copyScreenshotRowsAsImages(rows, button);
    return;
  }
  const values = rows.map((row) => batchPasteCellText(row, field));
  await copyText(values.join('\n'), button);
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

async function runLlmDissatisfactionForCurrentBatch() {
  const currentModel = selectedLlmAnnotationModel();
  if (!currentModel) {
    setLlmAgentStatus('请选择标注模型', true);
    return;
  }
  if (currentModel.supportsAnnotation === false) {
    setLlmAgentStatus('Codex CLI / pinAI 作为本机复核入口，不直接写回不满意列', true);
    return;
  }
  if (currentModel.available === false) {
    setLlmAgentStatus(currentModel.provider === 'deepseek' ? '请先设置 DEEPSEEK_API_KEY' : '当前模型未配置完成', true);
    return;
  }
  const { groupName, orders } = collectBatchOrders();
  if (!orders.length) {
    setLlmAgentStatus('当前组没有项目，请先选择项目', true);
    return;
  }
  if (runLlmDissatisfactionButton) runLlmDissatisfactionButton.disabled = true;
  setLlmAgentStatus(`LLM 标注中：${groupName || '-'} ${orders.join(',')}`);
  try {
    const response = await fetch('/api/annotate-dissatisfaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orders,
        model_id: currentModel.id,
        force: true,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    const results = Array.isArray(payload.results) ? payload.results : [];
    const failed = results.filter((item) => item && !item.ok);
    const failedText = failed.length ? `；失败 ${failed.length}：${failed.map((item) => `${item.order}${item.error ? `(${item.error})` : ''}`).join('，')}` : '';
    setLlmAgentStatus(`LLM 已写回 ${payload.changed || 0}/${payload.rows || 0} 行${failedText}`, Boolean(failed.length));
    if (batchSessionModal?.open) {
      const refreshedRows = await fetchBatchRowsForOrders(groupName, orders);
      renderBatchSessionRows({ groupName, orders, rows: refreshedRows });
    }
  } catch (error) {
    setLlmAgentStatus(`LLM 标注失败：${error.message || error}`, true);
  } finally {
    updateLlmAnnotationAction();
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
      body: JSON.stringify({ order: targetOrder, force: !isPoll, discover: !isPoll }),
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
  const maxWaitMs = 60000;
  let lastPayload = null;
  let refreshStarted = false;
  const report = (text) => {
    if (typeof options.onProgress === 'function') options.onProgress(targetOrder, text);
    else setBatchSessionRefreshStatus(text);
  };
  setSessionRefreshButtonState(targetOrder, 'loading');
  refreshingSessionOrders.add(targetOrder);
  try {
    while (Date.now() - startedAt < maxWaitMs) {
      const response = await fetchWithTimeout('/api/refresh-trae-session-rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: targetOrder,
          force: !refreshStarted,
          discover: !refreshStarted,
        }),
      }, 0);
      refreshStarted = true;
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.busy ? '刷新繁忙，请稍后再点' : (payload.error || '刷新失败'));
      lastPayload = payload;
      const rowCount = sessionPayloadRowCount(payload);
      if (payload.refreshPending) {
        const expectedText = payload.expectedRows ? `，预计 ${payload.expectedRows}` : '';
        report(`后台深扫中：${targetOrder} 当前 ${rowCount}/${threshold}${expectedText}`);
        await sleep(2500);
        continue;
      }
      if (rowCount >= threshold) {
        setSessionRefreshButtonState(targetOrder, 'success');
        return { payload, rowCount, complete: true };
      }
      if (payload.deepScan || payload.refreshNoNewRows || payload.refreshNoLogTraceChanges) {
        setSessionRefreshButtonState(targetOrder, rowCount > 0 ? 'success' : 'empty');
        return { payload, rowCount, complete: false };
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
  if (batchMissingRefreshInProgress) {
    if (!options.auto) setBatchSessionRefreshStatus('已有未达标刷新正在进行中');
    return false;
  }
  const threshold = Number.parseInt(String(batchSessionMinRowsInput?.value || ''), 10);
  if (!Number.isInteger(threshold) || threshold <= 0) {
    setBatchSessionRefreshStatus('请输入大于 0 的最低记录数', true);
    return;
  }
  const { groupName, orders: collectedOrders } = collectBatchOrders();
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
  refreshBatchMissingSessionsButton.disabled = true;
  if (autoBatchMissingSessionsButton) autoBatchMissingSessionsButton.disabled = true;
  const progress = new Map(missingOrders.map((order) => [order, '等待']));
  const summarizeProgress = () => {
    const finished = Array.from(progress.values()).filter((value) => value.startsWith('完成') || value.startsWith('未达标') || value.startsWith('失败')).length;
    const running = missingOrders
      .filter((order) => {
        const value = progress.get(order) || '';
        return value && !value.startsWith('等待') && !value.startsWith('完成') && !value.startsWith('未达标') && !value.startsWith('失败');
      })
      .slice(0, 3);
    const runningText = running.length ? `；进行中：${running.join(', ')}` : '';
    setBatchSessionRefreshStatus(`${options.auto ? '批组刷新' : '并行刷新'} ${finished}/${missingOrders.length}${runningText}`);
  };
  setBatchSessionRefreshStatus(`待刷新 ${missingOrders.length} 项，并行上限 3：${missingOrders.join(', ')}`);
  try {
    await runWithConcurrency(missingOrders, 3, async (order) => {
      const beforeCount = counts.get(order) || 0;
      progress.set(order, `启动 ${beforeCount}/${threshold}`);
      summarizeProgress();
      try {
        const result = await refreshMissingSessionOrder(order, threshold, {
          onProgress: (_, text) => {
            progress.set(order, text);
            summarizeProgress();
          },
        });
        progress.set(order, `${result.complete ? '完成' : '未达标'} ${result.rowCount}/${threshold}`);
        summarizeProgress();
        return result;
      } catch (error) {
        progress.set(order, `失败 ${error.message || error}`);
        summarizeProgress();
        throw error;
      }
    });
    setBatchSessionRefreshStatus('已发起未达标项目刷新，正在重新读取批量会话...');
    const results = await fetchBatchRowsForOrders(currentBatchSessionGroupName || groupName, orders);
    renderBatchSessionRows({ groupName: currentBatchSessionGroupName || groupName, orders, rows: results });
    const nextCounts = batchSessionRowCounts(results);
    const stillMissing = orders.filter((order) => (nextCounts.get(order) || 0) < threshold);
    setBatchSessionRefreshStatus(
      stillMissing.length
        ? `已刷新一次，仍未达标：${stillMissing.join(', ')}`
        : `刷新完成，全部达到 ${threshold} 条`,
      stillMissing.length > 0,
    );
  } catch (error) {
    setBatchSessionRefreshStatus(`批量刷新失败：${error.message || error}`, true);
  } finally {
    batchMissingRefreshInProgress = false;
    refreshBatchMissingSessionsButton.disabled = false;
    if (autoBatchMissingSessionsButton) autoBatchMissingSessionsButton.disabled = false;
  }
  return true;
}

function updateAutoBatchMissingButton(renderStatus = true) {
  if (!autoBatchMissingSessionsButton) return;
  autoBatchMissingSessionsButton.textContent = batchMissingRefreshInProgress ? '批组刷新中' : '批组刷新';
  autoBatchMissingSessionsButton.classList.toggle('is-on', batchMissingRefreshInProgress);
  autoBatchMissingSessionsButton.setAttribute('aria-pressed', 'false');
  if (renderStatus) renderAutoBatchWatchedGroups();
}

async function runAutoBatchMissingCheck() {
  autoBatchMissingEnabled = true;
  let startedRefresh = false;
  try {
    if (batchPasteInProgress) {
      setAutoBatchStatus('批组刷新暂缓：正在执行一键粘贴');
      return;
    }
    if (batchMissingRefreshInProgress) return;
    const queuedGroups = autoBatchQueueGroupNames();
    if (!queuedGroups.names.length) {
      setAutoBatchStatus(
        queuedGroups.source === 'selected'
          ? '所选组没有项目，不能排队刷新未达标项目'
          : '请先在“选择组”里勾选要批组刷新的组',
        true,
      );
      return;
    }
    const threshold = autoBatchThreshold();
    if (autoBatchMinRowsInput) autoBatchMinRowsInput.value = String(threshold);
    batchMissingRefreshInProgress = true;
    startedRefresh = true;
    updateAutoBatchMissingButton(false);
    if (refreshBatchMissingSessionsButton) refreshBatchMissingSessionsButton.disabled = true;
    if (autoBatchMissingSessionsButton) autoBatchMissingSessionsButton.disabled = true;
    setAutoBatchStatus(`批组刷新已启动：${queuedGroups.names.length} 组，按组顺序刷新未达标项目`);

    let totalOrders = 0;
    let totalMissing = 0;
    const stillMissing = [];
    const failedOrders = [];
    for (const [groupIndex, groupName] of queuedGroups.names.entries()) {
      if (!autoBatchMissingEnabled) {
        setAutoBatchStatus(`批组刷新已停止：完成到第 ${groupIndex}/${queuedGroups.names.length} 组`);
        return;
      }
      const orders = normalizeBatchOrders(batchGroups[groupName] || []);
      if (!orders.length) continue;
      totalOrders += orders.length;
      setAutoBatchStatus(`批组刷新 ${groupIndex + 1}/${queuedGroups.names.length}：${groupName}，读取 ${orders.length} 个项目`);

      const rowsByOrder = new Map();
      await runWithConcurrency(orders, 6, async (order) => {
        const rows = await fetchSessionRowsForOrder(order);
        rowsByOrder.set(order, rows);
        return rows;
      });

      const missingOrders = orders.filter((order) => sessionRowsValidCount(rowsByOrder.get(order) || []) < threshold);
      if (!missingOrders.length) {
        setAutoBatchStatus(`批组刷新 ${groupIndex + 1}/${queuedGroups.names.length}：${groupName} 已达标`);
        continue;
      }
      totalMissing += missingOrders.length;
      const progress = new Map(missingOrders.map((order) => [order, '等待']));
      const summarize = () => {
        const finished = Array.from(progress.values()).filter((value) => value.startsWith('完成') || value.startsWith('未达标') || value.startsWith('失败')).length;
        const running = missingOrders
          .filter((order) => {
            const value = progress.get(order) || '';
            return value && !value.startsWith('等待') && !value.startsWith('完成') && !value.startsWith('未达标') && !value.startsWith('失败');
          })
          .slice(0, 3);
        const runningText = running.length ? `；进行中：${running.join(', ')}` : '';
        setAutoBatchStatus(`批组刷新 ${groupIndex + 1}/${queuedGroups.names.length}：${groupName}，刷新未达标 ${finished}/${missingOrders.length}${runningText}`);
      };

      await runWithConcurrency(missingOrders, 3, async (order) => {
        if (!autoBatchMissingEnabled) return null;
        progress.set(order, `启动 ${sessionRowsValidCount(rowsByOrder.get(order) || [])}/${threshold}`);
        summarize();
        try {
          const result = await refreshMissingSessionOrder(order, threshold, {
            onProgress: (_, text) => {
              progress.set(order, text);
              summarize();
            },
          });
          progress.set(order, `${result.complete ? '完成' : '未达标'} ${result.rowCount}/${threshold}`);
          summarize();
          return result;
        } catch (error) {
          failedOrders.push(order);
          progress.set(order, `失败 ${error.message || error}`);
          summarize();
          return null;
        }
      });

      const finalRowsByOrder = new Map();
      await runWithConcurrency(orders, 6, async (order) => {
        const rows = await fetchSessionRowsForOrder(order);
        finalRowsByOrder.set(order, rows);
        return rows;
      });
      const groupStillMissing = orders.filter((order) => sessionRowsValidCount(finalRowsByOrder.get(order) || []) < threshold);
      stillMissing.push(...groupStillMissing);
      if (batchSessionModal?.open && currentBatchSessionOrders.some((order) => orders.includes(order))) {
        const results = await fetchBatchRowsForOrders(currentBatchSessionGroupName || currentBatchGroupName(), currentBatchSessionOrders);
        renderBatchSessionRows({
          groupName: currentBatchSessionGroupName || currentBatchGroupName(),
          orders: currentBatchSessionOrders,
          rows: results,
        });
      }
    }

    setAutoBatchStatus(
      stillMissing.length
        ? `批组刷新完成：本轮刷新未达标 ${totalMissing} 项，仍未达标 ${stillMissing.length}/${totalOrders}：${stillMissing.slice(0, 8).join(', ')}${stillMissing.length > 8 ? '...' : ''}`
        : `批组刷新完成：${queuedGroups.names.length} 组全部达到 ${threshold} 轮${failedOrders.length ? `，失败 ${failedOrders.length} 项` : ''}`,
      stillMissing.length > 0 || failedOrders.length > 0,
    );
    if (batchSessionModal?.open && currentBatchSessionOrders.length) {
      const results = await fetchBatchRowsForOrders(currentBatchSessionGroupName || currentBatchGroupName(), currentBatchSessionOrders);
      renderBatchSessionRows({
        groupName: currentBatchSessionGroupName || currentBatchGroupName(),
        orders: currentBatchSessionOrders,
        rows: results,
      });
    }
  } finally {
    autoBatchMissingEnabled = false;
    if (startedRefresh) {
      batchMissingRefreshInProgress = false;
      if (refreshBatchMissingSessionsButton) refreshBatchMissingSessionsButton.disabled = false;
      if (autoBatchMissingSessionsButton) autoBatchMissingSessionsButton.disabled = false;
    }
    updateAutoBatchMissingButton(false);
  }
}

async function setCompleted(promptId, completed) {
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
  const fragment = document.createDocumentFragment();
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
    fragment.appendChild(tr);
  }
  rowsEl.appendChild(fragment);
}

function selectPrompt(promptId) {
  const previousPromptId = selectedPromptId;
  selectedPromptId = promptId;
  const prompt = prompts.find((item) => item.id === promptId);
  selectedParts = splitPrompt(prompt?.prompt || '未找到 Prompt，请先重新生成方案数据。');
  promptBackground.textContent = selectedParts.background;
  promptFeatures.textContent = selectedParts.features;
  promptDelivery.textContent = selectedParts.delivery;
  updatePromptPreviewVisibility();
  updateSelectedRowHighlight(previousPromptId, selectedPromptId);
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
    if (githubRepoUrlInput) githubRepoUrlInput.value = String(payload.default_github_repo_url || '').trim();
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

async function loadAuxiliaryStatsData() {
  try {
    const [loadedCandidates, loadedAtoms] = await Promise.all([
      loadJson('./data/generated/zero_to_one_candidates.json', []),
      loadJson('./data/normalized/product_atoms.json', []),
    ]);
    candidates = loadedCandidates.map((candidate) => ({
      ...candidate,
      business_domain: normalizeDomainName(candidate.business_domain),
    }));
    atoms = loadedAtoms.map((atom) => ({
      ...atom,
      business_domain: normalizeDomainName(atom.business_domain),
    }));
    renderStats();
  } catch (error) {
    console.warn('辅助统计数据加载失败:', error);
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
    });
  }
  if (batchGroupNameInput) {
    batchGroupNameInput.addEventListener('input', updateWatchCurrentBatchGroupButton);
  }
  if (batchGroupSelect) {
    batchGroupSelect.addEventListener('change', () => loadBatchGroup(batchGroupSelect.value));
  }
  if (batchSelectAllGroupsButton) {
    batchSelectAllGroupsButton.addEventListener('click', (event) => {
      event.stopPropagation();
      selectAllBatchGroups();
    });
  }
  if (batchClearSelectedGroupsButton) {
    batchClearSelectedGroupsButton.addEventListener('click', (event) => {
      event.stopPropagation();
      clearSelectedBatchGroups();
    });
  }
  if (batchAddSelectedGroupsButton) {
    batchAddSelectedGroupsButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      await addSelectedBatchGroupsToAutoBatch();
    });
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
if (runLlmDissatisfactionButton) {
  runLlmDissatisfactionButton.addEventListener('click', async () => {
    await runLlmDissatisfactionForCurrentBatch();
  });
}
}


function renderSceneButtons() {
  const domains = uniqueSorted(prompts.map((prompt) => prompt.business_domain));
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
  fillSelect(domainFilter, uniqueSorted(prompts.map((prompt) => prompt.business_domain)), '业务', displayDomainName);
  fillSelect(userFilter, uniqueSorted(prompts.map((prompt) => prompt.target_user)), '用户');
  fillSelect(platformFilter, uniqueSorted(prompts.map((prompt) => prompt.product_form)), '平台');
  fillSelect(scenarioFilter, uniqueSorted(prompts.map((prompt) => prompt.scenario)), '场景');
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
  const [, , loadedPrompts] = await Promise.all([
    loadWorkbenchConfig(),
    loadPromptState(),
    loadJson('./data/generated/generation_prompts.json', []),
  ]);
  prompts = loadedPrompts;
  prompts = prompts.map((prompt) => ({
    ...prompt,
    business_domain: normalizeDomainName(prompt.business_domain),
  }));
  bindFilters();
  bindBatchTraeControls();
  if ([...domainFilter.options].some((option) => option.value === 'shopping')) domainFilter.value = 'shopping';
  renderSceneButtons();
  applyFilters();
  window.setTimeout(async () => {
    await fetchBatchGroups();
    if (!Object.keys(batchGroups).length) renderBatchProjectList();
    loadAuxiliaryStatsData();
  }, 0);
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
  autoBatchMissingSessionsButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (batchMissingRefreshInProgress) {
      setAutoBatchStatus('批组刷新正在进行中');
      return;
    }
    await runAutoBatchMissingCheck();
  });
}

if (watchCurrentBatchGroupButton) {
  watchCurrentBatchGroupButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    try {
      await toggleCurrentBatchGroupWatch();
    } catch (error) {
      setAutoBatchStatus(`刷新队列设置失败：${error.message || error}`, true);
    }
  });
}

if (autoBatchMinRowsInput) {
  const storedAutoThreshold = Number.parseInt(String(localStorage.getItem('autoBatchMinRows') || ''), 10);
  if (Number.isInteger(storedAutoThreshold) && storedAutoThreshold > 0) {
    autoBatchMinRowsInput.value = String(storedAutoThreshold);
  }
  autoBatchMinRowsInput.addEventListener('change', () => {
    const threshold = autoBatchThreshold();
    autoBatchMinRowsInput.value = String(threshold);
    localStorage.setItem('autoBatchMinRows', String(threshold));
    setAutoBatchStatus(`批组刷新目标已设为 ${threshold} 轮`);
  });
}

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
