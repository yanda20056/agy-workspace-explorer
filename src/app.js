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

function detectInitialOpenMode() {
  try {
    const saved = window.localStorage?.getItem('workspace_explorer_open_mode');
    if (saved === 'split' || saved === 'native') return saved;
  } catch {
    // ignore storage restriction
  }
  return 'split';
}

function detectInitialAutoReveal() {
  try {
    const saved = window.localStorage?.getItem('workspace_explorer_auto_reveal');
    if (saved === 'false') return false;
    if (saved === 'true') return true;
  } catch {
    // ignore storage restriction
  }
  return true;
}

const I18N = {
  en: {
    switchProjectTitle: 'Switch Project',
    switchLangTitle: 'Switch language (Current: English → Click for 中文)',
    langBtnText: 'EN',
    openModeSplitText: 'Split',
    openModeNativeText: 'AGY',
    openModeSplitTitle:
      'File click mode: Built-in Left Viewer + Right Docked Tree (Click to switch to AGY Native Tab)',
    openModeNativeTitle:
      'File click mode: AGY Native Tab (Click to switch to Built-in Left Viewer + Right Docked Tree)',
    autoRevealOnTitle:
      'Auto-Reveal Active File in Tree: ON (like Rider / VS Code) → Click to disable',
    autoRevealOffTitle:
      'Auto-Reveal Active File in Tree: OFF → Click to enable',
    toastAutoRevealOn: 'Auto-Reveal in Tree: ON',
    toastAutoRevealOff: 'Auto-Reveal in Tree: OFF',
    allModeTitle: 'Toggle: All Projects / Current Project View',
    collapseAllTitle: 'Collapse All',
    toggleHiddenTitle: 'Show/Hide Dotfiles (starting with .)',
    refreshTitle: 'Refresh Directory',
    searchClearTitle: 'Clear Search',
    fuzzyTitle: 'Fuzzy Match — exact substring match when off',
    caseTitle: 'Match Case',
    regexTitle: 'Use Regular Expression',
    resizerTitle: 'Drag left/right to resize right file tree width',
    modeRenderBtn: 'Preview',
    modeRawBtn: 'Raw',
    findInFileTitle: 'Find in File (Ctrl+F)',
    findPlaceholder: 'Find in file (Enter / Shift+Enter)...',
    findPrevTitle: 'Previous Match (Shift+Enter)',
    findNextTitle: 'Next Match (Enter)',
    findCloseTitle: 'Close Find Bar (Esc)',
    findNoMatch: 'No results',
    wrapBtn: 'Wrap',
    wrapTitle: 'Toggle Word Wrap',
    copyContentBtn: 'Copy',
    copyContentTitle: 'Copy File Content',
    copyRelBtn: 'Rel',
    copyRelTitle: 'Copy Relative Path',
    copyAbsBtn: 'Abs',
    copyAbsTitle: 'Copy Full Path',
    openNativeBtn: 'AGY Tab',
    openNativeTitle: 'Open in AGY Native Tab',
    closePreviewTitle: 'Close Viewer',
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
    rowPreviewTitle: 'Built-in Split Viewer',
    rowFocusBtn: 'Focus',
    rowFocusTitle: 'Focus this project',
    rowCopyProjPathTitle: 'Copy Project Full Path',
    ctxCollapseProject: 'Collapse Project',
    ctxExpandProject: 'Expand Project',
    ctxFocusProject: 'Focus Project (Single Project View)',
    ctxOpenNative: 'Open File (AGY Native Tab)',
    ctxInlinePreview: 'Open in Built-in Split Viewer',
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
    labelFileContent: 'file content',
    toastCopied: (label, text) => `Copied ${label}: ${text}`,
    toastCopiedContent: (name) => `Copied content of ${name}`,
    toastCopyFailed: (text) => `Copy failed, please copy manually: ${text}`,
    toastReadDirFailed: (msg) => `Failed to read directory: ${msg}`,
    toastOpened: (name) => `Opened in AGY tab: ${name}`,
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
    toastModeSplit: 'Mode: Built-in Split Viewer (Right Tree docked)',
    toastModeNative: 'Mode: Open files in AGY Native Tab',
    previewEmptyTitle: 'Built-in Viewer',
    previewEmptyHint: 'Click any file in the right tree to view its content here.',
    previewLoading: 'Loading file content...',
    binaryNotSupported: 'Binary file is not supported',
    previewBinary: (kb) => `[Binary file, size ${kb} KB, text preview not supported]`,
    previewTruncated: '\n\n... [File exceeds 200KB, output truncated]',
    previewDeleted: (name) => `File was deleted or moved: ${name}`,
    previewReadError: (msg) => `Failed to read file: ${msg}`,
    scriptError: (msg) => `Script error: ${msg}`,
    connectError: (msg) => `Failed to connect to host: ${msg}`,
  },
  zh: {
    switchProjectTitle: '切换工程',
    switchLangTitle: '切换语言 (当前: 中文 → 点击切换为 English)',
    langBtnText: '中',
    openModeSplitText: '分栏',
    openModeNativeText: '原生',
    openModeSplitTitle:
      '点击文件模式: 内置左侧查看器 + 右侧常驻目录树 (点击切换为 AGY 原生标签页)',
    openModeNativeTitle:
      '点击文件模式: AGY 原生标签页 (点击切换为内置左侧查看器 + 右侧常驻目录树)',
    autoRevealOnTitle:
      '自动在目录树中定位当前打开文件: 已开启 (类似 Rider / VS Code) → 点击关闭',
    autoRevealOffTitle:
      '自动在目录树中定位当前打开文件: 已关闭 → 点击开启',
    toastAutoRevealOn: '已开启：在目录树中自动定位当前文件',
    toastAutoRevealOff: '已关闭：在目录树中自动定位当前文件',
    allModeTitle: '切换：全部工程视图 / 当前工程视图',
    collapseAllTitle: '全部折叠',
    toggleHiddenTitle: '显示/隐藏以 . 开头的隐藏文件',
    refreshTitle: '刷新目录',
    searchClearTitle: '清除搜索',
    fuzzyTitle: '模糊查找 (Fuzzy Match) — 关闭时为精确子串匹配',
    caseTitle: '区分大小写 (Match Case)',
    regexTitle: '使用正则表达式 (Use Regular Expression)',
    resizerTitle: '左右拖动调整右侧文件树宽度',
    modeRenderBtn: '预览',
    modeRawBtn: '源码',
    findInFileTitle: '在文件内查找 (Ctrl+F)',
    findPlaceholder: '在当前文件内查找 (Enter 下一处 / Shift+Enter 上一处)...',
    findPrevTitle: '上一处匹配 (Shift+Enter)',
    findNextTitle: '下一处匹配 (Enter)',
    findCloseTitle: '关闭查找栏 (Esc)',
    findNoMatch: '无结果',
    wrapBtn: '换行',
    wrapTitle: '切换自动换行',
    copyContentBtn: '复制全文',
    copyContentTitle: '复制文件全文内容',
    copyRelBtn: '相对路径',
    copyRelTitle: '复制相对路径',
    copyAbsBtn: '绝对路径',
    copyAbsTitle: '复制绝对路径',
    openNativeBtn: '原生打开',
    openNativeTitle: '在 AGY 原生标签页中打开',
    closePreviewTitle: '关闭查看器',
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
    rowPreviewTitle: '内置分栏查看',
    rowFocusBtn: '聚焦',
    rowFocusTitle: '聚焦此工程',
    rowCopyProjPathTitle: '复制工程绝对路径',
    ctxCollapseProject: '折叠工程目录',
    ctxExpandProject: '展开工程目录',
    ctxFocusProject: '聚焦此工程 (单工程视图)',
    ctxOpenNative: '打开文件 (AGY 原生标签页)',
    ctxInlinePreview: '在内置分栏查看器中打开',
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
    labelFileContent: '文件内容',
    toastCopied: (label, text) => `已复制${label}: ${text}`,
    toastCopiedContent: (name) => `已复制文件全文: ${name}`,
    toastCopyFailed: (text) => `复制失败，请手动复制: ${text}`,
    toastReadDirFailed: (msg) => `读取目录失败: ${msg}`,
    toastOpened: (name) => `已在 AGY 原生标签页打开: ${name}`,
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
    toastModeSplit: '已切换为: 内置左侧查看器 + 右侧常驻目录树',
    toastModeNative: '已切换为: 点击直接打开 AGY 原生标签页',
    previewEmptyTitle: '内置查看器',
    previewEmptyHint: '在右侧目录树中点击任意文件，即可在此处查看内容（右侧目录树常驻）。',
    previewLoading: '正在加载文件内容...',
    binaryNotSupported: '不支持直接预览此二进制文件',
    previewBinary: (kb) => `[二进制文件，大小 ${kb} KB，不支持文本预览]`,
    previewTruncated: '\n\n... [文件超过 200KB，已截断显示]',
    previewDeleted: (name) => `文件已被删除或移动: ${name}`,
    previewReadError: (msg) => `无法读取文件: ${msg}`,
    scriptError: (msg) => `脚本错误: ${msg}`,
    connectError: (msg) => `连接宿主失败: ${msg}`,
  },
};

const state = {
  lang: detectInitialLang(), // 'en' (default) | 'zh'
  openMode: detectInitialOpenMode(), // 'split' (default: built-in left viewer + right tree) | 'native'
  autoReveal: detectInitialAutoReveal(), // true (default: auto-reveal active file in tree) | false
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
  openTabs: [], // Array<{ key, rootPath, item, data, loading, renderMode, scrollTop }>
  activeTabKey: null,
  previewItem: null,
  previewData: null,
  previewRenderMode: 'render', // 'render' | 'raw'
  previewWrap: false,
  findOpen: false,
  findQuery: '',
  findCaseSensitive: false,
  findRegex: false,
  findCurrentIdx: 0,
  findTotal: 0,
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
const $btnOpenMode = document.getElementById('btnOpenMode');
const $btnAutoReveal = document.getElementById('btnAutoReveal');
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
const $mainSplit = document.getElementById('mainSplit');
const $treeContainer = document.getElementById('treeContainer');
const $previewPane = document.getElementById('previewPane');
const $previewTabsBar = document.getElementById('previewTabsBar');
const $previewResizer = document.getElementById('previewResizer');
const $previewTitle = document.getElementById('previewTitle');
const $previewMeta = document.getElementById('previewMeta');
const $previewModeTabs = document.getElementById('previewModeTabs');
const $btnModeRender = document.getElementById('btnModeRender');
const $btnModeRaw = document.getElementById('btnModeRaw');
const $btnPreviewFind = document.getElementById('btnPreviewFind');
const $btnPreviewWrap = document.getElementById('btnPreviewWrap');
const $btnPreviewCopyContent = document.getElementById('btnPreviewCopyContent');
const $findBar = document.getElementById('findBar');
const $findInput = document.getElementById('findInput');
const $btnFindCase = document.getElementById('btnFindCase');
const $btnFindRegex = document.getElementById('btnFindRegex');
const $findCount = document.getElementById('findCount');
const $btnFindPrev = document.getElementById('btnFindPrev');
const $btnFindNext = document.getElementById('btnFindNext');
const $btnFindClose = document.getElementById('btnFindClose');
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
  if ($btnOpenMode) {
    const isSplit = state.openMode === 'split';
    $btnOpenMode.textContent = isSplit ? t('openModeSplitText') : t('openModeNativeText');
    $btnOpenMode.title = isSplit ? t('openModeSplitTitle') : t('openModeNativeTitle');
    $btnOpenMode.classList.toggle('active', isSplit);
  }
  if ($btnAutoReveal) {
    $btnAutoReveal.title = state.autoReveal ? t('autoRevealOnTitle') : t('autoRevealOffTitle');
    $btnAutoReveal.classList.toggle('active', Boolean(state.autoReveal));
  }
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
  if ($btnModeRender) $btnModeRender.textContent = t('modeRenderBtn');
  if ($btnModeRaw) $btnModeRaw.textContent = t('modeRawBtn');
  if ($btnPreviewFind) {
    $btnPreviewFind.title = t('findInFileTitle');
    $btnPreviewFind.classList.toggle('active', state.findOpen);
  }
  if ($findInput) $findInput.placeholder = t('findPlaceholder');
  if ($btnFindCase) {
    $btnFindCase.title = t('caseTitle');
    $btnFindCase.classList.toggle('active', state.findCaseSensitive);
  }
  if ($btnFindRegex) {
    $btnFindRegex.title = t('regexTitle');
    $btnFindRegex.classList.toggle('active', state.findRegex);
  }
  if ($btnFindPrev) $btnFindPrev.title = t('findPrevTitle');
  if ($btnFindNext) $btnFindNext.title = t('findNextTitle');
  if ($btnFindClose) $btnFindClose.title = t('findCloseTitle');
  if ($btnPreviewWrap) {
    $btnPreviewWrap.textContent = t('wrapBtn');
    $btnPreviewWrap.title = t('wrapTitle');
    $btnPreviewWrap.classList.toggle('active', state.previewWrap);
  }
  if ($btnPreviewCopyContent) {
    $btnPreviewCopyContent.textContent = t('copyContentBtn');
    $btnPreviewCopyContent.title = t('copyContentTitle');
  }
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

let inFlightToolCalls = 0;

async function callTool(name, args = {}) {
  inFlightToolCalls++;
  try {
    const res = await app.callServerTool({ name, arguments: args });
    if (res?.isError) {
      const errText = res?.content?.[0]?.text || 'Tool error';
      throw new Error(errText);
    }
    return res?.structuredContent;
  } finally {
    inFlightToolCalls = Math.max(0, inFlightToolCalls - 1);
  }
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

async function revealInTree(rootPath, relPath, isDir, options = {}) {
  const { smartScroll = false } = options;

  // Clear search mode so tree is visible
  if (hasActiveSearch() || state.searchQuery) {
    searchSeq++;
    state.searchQuery = '';
    state.regexError = null;
    state.searching = false;
    $searchInput.value = '';
    $searchClear.classList.remove('visible');
    state.searchResults = null;
    renderSearchControls();
  }

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

  const missingDirs = dirsToOpen.filter((rel) => !state.dirCache.has(makeDirKey(rootPath, rel)));
  if (missingDirs.length > 0) {
    await runWithConcurrency(
      missingDirs.map((rel) => () => ensureDirLoaded(rootPath, rel, false, true)),
      3,
    );
  }
  renderTree();

  requestAnimationFrame(() => {
    const selectedEl = $treeContainer.querySelector('.tree-row.selected');
    if (!selectedEl) return;
    if (smartScroll) {
      const containerRect = $treeContainer.getBoundingClientRect();
      const rowRect = selectedEl.getBoundingClientRect();
      const isVisible =
        rowRect.top >= containerRect.top + 4 &&
        rowRect.bottom <= containerRect.bottom - 4;
      if (!isVisible) {
        selectedEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    } else {
      selectedEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
}

async function syncAutoRevealInTree(rootPath, relPath) {
  if (!state.autoReveal || !rootPath || relPath === undefined || relPath === null) return;
  await revealInTree(rootPath, relPath, false, { smartScroll: true });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFileSize(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function isMarkdownExt(ext) {
  const e = (ext || '').toLowerCase();
  return e === 'md' || e === 'markdown' || e === 'mdx';
}

const CODE_KEYWORDS = new Set([
  'import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else',
  'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
  'throw', 'new', 'class', 'extends', 'super', 'this', 'async', 'await', 'typeof', 'instanceof',
  'in', 'of', 'true', 'false', 'null', 'undefined', 'void', 'delete', 'default', 'interface',
  'type', 'enum', 'implements', 'public', 'private', 'protected', 'readonly', 'static',
  'def', 'elif', 'except', 'lambda', 'with', 'as', 'pass', 'yield', 'None', 'True', 'False',
  'struct', 'fn', 'pub', 'mut', 'impl', 'use', 'mod', 'match', 'package', 'func', 'defer',
]);

const CODE_TOKEN_RE =
  /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)/g;

function highlightCodeLine(rawLine, ext) {
  if (!rawLine || rawLine.length > 600) return escapeHtml(rawLine);
  const e = (ext || '').toLowerCase();
  if (e === 'txt' || e === 'log' || e === 'csv') return escapeHtml(rawLine);

  let out = '';
  let last = 0;
  CODE_TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = CODE_TOKEN_RE.exec(rawLine)) !== null) {
    if (m.index > last) {
      out += escapeHtml(rawLine.slice(last, m.index));
    }
    const [full, cmt, str, num, word] = m;
    if (cmt) {
      out += `<span class="syn-cmt">${escapeHtml(full)}</span>`;
    } else if (str) {
      const after = rawLine.slice(m.index + full.length);
      if (e === 'json' && /^\s*:/.test(after)) {
        out += `<span class="syn-key">${escapeHtml(full)}</span>`;
      } else {
        out += `<span class="syn-str">${escapeHtml(full)}</span>`;
      }
    } else if (num) {
      out += `<span class="syn-num">${escapeHtml(full)}</span>`;
    } else if (word && CODE_KEYWORDS.has(word)) {
      out += `<span class="syn-kw">${escapeHtml(full)}</span>`;
    } else {
      out += escapeHtml(full);
    }
    last = m.index + full.length;
  }
  if (last < rawLine.length) {
    out += escapeHtml(rawLine.slice(last));
  }
  return out;
}

function formatInlineMarkdown(raw) {
  const codeSpans = [];
  let text = escapeHtml(raw).replace(/`([^`]+)`/g, (_m, c) => {
    const idx = codeSpans.length;
    codeSpans.push(`<code>${c}</code>`);
    return `\0CODE${idx}\0`;
  });

  text = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  return text.replace(/\0CODE(\d+)\0/g, (_m, idx) => codeSpans[Number(idx)] || '');
}

function renderMarkdownToHtml(md) {
  const lines = String(md || '').split(/\r?\n/);
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})\s*([A-Za-z0-9_-]*)\s*$/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const lang = fenceMatch[2] || '';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        codeLines.push(highlightCodeLine(lines[i], lang));
        i++;
      }
      if (i < lines.length) i++;
      html.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      html.push(`<h${level}>${formatInlineMarkdown(hMatch[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\s*\1\s*\1[\s-*_]*$/.test(line)) {
      html.push('<hr />');
      i++;
      continue;
    }

    // GFM Table
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(lines[i + 1])
    ) {
      const parseRow = (r) =>
        r
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => formatInlineMarkdown(c.trim()));

      const headers = parseRow(line);
      i += 2;
      const bodyRows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        bodyRows.push(parseRow(lines[i]));
        i++;
      }
      const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${bodyRows
        .map((r) => `<tr>${headers.map((_, idx) => `<td>${r[idx] ?? ''}</td>`).join('')}</tr>`)
        .join('')}</tbody>`;
      html.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const qLines = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        qLines.push(formatInlineMarkdown(lines[i].replace(/^\s*>\s?/, '')));
        i++;
      }
      html.push(`<blockquote>${qLines.join('<br />')}</blockquote>`);
      continue;
    }

    // Unordered or ordered list
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const isOrdered = /^\s*\d+\.\s+/.test(line);
      const tag = isOrdered ? 'ol' : 'ul';
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        let itemText = lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, '');
        const taskMatch = itemText.match(/^\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
          const checked = taskMatch[1].toLowerCase() === 'x' ? 'checked disabled' : 'disabled';
          items.push(
            `<li style="list-style:none;margin-left:-1.2em"><input type="checkbox" ${checked} /> ${formatInlineMarkdown(taskMatch[2])}</li>`,
          );
        } else {
          items.push(`<li>${formatInlineMarkdown(itemText)}</li>`);
        }
        i++;
      }
      html.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    // Paragraph
    const pLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*(`{3,}|~{3,})/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) &&
      !(
        lines[i].includes('|') &&
        i + 1 < lines.length &&
        /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(lines[i + 1])
      )
    ) {
      pLines.push(formatInlineMarkdown(lines[i]));
      i++;
    }
    html.push(`<p>${pLines.join('<br />')}</p>`);
  }

  return html.join('\n');
}

function setPreviewSplitOpen(isOpen) {
  $mainSplit.classList.toggle('preview-open', Boolean(isOpen));
}

function getActiveTab() {
  if (!state.activeTabKey) return null;
  return state.openTabs.find((t) => t.key === state.activeTabKey) || null;
}

function saveActiveTabScroll() {
  const curr = getActiveTab();
  if (curr && $previewBody) {
    curr.scrollTop = $previewBody.scrollTop;
    curr.scrollLeft = $previewBody.scrollLeft;
  }
}

function syncActiveTabToState() {
  const tab = getActiveTab();
  if (tab) {
    state.previewItem = tab.item;
    state.previewData = tab.data;
    state.previewRenderMode = tab.renderMode || 'raw';
  } else {
    state.previewItem = null;
    state.previewData = null;
  }
}

function renderPreviewTabs() {
  if (!$previewTabsBar) return;
  $previewTabsBar.innerHTML = '';
  $previewTabsBar.classList.toggle('has-tabs', state.openTabs.length > 0);

  for (const tab of state.openTabs) {
    const isActive = tab.key === state.activeTabKey;
    const tabEl = document.createElement('div');
    tabEl.className = 'preview-tab' + (isActive ? ' active' : '');
    tabEl.title = tab.item.relPath || tab.item.absPath || tab.item.name;

    const iconEl = createIconNode(tab.item, false);
    iconEl.style.marginRight = '2px';
    tabEl.appendChild(iconEl);

    const nameEl = document.createElement('span');
    nameEl.className = 'preview-tab-name';
    nameEl.textContent = tab.item.name;
    tabEl.appendChild(nameEl);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'preview-tab-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = t('closePreviewTitle');
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closePreviewTab(tab.key);
    };
    tabEl.appendChild(closeBtn);

    tabEl.onclick = () => {
      if (state.activeTabKey !== tab.key) {
        activatePreviewTab(tab.key);
      } else {
        syncTabFile(tab, { silent: true });
      }
    };

    // Middle-click closes tab
    tabEl.onauxclick = (e) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        closePreviewTab(tab.key);
      }
    };

    $previewTabsBar.appendChild(tabEl);
  }

  requestAnimationFrame(() => {
    const activeEl = $previewTabsBar.querySelector('.preview-tab.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
}

function activatePreviewTab(tabKey) {
  saveActiveTabScroll();
  state.activeTabKey = tabKey;
  syncActiveTabToState();
  if (state.autoReveal && state.previewItem) {
    syncAutoRevealInTree(state.previewItem.rootPath, state.previewItem.relPath);
  } else {
    renderTree();
  }
  renderPreviewContent();
  const tab = getActiveTab();
  if (tab && $previewBody) {
    requestAnimationFrame(() => {
      $previewBody.scrollTop = tab.scrollTop || 0;
      $previewBody.scrollLeft = tab.scrollLeft || 0;
    });
  }
  if (tab && !tab.loading) {
    syncTabFile(tab, { silent: true });
  }
}

function closePreviewTab(tabKey) {
  const idx = state.openTabs.findIndex((t) => t.key === tabKey);
  if (idx === -1) return;
  const wasActive = state.activeTabKey === tabKey;
  state.openTabs.splice(idx, 1);

  if (state.openTabs.length === 0) {
    state.activeTabKey = null;
    syncActiveTabToState();
    setPreviewSplitOpen(false);
    renderPreviewContent();
    return;
  }

  if (wasActive) {
    const nextIdx = Math.min(idx, state.openTabs.length - 1);
    state.activeTabKey = state.openTabs[nextIdx].key;
    syncActiveTabToState();
    if (state.autoReveal && state.previewItem) {
      syncAutoRevealInTree(state.previewItem.rootPath, state.previewItem.relPath);
    } else {
      renderTree();
    }
  }
  renderPreviewContent();
  const activeTab = getActiveTab();
  if (wasActive && activeTab) {
    if ($previewBody) {
      requestAnimationFrame(() => {
        $previewBody.scrollTop = activeTab.scrollTop || 0;
        $previewBody.scrollLeft = activeTab.scrollLeft || 0;
      });
    }
    if (!activeTab.loading) {
      syncTabFile(activeTab, { silent: true });
    }
  }
}

function renderPreviewHeaderControls() {
  renderPreviewTabs();
  const data = state.previewData;
  const item = state.previewItem;
  if (!item) {
    $previewTitle.textContent = t('previewEmptyTitle');
    $previewMeta.textContent = '';
    $previewModeTabs.classList.remove('visible');
    if ($btnPreviewFind) $btnPreviewFind.style.display = 'none';
    if ($btnPreviewWrap) $btnPreviewWrap.style.display = 'none';
    if ($btnPreviewCopyContent) $btnPreviewCopyContent.style.display = 'none';
    $btnPreviewCopyRel.style.display = 'none';
    $btnPreviewCopyAbs.style.display = 'none';
    $btnPreviewOpenNative.style.display = 'none';
    return;
  }

  $previewTitle.textContent = item.relPath || item.name;
  $previewTitle.title = item.absPath || item.relPath || item.name;
  $previewMeta.textContent = data?.size !== undefined ? formatFileSize(data.size) : '';

  const hasValidData = Boolean(data && !data.error && !data.deleted);
  const ext = (data?.ext || item.ext || '').toLowerCase();
  const hasRenderTab = hasValidData && (isMarkdownExt(ext) || (data.isImage && ext === 'svg'));
  $previewModeTabs.classList.toggle('visible', Boolean(hasRenderTab));
  if ($btnModeRender) $btnModeRender.classList.toggle('active', state.previewRenderMode === 'render');
  if ($btnModeRaw) $btnModeRaw.classList.toggle('active', state.previewRenderMode === 'raw');

  const showingRawCode = !data?.isImage && (!isMarkdownExt(ext) || state.previewRenderMode === 'raw');
  const showingSvgRaw = data?.isImage && ext === 'svg' && state.previewRenderMode === 'raw';
  const showCodeTools = Boolean(hasValidData && !data.isBinary && (showingRawCode || showingSvgRaw));
  const isSearchableContent = Boolean(
    hasValidData && !data.isBinary && (!data.isImage || (ext === 'svg' && state.previewRenderMode === 'raw')),
  );

  if ($btnPreviewFind) {
    $btnPreviewFind.style.display = isSearchableContent ? '' : 'none';
    $btnPreviewFind.classList.toggle('active', state.findOpen);
  }
  if ($btnPreviewWrap) {
    $btnPreviewWrap.style.display = showCodeTools ? '' : 'none';
    $btnPreviewWrap.classList.toggle('active', state.previewWrap);
  }
  if ($btnPreviewCopyContent) {
    $btnPreviewCopyContent.style.display = data && !data.isBinary && data.content ? '' : 'none';
  }
  $btnPreviewCopyRel.style.display = '';
  $btnPreviewCopyAbs.style.display = '';
  $btnPreviewOpenNative.style.display = '';
}

// In-File Find (Ctrl+F) state & DOM highlighter
let inFileMatchGroups = []; // Array<Array<HTMLElement>> where each element is the mark nodes for one match

function clearInFileHighlights() {
  inFileMatchGroups = [];
  if (!$previewBody) return;
  const marks = $previewBody.querySelectorAll('mark.find-hl');
  if (marks.length === 0) return;
  for (const m of marks) {
    const parent = m.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(m.textContent || ''), m);
    }
  }
  $previewBody.normalize();
}

function updateFindCountUI(regexErr = false) {
  if (!$findCount || !$findInput) return;
  $findInput.classList.toggle('invalid', Boolean(regexErr));
  const q = state.findQuery;
  if (!q) {
    $findCount.textContent = '0 / 0';
    $findCount.classList.remove('no-match');
    return;
  }
  if (regexErr || inFileMatchGroups.length === 0) {
    $findCount.textContent = t('findNoMatch');
    $findCount.classList.add('no-match');
    return;
  }
  $findCount.classList.remove('no-match');
  $findCount.textContent = `${state.findCurrentIdx + 1} / ${inFileMatchGroups.length}`;
}

function highlightActiveInFileMatch(scrollIntoView = true) {
  if (!$previewBody) return;
  const prevMarks = $previewBody.querySelectorAll('mark.find-hl.current');
  for (const m of prevMarks) {
    m.classList.remove('current');
  }
  if (inFileMatchGroups.length === 0) {
    updateFindCountUI(false);
    return;
  }
  if (state.findCurrentIdx < 0 || state.findCurrentIdx >= inFileMatchGroups.length) {
    state.findCurrentIdx = 0;
  }
  const activeGroup = inFileMatchGroups[state.findCurrentIdx];
  if (activeGroup && activeGroup.length > 0) {
    for (const m of activeGroup) {
      m.classList.add('current');
    }
    if (scrollIntoView) {
      activeGroup[0].scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  }
  updateFindCountUI(false);
}

function applyInFileFind(scrollToCurrent = true, resetIndex = true) {
  clearInFileHighlights();
  const q = state.findQuery;
  if (!state.findOpen || !q || !$previewBody || !state.previewData || state.previewData.isBinary) {
    updateFindCountUI(false);
    return;
  }

  let re;
  try {
    const pattern = state.findRegex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(pattern, state.findCaseSensitive ? 'g' : 'gi');
  } catch {
    updateFindCountUI(true);
    return;
  }

  // Group text nodes by their leaf block container (.code-lc, p, li, td, th, h1-h6, pre, blockquote)
  const blockGroups = [];
  let currentBlock = null;
  let currentNodes = [];

  const walker = document.createTreeWalker($previewBody, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (
        p.closest('.code-ln') ||
        p.closest('.unsupported-view') ||
        p.closest('.empty-state') ||
        p.closest('.img-view')
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let n;
  while ((n = walker.nextNode())) {
    const blk =
      n.parentElement.closest('.code-lc, p, li, td, th, h1, h2, h3, h4, h5, h6, pre, blockquote') ||
      $previewBody;
    if (blk !== currentBlock) {
      if (currentNodes.length > 0) {
        blockGroups.push(currentNodes);
      }
      currentBlock = blk;
      currentNodes = [n];
    } else {
      currentNodes.push(n);
    }
  }
  if (currentNodes.length > 0) {
    blockGroups.push(currentNodes);
  }

  const MAX_MATCHES = 2000;
  let totalMatches = 0;

  for (const nodes of blockGroups) {
    if (totalMatches >= MAX_MATCHES) break;
    const segments = [];
    let fullText = '';
    for (const textNode of nodes) {
      const val = textNode.nodeValue || '';
      const start = fullText.length;
      fullText += val;
      segments.push({ node: textNode, text: val, start, end: fullText.length });
    }
    if (!fullText) continue;

    re.lastIndex = 0;
    const ranges = [];
    let m;
    while ((m = re.exec(fullText)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const matchIdx = totalMatches++;
      inFileMatchGroups.push([]);
      ranges.push([m.index, m.index + m[0].length, matchIdx]);
      if (totalMatches >= MAX_MATCHES) break;
    }

    if (ranges.length === 0) continue;

    let rIdx = 0;
    for (const seg of segments) {
      while (rIdx < ranges.length && ranges[rIdx][1] <= seg.start) {
        rIdx++;
      }
      if (rIdx >= ranges.length || ranges[rIdx][0] >= seg.end) {
        continue;
      }

      const frag = document.createDocumentFragment();
      let cursor = 0;
      let k = rIdx;
      while (k < ranges.length && ranges[k][0] < seg.end) {
        const [rStart, rEnd, matchIdx] = ranges[k];
        const localStart = Math.max(0, rStart - seg.start);
        const localEnd = Math.min(seg.text.length, rEnd - seg.start);
        if (localStart > cursor) {
          frag.appendChild(document.createTextNode(seg.text.slice(cursor, localStart)));
        }
        if (localEnd > localStart) {
          const mark = document.createElement('mark');
          mark.className = 'find-hl';
          mark.textContent = seg.text.slice(localStart, localEnd);
          frag.appendChild(mark);
          inFileMatchGroups[matchIdx].push(mark);
        }
        cursor = localEnd;
        if (rEnd <= seg.end) {
          k++;
        } else {
          break;
        }
      }
      rIdx = k;
      if (cursor < seg.text.length) {
        frag.appendChild(document.createTextNode(seg.text.slice(cursor)));
      }
      if (seg.node.parentNode) {
        seg.node.parentNode.replaceChild(frag, seg.node);
      }
    }
  }

  state.findTotal = inFileMatchGroups.length;
  if (resetIndex || state.findCurrentIdx >= inFileMatchGroups.length) {
    state.findCurrentIdx = 0;
  }
  highlightActiveInFileMatch(scrollToCurrent);
}

function stepInFileMatch(delta) {
  if (inFileMatchGroups.length === 0) return;
  state.findCurrentIdx =
    (state.findCurrentIdx + delta + inFileMatchGroups.length) % inFileMatchGroups.length;
  highlightActiveInFileMatch(true);
}

function openFindBar() {
  if (!state.previewItem) return;
  setPreviewSplitOpen(true);
  state.findOpen = true;
  if ($findBar) $findBar.classList.add('open');
  if ($btnPreviewFind) $btnPreviewFind.classList.add('active');

  // Pre-fill from selection inside previewBody if non-empty and single-line
  try {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && $previewBody.contains(sel.anchorNode)) {
      const selText = sel.toString().trim();
      if (selText && !selText.includes('\n') && selText.length <= 120) {
        state.findQuery = selText;
        if ($findInput) $findInput.value = selText;
      }
    }
  } catch {
    // ignore selection errors
  }

  applyInFileFind(true, true);
  if ($findInput) {
    $findInput.focus();
    $findInput.select();
  }
}

function closeFindBar() {
  state.findOpen = false;
  if ($findBar) $findBar.classList.remove('open');
  if ($btnPreviewFind) $btnPreviewFind.classList.remove('active');
  clearInFileHighlights();
}

function renderPreviewContent() {
  syncActiveTabToState();
  renderPreviewHeaderControls();
  inFileMatchGroups = [];
  $previewBody.innerHTML = '';

  if (!state.previewItem) {
    setEmptyMessage($previewBody, t('previewEmptyHint'));
    if (state.findOpen) updateFindCountUI(false);
    return;
  }

  const data = state.previewData;
  if (!data) {
    setEmptyMessage($previewBody, t('previewLoading'));
    if (state.findOpen) updateFindCountUI(false);
    return;
  }

  if (data.deleted) {
    setEmptyMessage($previewBody, t('previewDeleted', state.previewItem.name));
    if (state.findOpen) updateFindCountUI(false);
    return;
  }

  if (data.error) {
    setEmptyMessage($previewBody, t('previewReadError', data.error));
    if (state.findOpen) updateFindCountUI(false);
    return;
  }

  const ext = (data.ext || state.previewItem.ext || '').toLowerCase();

  // 1. Image view (unless SVG in Raw mode)
  if (data.isImage && data.dataUrl && !(ext === 'svg' && state.previewRenderMode === 'raw')) {
    const wrap = document.createElement('div');
    wrap.className = 'img-view';
    const frame = document.createElement('div');
    frame.className = 'img-frame';
    const img = document.createElement('img');
    img.src = data.dataUrl;
    img.alt = data.name || '';
    const cap = document.createElement('div');
    cap.className = 'img-caption';
    cap.textContent = `${data.name} (${formatFileSize(data.size)})`;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        cap.textContent = `${data.name} — ${img.naturalWidth} × ${img.naturalHeight} px (${formatFileSize(data.size)})`;
      }
    };
    frame.appendChild(img);
    wrap.appendChild(frame);
    wrap.appendChild(cap);
    $previewBody.appendChild(wrap);
    if (state.findOpen) updateFindCountUI(false);
    return;
  }

  // 2. Binary / unsupported file (.docx, .pptx, .xlsx, .pdf, .zip, etc.) -> Figure 1 button view
  if (data.isBinary) {
    const box = document.createElement('div');
    box.className = 'unsupported-view';

    const txt = document.createElement('div');
    txt.className = 'unsupported-text';
    txt.textContent = t('binaryNotSupported');

    const btn = document.createElement('button');
    btn.className = 'unsupported-btn';
    btn.textContent = t('ctxRevealInOs');
    const targetItem = state.previewItem;
    btn.onclick = () => {
      if (targetItem) {
        revealInSystemExplorer(targetItem, targetItem.rootPath);
      }
    };

    box.appendChild(txt);
    box.appendChild(btn);
    $previewBody.appendChild(box);
    if (state.findOpen) updateFindCountUI(false);
    return;
  }

  // 3. Markdown rendered view
  if (isMarkdownExt(ext) && state.previewRenderMode === 'render') {
    const mdDiv = document.createElement('div');
    mdDiv.className = 'md-view';
    mdDiv.innerHTML =
      renderMarkdownToHtml(data.content) +
      (data.truncated ? `<p style="color:var(--text-tertiary)">${escapeHtml(t('previewTruncated'))}</p>` : '');
    $previewBody.appendChild(mdDiv);
    if (state.findOpen && state.findQuery) {
      applyInFileFind(false, false);
    }
    return;
  }

  // 4. Code / Raw line-numbered view (line numbers have user-select: none)
  const codeWrap = document.createElement('div');
  codeWrap.className = 'code-view' + (state.previewWrap ? ' wrap' : '');
  const lines = String(data.content || '').split(/\r?\n/);
  const frag = document.createDocumentFragment();

  for (let idx = 0; idx < lines.length; idx++) {
    const row = document.createElement('div');
    row.className = 'code-line';

    const ln = document.createElement('span');
    ln.className = 'code-ln';
    ln.textContent = String(idx + 1);

    const lc = document.createElement('span');
    lc.className = 'code-lc';
    lc.innerHTML = highlightCodeLine(lines[idx], ext) || ' ';

    row.appendChild(ln);
    row.appendChild(lc);
    frag.appendChild(row);
  }

  if (data.truncated) {
    const truncRow = document.createElement('div');
    truncRow.className = 'code-line';
    truncRow.style.color = 'var(--text-tertiary)';
    truncRow.style.padding = '8px 12px';
    truncRow.textContent = t('previewTruncated').trim();
    frag.appendChild(truncRow);
  }

  codeWrap.appendChild(frag);
  $previewBody.appendChild(codeWrap);
  if (state.findOpen && state.findQuery) {
    applyInFileFind(false, false);
  }
}

let lastNativeOpenKey = null;
let lastNativeOpenAt = 0;
let nativeOpenInFlightKey = null;

async function openFileInNativePane(item, rootPath) {
  const fileKey = makeDirKey(rootPath, item.relPath);
  const now = Date.now();
  // Deduplicate repeated clicks on the same file in native mode
  if (
    nativeOpenInFlightKey === fileKey ||
    (lastNativeOpenKey === fileKey && now - lastNativeOpenAt < 1500)
  ) {
    return;
  }
  nativeOpenInFlightKey = fileKey;
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
      lastNativeOpenKey = fileKey;
      lastNativeOpenAt = Date.now();
      showToast(t('toastOpened', item.name));
    }
  } catch {
    await openFileInlinePreview(item, rootPath);
  } finally {
    if (nativeOpenInFlightKey === fileKey) {
      nativeOpenInFlightKey = null;
    }
  }
}

let previewUpdateFlashTimer = null;
function flashPreviewUpdated() {
  if (!$previewMeta) return;
  $previewMeta.classList.add('updated');
  clearTimeout(previewUpdateFlashTimer);
  previewUpdateFlashTimer = setTimeout(() => {
    $previewMeta.classList.remove('updated');
  }, 700);
}

function hasPreviewDataChanged(prev, next) {
  if (!prev || !next) return true;
  return (
    Boolean(prev.deleted) !== Boolean(next.deleted) ||
    Boolean(prev.error) !== Boolean(next.error) ||
    prev.error !== next.error ||
    Boolean(prev.isImage) !== Boolean(next.isImage) ||
    Boolean(prev.isBinary) !== Boolean(next.isBinary) ||
    Boolean(prev.truncated) !== Boolean(next.truncated) ||
    prev.content !== next.content ||
    prev.dataUrl !== next.dataUrl ||
    prev.ext !== next.ext
  );
}

async function syncTabFile(tab, { force = false, silent = true, showLoading = false } = {}) {
  if (!tab) return false;
  if (tab.syncing && !force) return false;

  const tabKey = tab.key;
  const reqSeq = ++tab.fetchSeq;
  tab.syncing = true;

  if (showLoading) {
    tab.loading = true;
    if (state.activeTabKey === tabKey) {
      renderPreviewContent();
    }
  }

  try {
    const prevData = tab.data;
    const args = {
      rootPath: tab.rootPath,
      relPath: tab.item.relPath,
      silent: Boolean(silent),
    };
    if (!force && prevData?.version) {
      args.expectedVersion = prevData.version;
    }

    const nextData = await callTool('read_file_preview', args);

    if (!state.openTabs.includes(tab) || reqSeq !== tab.fetchSeq) {
      return false;
    }

    tab.loading = false;

    if (nextData?.unchanged) {
      if (prevData) {
        if (nextData.version) prevData.version = nextData.version;
        if (nextData.size !== undefined) prevData.size = nextData.size;
        if (nextData.mtimeMs !== undefined) prevData.mtimeMs = nextData.mtimeMs;
      }
      return false;
    }

    const isStillActive =
      state.activeTabKey === tabKey && $mainSplit.classList.contains('preview-open');
    const changedDisplay = !prevData || hasPreviewDataChanged(prevData, nextData);
    const shouldPreserveScroll = Boolean(prevData && !prevData.error && !prevData.deleted);

    let prevScrollTop = 0;
    let prevScrollLeft = 0;
    if (isStillActive && shouldPreserveScroll && $previewBody) {
      prevScrollTop = $previewBody.scrollTop;
      prevScrollLeft = $previewBody.scrollLeft;
    }

    tab.data = nextData;

    if (isStillActive) {
      if (changedDisplay) {
        renderPreviewContent();
        if (shouldPreserveScroll && $previewBody) {
          $previewBody.scrollTop = prevScrollTop;
          $previewBody.scrollLeft = prevScrollLeft;
          tab.scrollTop = $previewBody.scrollTop;
          tab.scrollLeft = $previewBody.scrollLeft;
        }
        if (prevData) {
          flashPreviewUpdated();
        }
      } else {
        syncActiveTabToState();
        renderPreviewHeaderControls();
      }
    } else {
      renderPreviewTabs();
    }
    return changedDisplay;
  } catch (err) {
    if (!state.openTabs.includes(tab) || reqSeq !== tab.fetchSeq) {
      return false;
    }
    tab.loading = false;
    if (!silent || !tab.data) {
      tab.data = { error: err.message };
      if (state.activeTabKey === tabKey) {
        renderPreviewContent();
      } else {
        renderPreviewTabs();
      }
    }
    return false;
  } finally {
    if (reqSeq === tab.fetchSeq) {
      tab.syncing = false;
    }
  }
}

async function openFileInlinePreview(item, rootPath, forceReload = false) {
  const tabKey = makeDirKey(rootPath, item.relPath);
  let tab = state.openTabs.find((t) => t.key === tabKey);

  setPreviewSplitOpen(true);

  if (tab && !forceReload && (tab.loading || (tab.data && !tab.data.error && !tab.data.deleted))) {
    if (state.activeTabKey !== tabKey) {
      activatePreviewTab(tabKey);
    } else {
      if (state.autoReveal) {
        syncAutoRevealInTree(rootPath, item.relPath);
      }
      if (!tab.loading) {
        syncTabFile(tab, { force: false, silent: true, showLoading: false });
      }
    }
    return;
  }

  saveActiveTabScroll();
  const ext = (item.ext || '').toLowerCase();

  if (!tab) {
    tab = {
      key: tabKey,
      rootPath,
      item: { ...item, rootPath },
      data: null,
      loading: true,
      syncing: false,
      fetchSeq: 0,
      renderMode: isMarkdownExt(ext) || ext === 'svg' ? 'render' : 'raw',
      scrollTop: 0,
      scrollLeft: 0,
    };
    state.openTabs.push(tab);
  }

  state.activeTabKey = tabKey;
  syncActiveTabToState();
  if (state.autoReveal) {
    syncAutoRevealInTree(rootPath, item.relPath);
  }
  await syncTabFile(tab, {
    force: true,
    silent: false,
    showLoading: !tab.data,
  });
}

async function handleFileClick(item, rootPath) {
  if (state.openMode === 'split') {
    await openFileInlinePreview(item, rootPath);
  } else {
    await openFileInNativePane(item, rootPath);
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
        handleFileClick(item, rootPath);
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
        handleFileClick(item, item.rootPath);
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
  if (data.openMode === 'split' || data.openMode === 'native') {
    state.openMode = data.openMode;
    try {
      window.localStorage?.setItem('workspace_explorer_open_mode', state.openMode);
    } catch {
      // ignore
    }
  }
  if (typeof data.autoReveal === 'boolean') {
    state.autoReveal = data.autoReveal;
    try {
      window.localStorage?.setItem('workspace_explorer_auto_reveal', String(state.autoReveal));
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
  renderPreviewContent();

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

if ($btnOpenMode) {
  $btnOpenMode.onclick = async () => {
    state.openMode = state.openMode === 'split' ? 'native' : 'split';
    try {
      window.localStorage?.setItem('workspace_explorer_open_mode', state.openMode);
    } catch {
      // ignore
    }
    hideContextMenu();
    renderHeader();
    if (state.openMode === 'split') {
      setPreviewSplitOpen(true);
      renderPreviewContent();
      showToast(t('toastModeSplit'));
    } else {
      if (!state.previewItem) {
        setPreviewSplitOpen(false);
      }
      showToast(t('toastModeNative'));
    }
    try {
      await callTool('set_language', { openMode: state.openMode });
    } catch {
      // ignore
    }
  };
}

if ($btnAutoReveal) {
  $btnAutoReveal.onclick = async () => {
    state.autoReveal = !state.autoReveal;
    try {
      window.localStorage?.setItem('workspace_explorer_auto_reveal', String(state.autoReveal));
    } catch {
      // ignore
    }
    hideContextMenu();
    renderHeader();
    showToast(state.autoReveal ? t('toastAutoRevealOn') : t('toastAutoRevealOff'));
    if (state.autoReveal && state.previewItem) {
      syncAutoRevealInTree(state.previewItem.rootPath, state.previewItem.relPath);
    }
    try {
      await callTool('set_language', { autoReveal: state.autoReveal });
    } catch {
      // ignore
    }
  };
}

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
    renderPreviewContent();
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
  const activeTab = getActiveTab();
  if (activeTab) {
    await openFileInlinePreview(activeTab.item, activeTab.rootPath, true);
  }
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
renderPreviewContent();

if ($btnModeRender) {
  $btnModeRender.onclick = () => {
    const tab = getActiveTab();
    if (tab) tab.renderMode = 'render';
    state.previewRenderMode = 'render';
    renderPreviewContent();
  };
}

if ($btnModeRaw) {
  $btnModeRaw.onclick = () => {
    const tab = getActiveTab();
    if (tab) tab.renderMode = 'raw';
    state.previewRenderMode = 'raw';
    renderPreviewContent();
  };
}

if ($btnPreviewFind) {
  $btnPreviewFind.onclick = () => {
    if (state.findOpen) {
      closeFindBar();
    } else {
      openFindBar();
    }
  };
}

if ($findInput) {
  let findDebounce = null;
  $findInput.oninput = (e) => {
    state.findQuery = e.target.value;
    clearTimeout(findDebounce);
    findDebounce = setTimeout(() => applyInFileFind(true, true), 80);
  };
  $findInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      stepInFileMatch(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeFindBar();
    }
  };
}

if ($btnFindCase) {
  $btnFindCase.onclick = () => {
    state.findCaseSensitive = !state.findCaseSensitive;
    $btnFindCase.classList.toggle('active', state.findCaseSensitive);
    applyInFileFind(true, false);
    if ($findInput) $findInput.focus();
  };
}

if ($btnFindRegex) {
  $btnFindRegex.onclick = () => {
    state.findRegex = !state.findRegex;
    $btnFindRegex.classList.toggle('active', state.findRegex);
    applyInFileFind(true, false);
    if ($findInput) $findInput.focus();
  };
}

if ($btnFindPrev) {
  $btnFindPrev.onclick = () => stepInFileMatch(-1);
}

if ($btnFindNext) {
  $btnFindNext.onclick = () => stepInFileMatch(1);
}

if ($btnFindClose) {
  $btnFindClose.onclick = () => closeFindBar();
}

if ($btnPreviewWrap) {
  $btnPreviewWrap.onclick = () => {
    state.previewWrap = !state.previewWrap;
    renderPreviewContent();
  };
}

if ($btnPreviewCopyContent) {
  $btnPreviewCopyContent.onclick = async () => {
    if (state.previewData?.content) {
      await copyText(state.previewData.content, t('labelFileContent'));
      if (state.previewItem?.name) {
        showToast(t('toastCopiedContent', state.previewItem.name));
      }
    }
  };
}

$btnPreviewClose.onclick = () => {
  if (state.activeTabKey) {
    closePreviewTab(state.activeTabKey);
  } else {
    setPreviewSplitOpen(false);
  }
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

// Drag left/right to resize the right-docked file tree width
let isResizing = false;
$previewResizer.addEventListener('mousedown', (e) => {
  e.preventDefault();
  isResizing = true;
  $previewResizer.classList.add('dragging');
});
window.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const totalW = $mainSplit.clientWidth || window.innerWidth;
  const newTreeWidth = totalW - e.clientX;
  const clamped = Math.max(170, Math.min(totalW * 0.72, newTreeWidth));
  $mainSplit.style.setProperty('--tree-width', `${Math.round(clamped)}px`);
});
window.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    $previewResizer.classList.remove('dragging');
  }
});

document.addEventListener('click', (e) => {
  if (!$ctxMenu.contains(e.target)) hideContextMenu();
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
    if (state.previewItem && $mainSplit.classList.contains('preview-open')) {
      e.preventDefault();
      openFindBar();
      return;
    }
  }
  if (e.key === 'Escape') {
    hideContextMenu();
    if (state.findOpen) {
      closeFindBar();
    }
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
  if (!forceInitialCheck && inFlightToolCalls >= 2) return;
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

async function syncActiveOpenFile(immediate = false) {
  if (!state.initialized) return;
  if (!immediate && document.visibilityState === 'hidden') return;
  if (!$mainSplit.classList.contains('preview-open')) return;
  if (!immediate && inFlightToolCalls >= 2) return;
  const tab = getActiveTab();
  if (!tab || tab.loading || tab.syncing) return;
  await syncTabFile(tab, { force: false, silent: true, showLoading: false });
}

(async () => {
  try {
    await app.connect();
    state.capabilities = app.getHostCapabilities() || {};
    applyHostStyling(app.getHostContext());

    window.addEventListener('focus', () => {
      syncActiveWorkspace(false);
      syncActiveOpenFile(true);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        syncActiveWorkspace(false);
        syncActiveOpenFile(true);
      }
    });
    setInterval(() => syncActiveWorkspace(false), 1500);
    setInterval(() => syncActiveOpenFile(false), 800);

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
