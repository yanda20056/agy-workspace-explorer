import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { z } from 'zod/v4';

const app = new App({ name: 'Workspace Explorer', version: '1.0.0' }, {});

const ToggleAuxPaneResultSchema = z.object({ isError: z.boolean().optional() }).passthrough();

const KEY_SEP = '\0';

function makeDirKey(rootPath, relPath = '') {
  return `${rootPath}${KEY_SEP}${relPath}`;
}

function parseDirKey(key) {
  const idx = key.indexOf(KEY_SEP);
  if (idx === -1) return { rootPath: key, relPath: '' };
  return { rootPath: key.slice(0, idx), relPath: key.slice(idx + 1) };
}

function detectInitialLang() {
  try {
    const saved = window.localStorage?.getItem('workspace_explorer_lang');
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    // ignore storage restriction
  }
  return 'en';
}

const I18N = {
  en: {
    switchProjectTitle: 'Switch Project',
    switchLangTitle: 'Switch language (Current: English → Click for 中文)',
    langBtnText: 'EN',
    allModeTitle: 'Toggle: All Projects / Current Project View',
    collapseAllTitle: 'Collapse All',
    toggleHiddenTitle: 'Show/Hide Dotfiles (starting with .)',
    refreshTitle: 'Refresh Directory',
    searchClearTitle: 'Clear Search',
    fuzzyTitle: 'Fuzzy Match — exact substring match when off',
    caseTitle: 'Match Case',
    regexTitle: 'Use Regular Expression',
    resizerTitle: 'Drag to resize preview pane',
    copyRelBtn: 'Rel Path',
    copyRelTitle: 'Copy Relative Path',
    copyAbsBtn: 'Full Path',
    copyAbsTitle: 'Copy Full Path',
    openNativeBtn: 'Open Tab',
    openNativeTitle: 'Open in Native Tab',
    closePreviewTitle: 'Close Preview',
    allProjectsOption: (n) => `All Projects (${n})`,
    allProjectsSubbar: (n) => `${n} projects (click to expand, or click "Focus" to view single project)`,
    allProjectsBadge: 'All Projects',
    badgeArg: 'Active Chat Project',
    badgeActiveChat: 'Active Chat Project',
    badgeSelectedProject: 'Selected Project',
    badgeRoots: 'Active Workspace',
    badgeCwd: 'Active Workspace',
    badgeManual: 'Manual Selection',
    badgeSingleKnown: 'Current Project',
    badgeDefault: 'Current Project',
    noProjectSubbar: 'No local project detected',
    loadingProjectsSubbar: 'Loading projects...',
    connectingEmpty: 'Connecting to Workspace Explorer...',
    loadingDirEmpty: 'Loading project directory...',
    noProjectsEmpty: 'No local projects found. Please add a project in Antigravity Projects sidebar.',
    selectProjectEmpty: 'Please select a project above',
    loadingNode: 'Loading...',
    emptyDirNode: '(empty directory)',
    searchingEmpty: 'Searching...',
    regexErrorEmpty: (err) => `Regex syntax error: ${err}`,
    noMatchEmpty: (q) => `No files or folders matching "${q}"`,
    placeholderRegexCase: 'Regex search (case-sensitive, e.g. \\.scene$)...',
    placeholderRegex: 'Regex search (e.g. \\.scene$ or ^Cfg)...',
    placeholderFuzzyCase: 'Fuzzy search (case-sensitive)...',
    placeholderFuzzy: 'Fuzzy search file name or path...',
    placeholderExactCase: 'Exact substring search (case-sensitive)...',
    placeholderExact: 'Exact substring search file name or path...',
    rowRevealTitle: 'Reveal in Tree',
    rowPreviewTitle: 'Inline Preview',
    rowFocusBtn: 'Focus',
    rowFocusTitle: 'Focus this project',
    rowCopyProjPathTitle: 'Copy Project Full Path',
    ctxCollapseProject: 'Collapse Project',
    ctxExpandProject: 'Expand Project',
    ctxFocusProject: 'Focus Project (Single Project View)',
    ctxOpenNative: 'Open File (Native Tab)',
    ctxInlinePreview: 'Inline Preview File',
    ctxRevealFile: 'Reveal in Tree',
    ctxRevealDir: 'Expand & Reveal in Tree',
    ctxCollapseDir: 'Collapse Folder',
    ctxExpandDir: 'Expand Folder',
    ctxRevealInOs: 'Reveal in File Explorer',
    ctxCopyRel: 'Copy Relative Path',
    ctxCopyAbs: 'Copy Full Path',
    ctxCopyName: 'Copy Name',
    ctxAttachChat: 'Attach to Chat Context',
    labelPath: 'path',
    labelRelPath: 'relative path',
    labelAbsPath: 'full path',
    labelName: 'name',
    labelProjPath: 'project path',
    toastCopied: (label, text) => `Copied ${label}: ${text}`,
    toastCopyFailed: (text) => `Copy failed, please copy manually: ${text}`,
    toastReadDirFailed: (msg) => `Failed to read directory: ${msg}`,
    toastOpened: (name) => `Opened: ${name}`,
    toastRevealedInOs: (name) => `Opened in system file manager: ${name}`,
    toastRevealInOsFailed: (msg) => `Failed to open system file manager: ${msg}`,
    toastAttached: (p) => `Attached to chat context: ${p}`,
    toastSearchFailed: (msg) => `Search failed: ${msg}`,
    toastCollapsedAll: 'Collapsed all folders',
    toastRefreshed: 'Directory refreshed',
    toastFuzzyOn: 'Fuzzy match enabled (~)',
    toastFuzzyOff: 'Switched to exact substring match',
    toastCaseOn: 'Match case enabled (Aa)',
    toastCaseOff: 'Match case disabled',
    toastRegexOn: 'Regular expression search enabled (.*)',
    toastRegexOff: 'Regular expression search disabled',
    toastLangSwitched: 'Language: English',
    previewLoading: 'Loading file content...',
    previewBinary: (kb) => `[Binary file, size ${kb} KB, text preview not supported]`,
    previewTruncated: '\n\n... [File exceeds 200KB, output truncated]',
    previewReadError: (msg) => `Failed to read file: ${msg}`,
    scriptError: (msg) => `Script error: ${msg}`,
    connectError: (msg) => `Failed to connect to host: ${msg}`,
  },
  zh: {
    switchProjectTitle: '切换工程',
    switchLangTitle: '切换语言 (当前: 中文 → 点击切换为 English)',
    langBtnText: '中',
    allModeTitle: '切换：全部工程视图 / 当前工程视图',
    collapseAllTitle: '全部折叠',
    toggleHiddenTitle: '显示/隐藏以 . 开头的隐藏文件',
    refreshTitle: '刷新目录',
    searchClearTitle: '清除搜索',
    fuzzyTitle: '模糊查找 (Fuzzy Match) — 关闭时为精确子串匹配',
    caseTitle: '区分大小写 (Match Case)',
    regexTitle: '使用正则表达式 (Use Regular Expression)',
    resizerTitle: '拖动调整预览区高度',
    copyRelBtn: '相对路径',
    copyRelTitle: '复制相对路径',
    copyAbsBtn: '绝对路径',
    copyAbsTitle: '复制绝对路径',
    openNativeBtn: '标签页打开',
    openNativeTitle: '在原生标签页打开',
    closePreviewTitle: '关闭预览',
    allProjectsOption: (n) => `全部工程 (${n})`,
    allProjectsSubbar: (n) => `共 ${n} 个工程（点击展开，或点右侧“聚焦”单看某工程）`,
    allProjectsBadge: '全部工程',
    badgeArg: '当前对话工程',
    badgeActiveChat: '当前对话工程',
    badgeSelectedProject: '当前选中工程',
    badgeRoots: '当前工作区',
    badgeCwd: '当前工作区',
    badgeManual: '手动选择',
    badgeSingleKnown: '当前工程',
    badgeDefault: '当前工程',
    noProjectSubbar: '未检测到本地工程',
    loadingProjectsSubbar: '正在加载工程...',
    connectingEmpty: '正在连接 Workspace Explorer...',
    loadingDirEmpty: '正在加载工程目录...',
    noProjectsEmpty: '未找到任何本地工程，请在 Antigravity 左侧 Projects 添加工程。',
    selectProjectEmpty: '请在上方选择一个工程',
    loadingNode: '加载中...',
    emptyDirNode: '(空目录)',
    searchingEmpty: '正在搜索...',
    regexErrorEmpty: (err) => `正则表达式语法错误: ${err}`,
    noMatchEmpty: (q) => `未找到匹配 "${q}" 的文件或目录`,
    placeholderRegexCase: '正则搜索 (区分大小写, 如 \\.scene$)...',
    placeholderRegex: '正则搜索 (如 \\.scene$ 或 ^Cfg)...',
    placeholderFuzzyCase: '模糊搜索 (区分大小写)...',
    placeholderFuzzy: '模糊搜索文件名或路径...',
    placeholderExactCase: '精确子串搜索 (区分大小写)...',
    placeholderExact: '精确子串搜索文件名或路径...',
    rowRevealTitle: '在目录树中定位',
    rowPreviewTitle: '内置预览',
    rowFocusBtn: '聚焦',
    rowFocusTitle: '聚焦此工程',
    rowCopyProjPathTitle: '复制工程绝对路径',
    ctxCollapseProject: '折叠工程目录',
    ctxExpandProject: '展开工程目录',
    ctxFocusProject: '聚焦此工程 (单工程视图)',
    ctxOpenNative: '打开文件 (原生标签页)',
    ctxInlinePreview: '内置预览文件内容',
    ctxRevealFile: '在目录树中定位',
    ctxRevealDir: '在目录树中展开定位',
    ctxCollapseDir: '折叠文件夹',
    ctxExpandDir: '展开文件夹',
    ctxRevealInOs: '在系统文件窗口中打开',
    ctxCopyRel: '复制相对路径',
    ctxCopyAbs: '复制绝对路径',
    ctxCopyName: '复制名称',
    ctxAttachChat: '附到对话上下文',
    labelPath: '路径',
    labelRelPath: '相对路径',
    labelAbsPath: '绝对路径',
    labelName: '名称',
    labelProjPath: '工程路径',
    toastCopied: (label, text) => `已复制${label}: ${text}`,
    toastCopyFailed: (text) => `复制失败，请手动复制: ${text}`,
    toastReadDirFailed: (msg) => `读取目录失败: ${msg}`,
    toastOpened: (name) => `已打开: ${name}`,
    toastRevealedInOs: (name) => `已在系统文件窗口中打开: ${name}`,
    toastRevealInOsFailed: (msg) => `打开系统文件窗口失败: ${msg}`,
    toastAttached: (p) => `已附到对话上下文: ${p}`,
    toastSearchFailed: (msg) => `搜索失败: ${msg}`,
    toastCollapsedAll: '已全部折叠',
    toastRefreshed: '目录已刷新',
    toastFuzzyOn: '已开启模糊查找 (~)',
    toastFuzzyOff: '已切换为精确子串查找',
    toastCaseOn: '已开启区分大小写 (Aa)',
    toastCaseOff: '已关闭区分大小写',
    toastRegexOn: '已开启正则表达式查找 (.*)',
    toastRegexOff: '已关闭正则表达式查找',
    toastLangSwitched: '语言已切换为: 中文',
    previewLoading: '正在加载文件内容...',
    previewBinary: (kb) => `[二进制文件，大小 ${kb} KB，不支持文本预览]`,
    previewTruncated: '\n\n... [文件超过 200KB，已截断显示]',
    previewReadError: (msg) => `无法读取文件: ${msg}`,
    scriptError: (msg) => `脚本错误: ${msg}`,
    connectError: (msg) => `连接宿主失败: ${msg}`,
  },
};

const state = {
  lang: detectInitialLang(), // 'en' (default) | 'zh'
  projects: [],
  activeProject: null,
  viewMode: 'all', // 'single' | 'all'
  detectedBy: 'all',
  showHidden: true,
  searchQuery: '',
  searchFuzzy: true,
  searchCaseSensitive: false,
  searchRegex: false,
  regexError: null,
  searchResults: null,
  searching: false,
  selectedKey: null,
  expandedDirs: new Set(), // makeDirKey(rootPath, relPath) where relPath !== ''
  expandedProjects: new Set(), // rootPath (used in 'all' mode)
  dirCache: new Map(), // makeDirKey(rootPath, relPath) -> entries[]
  loadingKeys: new Set(),
  previewItem: null,
  capabilities: {},
  initialized: false,
  lastAutoSignalTime: 0,
  lastAutoConversationId: null,
  manualOverrideAt: 0,
};

function t(key, ...args) {
  const dict = I18N[state.lang] || I18N.en;
  const val = dict[key] ?? I18N.en[key];
  return typeof val === 'function' ? val(...args) : val;
}

let searchSeq = 0;
let previewSeq = 0;

// DOM elements
const $projectSelect = document.getElementById('projectSelect');
const $btnLang = document.getElementById('btnLang');
const $btnAllMode = document.getElementById('btnAllMode');
const $btnCollapseAll = document.getElementById('btnCollapseAll');
const $btnToggleHidden = document.getElementById('btnToggleHidden');
const $btnRefresh = document.getElementById('btnRefresh');
const $searchInput = document.getElementById('searchInput');
const $searchClear = document.getElementById('searchClear');
const $btnFuzzy = document.getElementById('btnFuzzy');
const $btnCase = document.getElementById('btnCase');
const $btnRegex = document.getElementById('btnRegex');
const $subbarPath = document.getElementById('subbarPath');
const $subbarBadge = document.getElementById('subbarBadge');
const $treeContainer = document.getElementById('treeContainer');
const $previewPane = document.getElementById('previewPane');
const $previewResizer = document.getElementById('previewResizer');
const $previewTitle = document.getElementById('previewTitle');
const $previewBody = document.getElementById('previewBody');
const $btnPreviewCopyRel = document.getElementById('btnPreviewCopyRel');
const $btnPreviewCopyAbs = document.getElementById('btnPreviewCopyAbs');
const $btnPreviewOpenNative = document.getElementById('btnPreviewOpenNative');
const $btnPreviewClose = document.getElementById('btnPreviewClose');
const $ctxMenu = document.getElementById('ctxMenu');
const $toast = document.getElementById('toast');

function renderStaticTexts() {
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  $projectSelect.title = t('switchProjectTitle');
  if ($btnLang) {
    $btnLang.textContent = t('langBtnText');
    $btnLang.title = t('switchLangTitle');
  }
  $btnAllMode.title = t('allModeTitle');
  $btnCollapseAll.title = t('collapseAllTitle');
  $btnToggleHidden.title = t('toggleHiddenTitle');
  $btnRefresh.title = t('refreshTitle');
  $searchClear.title = t('searchClearTitle');
  $btnFuzzy.title = t('fuzzyTitle');
  $btnCase.title = t('caseTitle');
  $btnRegex.title = t('regexTitle');
  $previewResizer.title = t('resizerTitle');
  $btnPreviewCopyRel.textContent = t('copyRelBtn');
  $btnPreviewCopyRel.title = t('copyRelTitle');
  $btnPreviewCopyAbs.textContent = t('copyAbsBtn');
  $btnPreviewCopyAbs.title = t('copyAbsTitle');
  $btnPreviewOpenNative.textContent = t('openNativeBtn');
  $btnPreviewOpenNative.title = t('openNativeTitle');
  $btnPreviewClose.title = t('closePreviewTitle');
}

let toastTimer = null;
function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('show'), 2200);
}

function setEmptyMessage(container, text) {
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.textContent = text;
  container.appendChild(div);
}

async function copyText(text, label) {
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch {
    ok = false;
  }
  if (!ok) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      ok = false;
    }
  }
  if (ok) {
    showToast(t('toastCopied', label, text));
  } else {
    showToast(t('toastCopyFailed', text));
  }
}

// Host enforces at most 4 in-flight tool calls per app; cap concurrency at 3
async function runWithConcurrency(tasks, limit = 3) {
  const queue = [...tasks];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const fn = queue.shift();
      if (fn) await fn();
    }
  });
  await Promise.all(workers);
}

function getFileIconInfo(item) {
  if (item.isDir) {
    return { svg: 'folder', color: '#eab308' };
  }
  const ext = (item.ext || '').toLowerCase();
  const map = {
    ts: { label: 'TS', color: '#3b82f6' },
    tsx: { label: 'TX', color: '#3b82f6' },
    js: { label: 'JS', color: '#eab308' },
    mjs: { label: 'JS', color: '#eab308' },
    cjs: { label: 'JS', color: '#eab308' },
    jsx: { label: 'JX', color: '#38bdf8' },
    json: { label: '{}', color: '#f59e0b' },
    md: { label: 'MD', color: '#60a5fa' },
    py: { label: 'PY', color: '#22c55e' },
    scene: { label: 'SC', color: '#a855f7' },
    prefab: { label: 'PF', color: '#c084fc' },
    meta: { label: 'MT', color: '#71717a' },
    css: { label: 'CS', color: '#38bdf8' },
    scss: { label: 'SC', color: '#ec4899' },
    html: { label: '<>', color: '#f97316' },
    png: { label: 'IM', color: '#10b981' },
    jpg: { label: 'IM', color: '#10b981' },
    jpeg: { label: 'IM', color: '#10b981' },
    webp: { label: 'IM', color: '#10b981' },
    svg: { label: 'SV', color: '#14b8a6' },
    xlsx: { label: 'XL', color: '#22c55e' },
    csv: { label: 'CS', color: '#22c55e' },
    yaml: { label: 'YM', color: '#fb7185' },
    yml: { label: 'YM', color: '#fb7185' },
    sh: { label: '$_', color: '#4ade80' },
    ps1: { label: 'PS', color: '#60a5fa' },
  };
  return map[ext] || { svg: 'file', color: '#9ca3af' };
}

function createIconNode(item, isOpen = false) {
  const span = document.createElement('span');
  span.className = 'file-icon';
  const info = getFileIconInfo(item);
  span.style.color = info.color;

  if (info.svg === 'folder') {
    span.innerHTML = isOpen
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;
  } else if (info.svg === 'file') {
    span.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
  } else {
    span.textContent = info.label;
    span.style.fontSize = '9.5px';
    span.style.fontFamily = 'var(--font-mono)';
  }
  return span;
}

function createChevron(isOpen, isSpacer = false) {
  const span = document.createElement('span');
  span.className = 'chevron' + (isOpen ? ' open' : '') + (isSpacer ? ' spacer' : '');
  span.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
  return span;
}

async function callTool(name, args = {}) {
  const res = await app.callServerTool({ name, arguments: args });
  if (res?.isError) {
    const errText = res?.content?.[0]?.text || 'Tool error';
    throw new Error(errText);
  }
  return res?.structuredContent;
}

async function ensureDirLoaded(rootPath, relPath = '', force = false, silentRender = false) {
  const key = makeDirKey(rootPath, relPath);
  if (!force && state.dirCache.has(key)) return state.dirCache.get(key);
  if (state.loadingKeys.has(key)) return state.dirCache.get(key) || [];

  state.loadingKeys.add(key);
  if (!silentRender) renderTree();
  try {
    const data = await callTool('list_dir', {
      rootPath,
      relPath,
      showHidden: state.showHidden,
    });
    const entries = data?.entries || [];
    state.dirCache.set(key, entries);
    return entries;
  } catch (err) {
    showToast(t('toastReadDirFailed', err.message));
    return [];
  } finally {
    state.loadingKeys.delete(key);
    if (!silentRender) renderTree();
  }
}

async function reloadVisibleDirs() {
  const targets = []; // Array<{ rootPath, relPath }>
  const seen = new Set();
  const pushTarget = (rootPath, relPath) => {
    const k = makeDirKey(rootPath, relPath);
    if (seen.has(k)) return;
    seen.add(k);
    targets.push({ rootPath, relPath });
  };

  if (state.viewMode === 'single' && state.activeProject) {
    const rp = state.activeProject.rootPath;
    pushTarget(rp, '');
    for (const k of state.expandedDirs) {
      const parsed = parseDirKey(k);
      if (parsed.rootPath === rp) {
        pushTarget(parsed.rootPath, parsed.relPath);
      }
    }
  } else {
    for (const rp of state.expandedProjects) {
      pushTarget(rp, '');
      for (const k of state.expandedDirs) {
        const parsed = parseDirKey(k);
        if (parsed.rootPath === rp) {
          pushTarget(parsed.rootPath, parsed.relPath);
        }
      }
    }
  }

  state.dirCache.clear();
  await runWithConcurrency(
    targets.map((t) => () => ensureDirLoaded(t.rootPath, t.relPath, true, true)),
    3,
  );
  renderTree();
}

async function revealInTree(rootPath, relPath, isDir) {
  // Clear search mode so tree is visible
  searchSeq++;
  state.searchQuery = '';
  state.regexError = null;
  state.searching = false;
  $searchInput.value = '';
  $searchClear.classList.remove('visible');
  state.searchResults = null;
  renderSearchControls();

  if (state.viewMode === 'all') {
    state.expandedProjects.add(rootPath);
  } else {
    const proj = state.projects.find((p) => p.rootPath === rootPath);
    if (proj) {
      state.activeProject = proj;
    }
  }

  const segments = relPath ? relPath.split('/').filter(Boolean) : [];
  const dirsToOpen = [''];
  let acc = '';
  const limit = isDir ? segments.length : Math.max(0, segments.length - 1);
  for (let i = 0; i < limit; i++) {
    acc = acc ? `${acc}/${segments[i]}` : segments[i];
    dirsToOpen.push(acc);
    state.expandedDirs.add(makeDirKey(rootPath, acc));
  }

  state.selectedKey = makeDirKey(rootPath, relPath);
  renderHeader();

  await runWithConcurrency(
    dirsToOpen.map((rel) => () => ensureDirLoaded(rootPath, rel, false, true)),
    3,
  );
  renderTree();

  requestAnimationFrame(() => {
    const selectedEl = $treeContainer.querySelector('.tree-row.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
}

async function openFileInNativePane(item, rootPath) {
  try {
    const result = await app.request(
      {
        method: 'com.google.antigravity/toggle-aux-pane',
        params: { tabType: 'fileView', uri: item.fileUri },
      },
      ToggleAuxPaneResultSchema,
    );
    if (result?.isError) {
      await openFileInlinePreview(item, rootPath);
    } else {
      showToast(t('toastOpened', item.name));
    }
  } catch {
    await openFileInlinePreview(item, rootPath);
  }
}

async function openFileInlinePreview(item, rootPath) {
  const seq = ++previewSeq;
  state.previewItem = { ...item, rootPath };
  $previewTitle.textContent = item.relPath || item.name;
  $previewBody.textContent = t('previewLoading');
  $previewPane.classList.add('open');

  try {
    const data = await callTool('read_file_preview', {
      rootPath,
      relPath: item.relPath,
    });
    if (seq !== previewSeq) return;
    if (data.isBinary) {
      $previewBody.textContent = t('previewBinary', (data.size / 1024).toFixed(1));
    } else {
      const lines = data.content.split(/\r?\n/);
      const pad = String(lines.length).length;
      const numbered = lines
        .map((line, idx) => `${String(idx + 1).padStart(pad, ' ')} │ ${line}`)
        .join('\n');
      $previewBody.textContent =
        numbered + (data.truncated ? t('previewTruncated') : '');
    }
  } catch (err) {
    if (seq !== previewSeq) return;
    $previewBody.textContent = t('previewReadError', err.message);
  }
}

async function attachPathToChat(item) {
  if (!state.capabilities?.updateModelContext) {
    await copyText(item.relPath || item.absPath, t('labelPath'));
    return;
  }
  try {
    await app.updateModelContext({
      content: [
        {
          type: 'text',
          text: `User selected from Workspace Explorer:\n- Relative path: ${item.relPath || '.'}\n- Absolute path: ${item.absPath}`,
        },
      ],
    });
    showToast(t('toastAttached', item.relPath || item.name));
  } catch {
    await copyText(item.relPath || item.absPath, t('labelPath'));
  }
}

async function revealInSystemExplorer(item, rootPath) {
  try {
    await callTool('reveal_in_os', {
      rootPath,
      relPath: item.relPath || '',
    });
    showToast(t('toastRevealedInOs', item.name || rootPath));
  } catch (err) {
    showToast(t('toastRevealInOsFailed', err.message));
  }
}

function hideContextMenu() {
  $ctxMenu.classList.remove('open');
}

function showContextMenu(x, y, item, rootPath, options = {}) {
  $ctxMenu.innerHTML = '';

  const addItem = (label, onClick) => {
    const btn = document.createElement('button');
    btn.className = 'ctx-item';
    btn.textContent = label;
    btn.onclick = () => {
      hideContextMenu();
      onClick();
    };
    $ctxMenu.appendChild(btn);
  };
  const addSep = () => {
    const div = document.createElement('div');
    div.className = 'ctx-sep';
    $ctxMenu.appendChild(div);
  };

  if (options.isProjectRoot && options.project) {
    const isOpen = state.expandedProjects.has(options.project.rootPath);
    addItem(isOpen ? t('ctxCollapseProject') : t('ctxExpandProject'), () =>
      toggleProjectRoot(options.project),
    );
    addItem(t('ctxFocusProject'), () => selectProject(options.project.rootPath));
    addItem(t('ctxRevealInOs'), () => revealInSystemExplorer(item, rootPath));
    addSep();
  } else if (!item.isDir) {
    addItem(t('ctxOpenNative'), () => openFileInNativePane(item, rootPath));
    addItem(t('ctxInlinePreview'), () => openFileInlinePreview(item, rootPath));
    if (options.fromSearch) {
      addItem(t('ctxRevealFile'), () => revealInTree(rootPath, item.relPath, false));
    }
    addItem(t('ctxRevealInOs'), () => revealInSystemExplorer(item, rootPath));
    addSep();
  } else {
    if (options.fromSearch) {
      addItem(t('ctxRevealDir'), () => revealInTree(rootPath, item.relPath, true));
    } else {
      const k = makeDirKey(rootPath, item.relPath);
      const isOpen = state.expandedDirs.has(k);
      addItem(isOpen ? t('ctxCollapseDir') : t('ctxExpandDir'), () =>
        toggleDir(rootPath, item.relPath),
      );
    }
    addItem(t('ctxRevealInOs'), () => revealInSystemExplorer(item, rootPath));
    addSep();
  }

  if (item.relPath) {
    addItem(t('ctxCopyRel'), () => copyText(item.relPath, t('labelRelPath')));
  }
  addItem(t('ctxCopyAbs'), () => copyText(item.absPath, t('labelAbsPath')));
  addItem(t('ctxCopyName'), () => copyText(item.name, t('labelName')));

  if (state.capabilities?.updateModelContext) {
    addSep();
    addItem(t('ctxAttachChat'), () => attachPathToChat(item));
  }

  $ctxMenu.classList.add('open');
  const rect = $ctxMenu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 8;
  const maxY = window.innerHeight - rect.height - 8;
  $ctxMenu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
  $ctxMenu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;
}

async function toggleDir(rootPath, relPath) {
  const key = makeDirKey(rootPath, relPath);
  if (state.expandedDirs.has(key)) {
    state.expandedDirs.delete(key);
    renderTree();
  } else {
    state.expandedDirs.add(key);
    renderTree();
    await ensureDirLoaded(rootPath, relPath);
  }
}

async function toggleProjectRoot(project) {
  if (state.expandedProjects.has(project.rootPath)) {
    state.expandedProjects.delete(project.rootPath);
    renderTree();
  } else {
    state.expandedProjects.add(project.rootPath);
    renderTree();
    await ensureDirLoaded(project.rootPath, '');
  }
}

function renderHeader() {
  renderStaticTexts();
  $projectSelect.innerHTML = '';

  const allOpt = document.createElement('option');
  allOpt.value = '__ALL__';
  allOpt.textContent = t('allProjectsOption', state.projects.length);
  $projectSelect.appendChild(allOpt);

  for (const p of state.projects) {
    const opt = document.createElement('option');
    opt.value = p.rootPath;
    opt.textContent = p.name;
    $projectSelect.appendChild(opt);
  }

  if (!state.initialized) {
    $projectSelect.value = '__ALL__';
    $subbarPath.textContent = t('loadingProjectsSubbar');
    $subbarBadge.textContent = '';
    $btnToggleHidden.classList.toggle('active', state.showHidden);
    return;
  }

  if (state.viewMode === 'all') {
    $projectSelect.value = '__ALL__';
    $btnAllMode.classList.add('active');
    $subbarPath.textContent = t('allProjectsSubbar', state.projects.length);
    $subbarBadge.textContent = t('allProjectsBadge');
  } else if (state.activeProject) {
    $projectSelect.value = state.activeProject.rootPath;
    $btnAllMode.classList.remove('active');
    $subbarPath.textContent = state.activeProject.rootPath;
    const badgeMap = {
      arg: t('badgeArg'),
      'active-chat': t('badgeActiveChat'),
      'selected-project': t('badgeSelectedProject'),
      roots: t('badgeRoots'),
      cwd: t('badgeCwd'),
      manual: t('badgeManual'),
      'single-known': t('badgeSingleKnown'),
    };
    $subbarBadge.textContent = badgeMap[state.detectedBy] || t('badgeDefault');
  } else {
    $projectSelect.value = '__ALL__';
    $subbarPath.textContent = t('noProjectSubbar');
    $subbarBadge.textContent = '';
  }

  $btnToggleHidden.classList.toggle('active', state.showHidden);
}

function createRowActions(item, rootPath, fromSearch = false) {
  const wrap = document.createElement('span');
  wrap.className = 'row-actions';

  if (fromSearch) {
    const btnReveal = document.createElement('button');
    btnReveal.className = 'mini-btn';
    btnReveal.title = t('rowRevealTitle');
    btnReveal.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`;
    btnReveal.onclick = (e) => {
      e.stopPropagation();
      revealInTree(rootPath, item.relPath, item.isDir);
    };
    wrap.appendChild(btnReveal);
  }

  if (!item.isDir) {
    const btnPrev = document.createElement('button');
    btnPrev.className = 'mini-btn';
    btnPrev.title = t('rowPreviewTitle');
    btnPrev.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    btnPrev.onclick = (e) => {
      e.stopPropagation();
      openFileInlinePreview(item, rootPath);
    };
    wrap.appendChild(btnPrev);
  }

  if (item.relPath) {
    const btnRel = document.createElement('button');
    btnRel.className = 'mini-btn';
    btnRel.title = t('copyRelTitle');
    btnRel.textContent = './';
    btnRel.style.fontFamily = 'var(--font-mono)';
    btnRel.onclick = (e) => {
      e.stopPropagation();
      copyText(item.relPath, t('labelRelPath'));
    };
    wrap.appendChild(btnRel);
  }

  const btnAbs = document.createElement('button');
  btnAbs.className = 'mini-btn';
  btnAbs.title = t('copyAbsTitle');
  btnAbs.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
  btnAbs.onclick = (e) => {
    e.stopPropagation();
    copyText(item.absPath, t('labelAbsPath'));
  };
  wrap.appendChild(btnAbs);

  return wrap;
}

function appendDirChildren(container, rootPath, relPath, depth) {
  const key = makeDirKey(rootPath, relPath);
  if (state.loadingKeys.has(key) && !state.dirCache.has(key)) {
    const loading = document.createElement('div');
    loading.className = 'tree-row';
    loading.style.paddingLeft = `${8 + depth * 14}px`;
    loading.style.color = 'var(--text-tertiary)';
    loading.textContent = t('loadingNode');
    container.appendChild(loading);
    return;
  }

  const entries = state.dirCache.get(key) || [];
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tree-row';
    empty.style.paddingLeft = `${24 + depth * 14}px`;
    empty.style.color = 'var(--text-tertiary)';
    empty.style.fontStyle = 'italic';
    empty.textContent = t('emptyDirNode');
    container.appendChild(empty);
    return;
  }

  for (const item of entries) {
    const itemKey = makeDirKey(rootPath, item.relPath);
    const isOpen = item.isDir && state.expandedDirs.has(itemKey);

    const row = document.createElement('div');
    row.className =
      'tree-row' +
      (state.selectedKey === itemKey ? ' selected' : '') +
      (item.isHidden ? ' hidden-item' : '');
    row.style.paddingLeft = `${8 + depth * 14}px`;
    row.title = item.absPath;

    row.appendChild(createChevron(isOpen, !item.isDir));
    row.appendChild(createIconNode(item, isOpen));

    const nameEl = document.createElement('span');
    nameEl.className = 'row-name';
    nameEl.textContent = item.name;
    row.appendChild(nameEl);

    row.appendChild(createRowActions(item, rootPath, false));

    row.onclick = () => {
      state.selectedKey = itemKey;
      if (item.isDir) {
        toggleDir(rootPath, item.relPath);
      } else {
        renderTree();
        openFileInNativePane(item, rootPath);
      }
    };

    row.oncontextmenu = (e) => {
      e.preventDefault();
      state.selectedKey = itemKey;
      renderTree();
      showContextMenu(e.clientX, e.clientY, item, rootPath);
    };

    container.appendChild(row);

    if (item.isDir && isOpen) {
      appendDirChildren(container, rootPath, item.relPath, depth + 1);
    }
  }
}

function hasActiveSearch() {
  return state.searchRegex ? state.searchQuery.length > 0 : state.searchQuery.trim().length > 0;
}

function renderSearchControls() {
  $btnCase.classList.toggle('active', state.searchCaseSensitive);
  $btnRegex.classList.toggle('active', state.searchRegex);
  $btnFuzzy.classList.toggle('active', !state.searchRegex && state.searchFuzzy);
  $btnFuzzy.disabled = state.searchRegex;
  $searchInput.classList.toggle('invalid', Boolean(state.regexError));

  if (state.searchRegex) {
    $searchInput.placeholder = state.searchCaseSensitive
      ? t('placeholderRegexCase')
      : t('placeholderRegex');
  } else if (state.searchFuzzy) {
    $searchInput.placeholder = state.searchCaseSensitive
      ? t('placeholderFuzzyCase')
      : t('placeholderFuzzy');
  } else {
    $searchInput.placeholder = state.searchCaseSensitive
      ? t('placeholderExactCase')
      : t('placeholderExact');
  }
}

function createHighlightedSpan(text, ranges, className, prefixText = '') {
  const span = document.createElement('span');
  span.className = className;
  if (prefixText) {
    span.appendChild(document.createTextNode(prefixText));
  }
  if (!Array.isArray(ranges) || ranges.length === 0) {
    span.appendChild(document.createTextNode(text));
    return span;
  }

  let cursor = 0;
  for (const [start, end] of ranges) {
    const s = Math.max(cursor, Math.min(text.length, start));
    const e = Math.max(s, Math.min(text.length, end));
    if (s > cursor) {
      span.appendChild(document.createTextNode(text.slice(cursor, s)));
    }
    if (e > s) {
      const mark = document.createElement('mark');
      mark.className = 'hl';
      mark.textContent = text.slice(s, e);
      span.appendChild(mark);
    }
    cursor = e;
  }
  if (cursor < text.length) {
    span.appendChild(document.createTextNode(text.slice(cursor)));
  }
  return span;
}

function renderSearchResults(container) {
  if (state.searching) {
    setEmptyMessage(container, t('searchingEmpty'));
    return;
  }
  if (state.regexError) {
    setEmptyMessage(container, t('regexErrorEmpty', state.regexError));
    return;
  }
  const results = state.searchResults || [];
  if (results.length === 0) {
    setEmptyMessage(container, t('noMatchEmpty', state.searchQuery));
    return;
  }

  const showProjPrefix = state.viewMode === 'all';
  for (const item of results) {
    const itemKey = makeDirKey(item.rootPath, item.relPath);
    const row = document.createElement('div');
    row.className =
      'tree-row' +
      (state.selectedKey === itemKey ? ' selected' : '') +
      (item.isHidden ? ' hidden-item' : '');
    row.style.paddingLeft = '10px';
    row.title = item.absPath;

    row.appendChild(createIconNode(item, false));
    row.appendChild(createHighlightedSpan(item.name, item.nameRanges, 'row-name'));

    const prefix = showProjPrefix && item.projectName ? `[${item.projectName}] ` : '';
    row.appendChild(createHighlightedSpan(item.relPath, item.pathRanges, 'row-sub', prefix));

    row.appendChild(createRowActions(item, item.rootPath, true));

    row.onclick = () => {
      state.selectedKey = itemKey;
      if (item.isDir) {
        revealInTree(item.rootPath, item.relPath, true);
      } else {
        renderTree();
        openFileInNativePane(item, item.rootPath);
      }
    };

    row.oncontextmenu = (e) => {
      e.preventDefault();
      state.selectedKey = itemKey;
      renderTree();
      showContextMenu(e.clientX, e.clientY, item, item.rootPath, { fromSearch: true });
    };

    container.appendChild(row);
  }
}

function renderTree() {
  $treeContainer.innerHTML = '';

  if (hasActiveSearch()) {
    renderSearchResults($treeContainer);
    return;
  }

  if (state.projects.length === 0) {
    setEmptyMessage(
      $treeContainer,
      state.initialized ? t('noProjectsEmpty') : t('loadingDirEmpty'),
    );
    return;
  }

  if (state.viewMode === 'all') {
    for (const project of state.projects) {
      const isOpen = state.expandedProjects.has(project.rootPath);
      const row = document.createElement('div');
      row.className = 'tree-row project-root-row';
      row.style.paddingLeft = '8px';
      row.title = project.rootPath;

      row.appendChild(createChevron(isOpen, false));
      row.appendChild(createIconNode({ isDir: true }, isOpen));

      const nameEl = document.createElement('span');
      nameEl.className = 'row-name';
      nameEl.textContent = project.name;
      row.appendChild(nameEl);

      const actions = document.createElement('span');
      actions.className = 'row-actions';

      const btnFocus = document.createElement('button');
      btnFocus.className = 'mini-btn';
      btnFocus.title = t('rowFocusTitle');
      btnFocus.textContent = t('rowFocusBtn');
      btnFocus.onclick = (e) => {
        e.stopPropagation();
        selectProject(project.rootPath);
      };
      actions.appendChild(btnFocus);

      const btnCopy = document.createElement('button');
      btnCopy.className = 'mini-btn';
      btnCopy.title = t('rowCopyProjPathTitle');
      btnCopy.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
      btnCopy.onclick = (e) => {
        e.stopPropagation();
        copyText(project.rootPath, t('labelProjPath'));
      };
      actions.appendChild(btnCopy);

      row.appendChild(actions);

      row.onclick = () => toggleProjectRoot(project);
      row.oncontextmenu = (e) => {
        e.preventDefault();
        showContextMenu(
          e.clientX,
          e.clientY,
          { name: project.name, relPath: '', absPath: project.rootPath, isDir: true },
          project.rootPath,
          { isProjectRoot: true, project },
        );
      };

      $treeContainer.appendChild(row);

      if (isOpen) {
        appendDirChildren($treeContainer, project.rootPath, '', 1);
      }
    }
    return;
  }

  if (!state.activeProject) {
    setEmptyMessage($treeContainer, t('selectProjectEmpty'));
    return;
  }

  appendDirChildren($treeContainer, state.activeProject.rootPath, '', 0);
}

async function selectProject(rootPath, isManual = true) {
  if (isManual) {
    state.manualOverrideAt = Date.now();
  }
  if (rootPath === '__ALL__') {
    state.viewMode = 'all';
    if (state.activeProject && state.expandedProjects.size === 0) {
      state.expandedProjects.add(state.activeProject.rootPath);
      ensureDirLoaded(state.activeProject.rootPath, '');
    }
    renderHeader();
    renderTree();
    if (hasActiveSearch()) {
      await runSearch();
    }
    return;
  }
  const found = state.projects.find((p) => p.rootPath === rootPath);
  if (!found) return;
  state.activeProject = found;
  state.viewMode = 'single';
  if (isManual) {
    state.detectedBy = 'manual';
  }
  renderHeader();
  renderTree();
  if (isManual) {
    try {
      await callTool('set_active_project', { rootPath: found.rootPath });
    } catch {
      // ignore
    }
  }
  await ensureDirLoaded(found.rootPath, '');
  if (hasActiveSearch()) {
    await runSearch();
  }
}

let searchDebounce = null;
async function runSearch() {
  const raw = state.searchQuery;
  const active = hasActiveSearch();
  $searchClear.classList.toggle('visible', raw.length > 0);
  const seq = ++searchSeq;

  if (!active) {
    state.searchResults = null;
    state.regexError = null;
    state.searching = false;
    renderSearchControls();
    renderTree();
    return;
  }

  state.searching = true;
  state.regexError = null;
  renderSearchControls();
  renderTree();

  try {
    const args = {
      query: state.searchRegex ? raw : raw.trim(),
      caseSensitive: state.searchCaseSensitive,
      useRegex: state.searchRegex,
      fuzzy: state.searchFuzzy,
      showHidden: state.showHidden,
      maxResults: 150,
    };
    if (state.viewMode === 'single' && state.activeProject) {
      args.rootPath = state.activeProject.rootPath;
    }
    const data = await callTool('search_files', args);
    if (seq !== searchSeq) return;
    state.regexError = data?.regexError || null;
    state.searchResults = data?.results || [];
  } catch (err) {
    if (seq !== searchSeq) return;
    showToast(t('toastSearchFailed', err.message));
    state.searchResults = [];
  } finally {
    if (seq === searchSeq) {
      state.searching = false;
      renderSearchControls();
      renderTree();
    }
  }
}

function hydrateFromInitialData(data) {
  if (!data) return;
  state.initialized = true;
  if (data.lang === 'zh' || data.lang === 'en') {
    state.lang = data.lang;
    try {
      window.localStorage?.setItem('workspace_explorer_lang', state.lang);
    } catch {
      // ignore
    }
  }
  state.projects = Array.isArray(data.projects) ? data.projects : [];
  state.activeProject = data.activeProject || null;
  state.viewMode = data.viewMode || (state.activeProject ? 'single' : 'all');
  state.detectedBy = data.detectedBy || 'all';
  if (data.activeConversationId) {
    state.lastAutoConversationId = data.activeConversationId;
  }
  if (data.signalTime) {
    state.lastAutoSignalTime = Math.max(state.lastAutoSignalTime, data.signalTime);
  }

  if (state.activeProject && Array.isArray(data.entries)) {
    state.dirCache.set(makeDirKey(state.activeProject.rootPath, ''), data.entries);
  }

  // In 'all' mode, auto-expand the remembered project so its files are immediately visible
  if (state.viewMode === 'all' && state.activeProject && state.expandedProjects.size === 0) {
    state.expandedProjects.add(state.activeProject.rootPath);
    if (!state.dirCache.has(makeDirKey(state.activeProject.rootPath, ''))) {
      ensureDirLoaded(state.activeProject.rootPath, '');
    }
  }

  renderHeader();
  renderSearchControls();
  renderTree();

  if (
    state.viewMode === 'single' &&
    state.activeProject &&
    !state.dirCache.has(makeDirKey(state.activeProject.rootPath, ''))
  ) {
    ensureDirLoaded(state.activeProject.rootPath, '');
  }
}

// Event bindings
$projectSelect.onchange = (e) => selectProject(e.target.value);

if ($btnLang) {
  $btnLang.onclick = async () => {
    state.lang = state.lang === 'en' ? 'zh' : 'en';
    try {
      window.localStorage?.setItem('workspace_explorer_lang', state.lang);
    } catch {
      // ignore
    }
    hideContextMenu();
    renderHeader();
    renderSearchControls();
    renderTree();
    if (state.previewItem && $previewPane.classList.contains('open')) {
      openFileInlinePreview(state.previewItem, state.previewItem.rootPath);
    }
    showToast(t('toastLangSwitched'));
    try {
      await callTool('set_language', { lang: state.lang });
    } catch {
      // ignore
    }
  };
}

$btnAllMode.onclick = () => {
  if (state.viewMode === 'all') {
    if (state.activeProject) {
      selectProject(state.activeProject.rootPath);
    } else if (state.projects.length > 0) {
      selectProject(state.projects[0].rootPath);
    }
  } else {
    selectProject('__ALL__');
  }
};

$btnCollapseAll.onclick = () => {
  state.expandedDirs.clear();
  state.expandedProjects.clear();
  renderTree();
  showToast(t('toastCollapsedAll'));
};

$btnToggleHidden.onclick = async () => {
  state.showHidden = !state.showHidden;
  renderHeader();
  await reloadVisibleDirs();
  if (hasActiveSearch()) {
    await runSearch();
  }
};

$btnRefresh.onclick = async () => {
  try {
    const ctx = await callTool('list_projects', {});
    if (Array.isArray(ctx?.projects)) {
      state.projects = ctx.projects;
      if (state.activeProject) {
        state.activeProject =
          state.projects.find((p) => p.rootPath === state.activeProject.rootPath) ||
          state.activeProject;
      }
    }
  } catch {
    // ignore
  }
  renderHeader();
  await reloadVisibleDirs();
  if (hasActiveSearch()) {
    await runSearch();
  }
  showToast(t('toastRefreshed'));
};

$searchInput.oninput = (e) => {
  state.searchQuery = e.target.value;
  $searchClear.classList.toggle('visible', state.searchQuery.length > 0);
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(runSearch, 180);
};

$searchClear.onclick = () => {
  searchSeq++;
  state.searchQuery = '';
  state.regexError = null;
  $searchInput.value = '';
  $searchClear.classList.remove('visible');
  state.searchResults = null;
  state.searching = false;
  renderSearchControls();
  renderTree();
  $searchInput.focus();
};

$btnFuzzy.onclick = () => {
  if (state.searchRegex) return;
  state.searchFuzzy = !state.searchFuzzy;
  renderSearchControls();
  showToast(state.searchFuzzy ? t('toastFuzzyOn') : t('toastFuzzyOff'));
  if (hasActiveSearch()) {
    runSearch();
  }
};

$btnCase.onclick = () => {
  state.searchCaseSensitive = !state.searchCaseSensitive;
  renderSearchControls();
  showToast(state.searchCaseSensitive ? t('toastCaseOn') : t('toastCaseOff'));
  if (hasActiveSearch()) {
    runSearch();
  }
};

$btnRegex.onclick = () => {
  state.searchRegex = !state.searchRegex;
  state.regexError = null;
  renderSearchControls();
  showToast(state.searchRegex ? t('toastRegexOn') : t('toastRegexOff'));
  if (hasActiveSearch()) {
    runSearch();
  } else {
    renderTree();
  }
};

renderStaticTexts();
renderSearchControls();

$btnPreviewClose.onclick = () => {
  previewSeq++;
  $previewPane.classList.remove('open');
  state.previewItem = null;
};

$btnPreviewCopyRel.onclick = () => {
  if (state.previewItem) copyText(state.previewItem.relPath, t('labelRelPath'));
};

$btnPreviewCopyAbs.onclick = () => {
  if (state.previewItem) copyText(state.previewItem.absPath, t('labelAbsPath'));
};

$btnPreviewOpenNative.onclick = () => {
  if (state.previewItem) {
    openFileInNativePane(state.previewItem, state.previewItem.rootPath);
  }
};

// Drag to resize preview pane
let isResizing = false;
$previewResizer.addEventListener('mousedown', (e) => {
  e.preventDefault();
  isResizing = true;
});
window.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const newHeight = window.innerHeight - e.clientY;
  const clamped = Math.max(120, Math.min(window.innerHeight * 0.8, newHeight));
  $previewPane.style.height = `${clamped}px`;
});
window.addEventListener('mouseup', () => {
  isResizing = false;
});

document.addEventListener('click', (e) => {
  if (!$ctxMenu.contains(e.target)) hideContextMenu();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideContextMenu();
  }
});

function applyHostStyling(ctx) {
  if (!ctx) return;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
}

// Register MCP App handlers BEFORE connect()
app.ontoolinput = () => {
  if (!state.initialized) {
    setEmptyMessage($treeContainer, t('loadingDirEmpty'));
  }
};

app.ontoolresult = (result) => {
  if (result?.structuredContent) {
    hydrateFromInitialData(result.structuredContent);
    if (result.structuredContent.detectedBy !== 'arg') {
      syncActiveWorkspace(true);
    }
  }
};

app.onhostcontextchanged = (ctx) => {
  applyHostStyling(ctx);
};

window.addEventListener('error', (ev) => {
  if (!state.initialized && $treeContainer) {
    setEmptyMessage($treeContainer, t('scriptError', ev.message || ev.error));
  }
});

let syncingWorkspace = false;
async function syncActiveWorkspace(forceInitialCheck = false) {
  if (!state.initialized || syncingWorkspace) return;
  if (!forceInitialCheck && document.visibilityState === 'hidden') return;
  syncingWorkspace = true;
  try {
    const info = await callTool('check_active_workspace', {});
    if (!info?.activeProject) return;
    const sig = Number(info.signalTime) || 0;
    const convChanged =
      Boolean(info.activeConversationId) &&
      info.activeConversationId !== state.lastAutoConversationId;
    const shouldSwitch =
      state.manualOverrideAt > 0
        ? sig > state.manualOverrideAt && (sig > state.lastAutoSignalTime || convChanged)
        : forceInitialCheck === true || convChanged || sig > state.lastAutoSignalTime;

    if (shouldSwitch) {
      if (sig > state.lastAutoSignalTime) {
        state.lastAutoSignalTime = sig;
      }
      if (info.activeConversationId) {
        state.lastAutoConversationId = info.activeConversationId;
      }
      if (state.manualOverrideAt > 0 && sig > state.manualOverrideAt) {
        state.manualOverrideAt = 0;
      }
      if (Array.isArray(info.projects) && info.projects.length > 0) {
        state.projects = info.projects;
      }
      const nextRoot = info.activeProject.rootPath;
      if (state.viewMode !== 'single' || state.activeProject?.rootPath !== nextRoot) {
        state.detectedBy = info.detectedBy || 'active-chat';
        await selectProject(nextRoot, false);
      } else if (state.detectedBy !== info.detectedBy) {
        state.detectedBy = info.detectedBy || state.detectedBy;
        renderHeader();
      }
    }
  } catch {
    // ignore transient poll errors
  } finally {
    syncingWorkspace = false;
  }
}

(async () => {
  try {
    await app.connect();
    state.capabilities = app.getHostCapabilities() || {};
    applyHostStyling(app.getHostContext());

    window.addEventListener('focus', () => syncActiveWorkspace(false));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncActiveWorkspace(false);
    });
    setInterval(() => syncActiveWorkspace(false), 1500);

    // Fallback if opened directly without ontoolresult arriving immediately
    setTimeout(async () => {
      if (!state.initialized) {
        try {
          const ctx = await callTool('list_projects', {});
          if (!state.initialized) {
            hydrateFromInitialData(ctx);
          }
        } catch {
          // ignore if ontoolresult already handled
        }
      }
    }, 500);
  } catch (err) {
    setEmptyMessage($treeContainer, t('connectError', err?.message || err));
  }
})();
