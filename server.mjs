import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const nativeRequire =
  typeof require === 'function' ? require : createRequire(import.meta.url);

const BASE_DIR =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const APP_URI = 'ui://workspace-explorer/app.html';
const APP_HTML_PATH =
  process.env.WORKSPACE_EXPLORER_HTML ||
  (fsSync.existsSync(path.join(BASE_DIR, 'app.html'))
    ? path.join(BASE_DIR, 'app.html')
    : path.join(BASE_DIR, 'dist', 'app.html'));
const GEMINI_DIR = path.join(os.homedir(), '.gemini');
const PROJECTS_DIR = path.join(GEMINI_DIR, 'config', 'projects');
const HOOK_ACTIVE_FILE = path.join(GEMINI_DIR, '.workspace-explorer-active.json');
const AGY_UI_DIRS = ['antigravity', 'antigravity-ide'].map((d) => path.join(GEMINI_DIR, d));

let sqliteMod = null;
let sqliteLoaded = false;
function getSqlite() {
  if (!sqliteLoaded) {
    sqliteLoaded = true;
    try {
      sqliteMod = nativeRequire('node:sqlite');
    } catch {
      sqliteMod = null;
    }
  }
  return sqliteMod;
}

// Cache conversationId -> { rootPath, projectId }
const convSummaryCache = new Map();

// Parse --data-dir=...
const dataDirArg = process.argv.find((a) => a.startsWith('--data-dir='));
const DATA_DIR = dataDirArg ? dataDirArg.slice('--data-dir='.length) : path.join(__dirname, '.data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const IGNORED_SEARCH_DIRS = new Set([
  '.git',
  '.svn',
  'node_modules',
  '.venv',
  'venv',
  '__pycache__',
  'library',
  'temp',
  'local',
  '.idea',
  '.vs',
  'bin',
  'obj',
  'dist',
  'build',
  '.next',
  '.nuxt',
]);

// Roots explicitly passed to open_explorer during this server session
const sessionAllowedRoots = new Map(); // normalizedKey -> resolvedPath

function uriToLocalPath(uri) {
  if (!uri || typeof uri !== 'string') return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith('file://')) {
      const normalized = trimmed.replace(/^file:\/\/\/([a-zA-Z])%3[aA](\/|$)/, 'file:///$1:$2');
      return path.normalize(fileURLToPath(normalized));
    }
    return path.normalize(trimmed);
  } catch {
    try {
      let stripped = trimmed.replace(/^file:\/\/\/?/, '');
      stripped = decodeURIComponent(stripped);
      if (/^\/[a-zA-Z]:/.test(stripped)) stripped = stripped.slice(1);
      return path.normalize(stripped);
    } catch {
      return null;
    }
  }
}

function localPathToUri(p) {
  return pathToFileURL(path.resolve(p)).href;
}

function normalizePathKey(p) {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function extractFolderUrisFromProject(obj) {
  const uris = [];
  const resources = obj?.projectResources?.resources;
  if (Array.isArray(resources)) {
    for (const r of resources) {
      if (!r || typeof r !== 'object') continue;
      for (const val of Object.values(r)) {
        if (val && typeof val === 'object') {
          if (typeof val.folderUri === 'string') uris.push(val.folderUri);
          else if (typeof val.uri === 'string') uris.push(val.uri);
          else if (typeof val.path === 'string') uris.push(val.path);
        }
      }
      if (typeof r.folderUri === 'string') uris.push(r.folderUri);
      if (typeof r.uri === 'string') uris.push(r.uri);
    }
  }
  return uris;
}

async function loadAntigravityProjects() {
  const projects = [];
  const seen = new Set();

  try {
    const files = await fs.readdir(PROJECTS_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const fullJsonPath = path.join(PROJECTS_DIR, file);
        const [raw, fileStat] = await Promise.all([
          fs.readFile(fullJsonPath, 'utf8'),
          fs.stat(fullJsonPath),
        ]);
        const json = JSON.parse(raw);
        const uris = extractFolderUrisFromProject(json);
        for (const uri of uris) {
          const localPath = uriToLocalPath(uri);
          if (!localPath) continue;
          const key = normalizePathKey(localPath);
          if (seen.has(key)) continue;
          try {
            const stat = await fs.stat(localPath);
            if (!stat.isDirectory()) continue;
          } catch {
            continue;
          }
          seen.add(key);
          projects.push({
            id: json.id || file.replace(/\.json$/, ''),
            name: json.name || path.basename(localPath),
            rootPath: path.resolve(localPath),
            uri: localPathToUri(localPath),
            lastSelectedAt: Math.round(fileStat.mtimeMs || 0),
          });
        }
      } catch {
        // skip unreadable project file
      }
    }
  } catch {
    // projects directory missing
  }

  projects.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return projects;
}

async function readHookActiveWorkspace() {
  try {
    const raw = await fs.readFile(HOOK_ACTIVE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.workspacePath !== 'string') return null;
    const resolved = path.resolve(parsed.workspacePath);
    const st = await fs.stat(resolved);
    if (!st.isDirectory()) return null;
    const key = normalizePathKey(resolved);
    sessionAllowedRoots.set(key, resolved);
    return {
      rootPath: resolved,
      conversationId: parsed.conversationId || null,
      updatedAt: Number(parsed.updatedAt) || Math.round(st.mtimeMs || 0),
    };
  } catch {
    return null;
  }
}

function parseRootFromUrisJson(workspaceUrisJson) {
  if (!workspaceUrisJson || typeof workspaceUrisJson !== 'string') return null;
  try {
    const arr = JSON.parse(workspaceUrisJson);
    if (!Array.isArray(arr)) return null;
    for (const u of arr) {
      const local = uriToLocalPath(u);
      if (!local) continue;
      const resolved = path.resolve(local);
      try {
        if (fsSync.statSync(resolved).isDirectory()) {
          return resolved;
        }
      } catch {
        // ignore missing directory
      }
    }
  } catch {
    // ignore malformed json
  }
  return null;
}

function resolveConversationWorkspace(agyDir, conversationId, hookActive) {
  if (!conversationId) return null;
  if (convSummaryCache.has(conversationId)) {
    return convSummaryCache.get(conversationId);
  }
  if (hookActive?.conversationId === conversationId && hookActive?.rootPath) {
    const res = { rootPath: hookActive.rootPath, projectId: null };
    convSummaryCache.set(conversationId, res);
    return res;
  }

  const sqlite = getSqlite();
  const dbPath = path.join(agyDir, 'conversation_summaries.db');
  if (sqlite?.DatabaseSync && fsSync.existsSync(dbPath)) {
    let db;
    try {
      db = new sqlite.DatabaseSync(dbPath, { readOnly: true });
      const stmt = db.prepare(
        'SELECT workspace_uris, project_id, parent_conversation_id FROM conversation_summaries WHERE conversation_id = ?',
      );
      let row = stmt.get(conversationId);
      let hops = 0;
      while (
        row &&
        (!row.workspace_uris || row.workspace_uris === '[]') &&
        !row.project_id &&
        row.parent_conversation_id &&
        hops < 3
      ) {
        row = stmt.get(row.parent_conversation_id);
        hops++;
      }
      if (row) {
        const rootPath = parseRootFromUrisJson(row.workspace_uris);
        const projectId =
          row.project_id && row.project_id !== 'default-cli-project' ? row.project_id : null;
        if (rootPath) {
          sessionAllowedRoots.set(normalizePathKey(rootPath), rootPath);
        }
        if (rootPath || projectId) {
          const res = { rootPath, projectId };
          convSummaryCache.set(conversationId, res);
          return res;
        }
      }
    } catch {
      // ignore sqlite errors
    } finally {
      try {
        db?.close();
      } catch {
        // ignore
      }
    }
  }

  // Fallback for Node runtimes without node:sqlite: scan agyhub_summaries_proto.pb
  try {
    const pbPath = path.join(agyDir, 'agyhub_summaries_proto.pb');
    if (fsSync.existsSync(pbPath)) {
      const str = fsSync.readFileSync(pbPath, 'utf8');
      const idx = str.indexOf(conversationId);
      if (idx !== -1) {
        const after = str.slice(idx, idx + 450);
        const matches = after.match(/file:\/\/\/[^\x00-\x1f"'\s\ufffd]+/g) || [];
        for (const u of matches) {
          const local = uriToLocalPath(u);
          if (!local) continue;
          const resolved = path.resolve(local);
          try {
            if (fsSync.statSync(resolved).isDirectory()) {
              sessionAllowedRoots.set(normalizePathKey(resolved), resolved);
              const res = { rootPath: resolved, projectId: null };
              convSummaryCache.set(conversationId, res);
              return res;
            }
          } catch {
            // continue
          }
        }
      }
    }
  } catch {
    // ignore fallback errors
  }

  return null;
}

/**
 * Detect the conversation currently viewed or active in the Antigravity UI by reading
 * annotations/<conversationId>.pbtxt (last_user_view_time) and conversation_summaries.db.
 */
async function readUiActiveConversation(hookActive) {
  let best = null; // { conversationId, rootPath, projectId, signalTime }

  for (const agyDir of AGY_UI_DIRS) {
    const annDir = path.join(agyDir, 'annotations');
    try {
      const files = (await fs.readdir(annDir)).filter((f) => f.endsWith('.pbtxt'));
      const stats = await Promise.all(
        files.map(async (file) => {
          try {
            const full = path.join(annDir, file);
            const st = await fs.stat(full);
            return { file, full, mtimeMs: Math.round(st.mtimeMs || 0) };
          } catch {
            return null;
          }
        }),
      );
      const topFiles = stats
        .filter(Boolean)
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .slice(0, 15);

      for (const item of topFiles) {
        try {
          const raw = await fs.readFile(item.full, 'utf8');
          const m = raw.match(
            /last_user_view_time:\s*\{\s*seconds:\s*(\d+)(?:\s+nanos:\s*(\d+))?\s*\}/,
          );
          const viewTimeMs = m
            ? Number(m[1]) * 1000 + Math.round(Number(m[2] || 0) / 1e6)
            : item.mtimeMs;
          if (best && viewTimeMs <= best.signalTime) continue;

          const conversationId = item.file.replace(/\.pbtxt$/, '');
          const resolved = resolveConversationWorkspace(agyDir, conversationId, hookActive);
          if (resolved && (resolved.rootPath || resolved.projectId)) {
            best = {
              conversationId,
              rootPath: resolved.rootPath,
              projectId: resolved.projectId,
              signalTime: viewTimeMs,
            };
          }
        } catch {
          // ignore unreadable annotation file
        }
      }
    } catch {
      // annotations dir missing
    }

    // Also check latest user input conversation in conversation_summaries.db
    const sqlite = getSqlite();
    const dbPath = path.join(agyDir, 'conversation_summaries.db');
    if (sqlite?.DatabaseSync && fsSync.existsSync(dbPath)) {
      let db;
      try {
        db = new sqlite.DatabaseSync(dbPath, { readOnly: true });
        const row = db
          .prepare(
            `SELECT conversation_id, workspace_uris, project_id, last_user_input_time
             FROM conversation_summaries
             WHERE source != 'CORTEX_TRAJECTORY_SOURCE_CLI' AND nesting_depth = 0
             ORDER BY last_user_input_time DESC
             LIMIT 1`,
          )
          .get();
        if (row) {
          const inputMs = Date.parse(row.last_user_input_time || '') || 0;
          if (!best || inputMs > best.signalTime) {
            const rootPath = parseRootFromUrisJson(row.workspace_uris);
            const projectId =
              row.project_id && row.project_id !== 'default-cli-project' ? row.project_id : null;
            if (rootPath) {
              sessionAllowedRoots.set(normalizePathKey(rootPath), rootPath);
            }
            if (rootPath || projectId) {
              best = {
                conversationId: row.conversation_id,
                rootPath,
                projectId,
                signalTime: inputMs,
              };
            }
          }
        }
      } catch {
        // ignore
      } finally {
        try {
          db?.close();
        } catch {
          // ignore
        }
      }
    }
  }

  return best;
}

// Serialized state persistence to prevent concurrent write races
let stateWriteChain = Promise.resolve();

async function readState() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object'
      ? parsed
      : { lastRootPath: null, recents: [], lang: 'en' };
  } catch {
    return { lastRootPath: null, recents: [], lang: 'en' };
  }
}

function updateState(mutator) {
  stateWriteChain = stateWriteChain.then(async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const prev = await readState();
      const next = await mutator(prev);
      await fs.writeFile(STATE_FILE, JSON.stringify(next, null, 2), 'utf8');
      return next;
    } catch {
      return null;
    }
  });
  return stateWriteChain;
}

async function addRecentFile(entry) {
  await updateState((prev) => {
    const list = Array.isArray(prev.recents) ? prev.recents : [];
    const filtered = list.filter((x) => normalizePathKey(x.absPath) !== normalizePathKey(entry.absPath));
    filtered.unshift({ ...entry, openedAt: Date.now() });
    return { ...prev, recents: filtered.slice(0, 15) };
  });
}

function isSubPath(rootPath, targetPath) {
  const root = normalizePathKey(rootPath);
  const target = normalizePathKey(targetPath);
  if (root === target) return true;
  const withSep = root.endsWith(path.sep) ? root : root + path.sep;
  return target.startsWith(withSep);
}

function toPosixRel(rootPath, targetPath) {
  const rel = path.relative(rootPath, targetPath);
  return rel.split(path.sep).join('/');
}

const mcp = new McpServer({
  name: 'workspace-explorer',
  version: '1.0.0',
});

async function detectClientRoots() {
  try {
    const caps = mcp.server.getClientCapabilities?.();
    if (!caps?.roots) return [];
    const res = await mcp.server.listRoots();
    const list = [];
    for (const r of res?.roots || []) {
      const p = uriToLocalPath(r.uri);
      if (!p) continue;
      try {
        const st = await fs.stat(p);
        if (st.isDirectory()) {
          list.push({
            id: `root:${normalizePathKey(p)}`,
            name: r.name || path.basename(p),
            rootPath: path.resolve(p),
            uri: localPathToUri(p),
          });
        }
      } catch {
        // ignore missing
      }
    }
    return list;
  } catch {
    return [];
  }
}

async function getAllowedProjectsMap() {
  const map = new Map(); // normalizedKey -> projectObj
  const hookActive = await readHookActiveWorkspace();
  await readUiActiveConversation(hookActive);
  const known = await loadAntigravityProjects();
  for (const p of known) {
    map.set(normalizePathKey(p.rootPath), p);
  }
  const clientRoots = await detectClientRoots();
  for (const cr of clientRoots) {
    const k = normalizePathKey(cr.rootPath);
    if (!map.has(k)) map.set(k, cr);
  }
  for (const [k, rp] of sessionAllowedRoots.entries()) {
    if (!map.has(k)) {
      map.set(k, {
        id: `session:${k}`,
        name: path.basename(rp),
        rootPath: rp,
        uri: localPathToUri(rp),
      });
    }
  }
  return map;
}

async function assertAllowedRoot(rootPath) {
  if (!rootPath || typeof rootPath !== 'string') {
    throw new Error('Missing rootPath');
  }
  const resolved = path.resolve(rootPath);
  const key = normalizePathKey(resolved);
  const allowed = await getAllowedProjectsMap();
  const matched = allowed.get(key);
  if (!matched) {
    throw new Error(`Access denied: "${resolved}" is not a registered Antigravity project.`);
  }
  return matched.rootPath;
}

async function readDirEntries(rootPath, relPath = '', showHidden = true) {
  const resolvedRoot = await assertAllowedRoot(rootPath);
  const targetDir = relPath ? path.resolve(resolvedRoot, relPath) : resolvedRoot;
  if (!isSubPath(resolvedRoot, targetDir)) {
    throw new Error('Access denied: path escapes project root');
  }

  const dirents = await fs.readdir(targetDir, { withFileTypes: true });
  const items = [];

  for (const d of dirents) {
    const isHidden = d.name.startsWith('.');
    if (!showHidden && isHidden) continue;

    const absPath = path.join(targetDir, d.name);
    let isDir = d.isDirectory();
    let size = 0;
    if (d.isSymbolicLink()) {
      try {
        const st = await fs.stat(absPath);
        isDir = st.isDirectory();
        size = st.size;
      } catch {
        continue;
      }
    } else if (!isDir) {
      try {
        const st = await fs.stat(absPath);
        size = st.size;
      } catch {
        size = 0;
      }
    }

    const ext = isDir ? '' : path.extname(d.name).toLowerCase().replace(/^\./, '');
    items.push({
      name: d.name,
      relPath: toPosixRel(resolvedRoot, absPath),
      absPath,
      fileUri: localPathToUri(absPath),
      isDir,
      size,
      ext,
      isHidden,
    });
  }

  items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  return items;
}

function isWordBoundary(str, idx) {
  if (idx === 0) return true;
  const prev = str[idx - 1];
  const curr = str[idx];
  if (prev === '/' || prev === '\\' || prev === '_' || prev === '-' || prev === '.' || prev === ' ') {
    return true;
  }
  // camelCase boundary: lower -> UPPER
  return prev >= 'a' && prev <= 'z' && curr >= 'A' && curr <= 'Z';
}

function mergeIndicesToRanges(indices) {
  if (!indices.length) return [];
  const ranges = [];
  let start = indices[0];
  let prev = indices[0];
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === prev + 1) {
      prev = indices[i];
    } else {
      ranges.push([start, prev + 1]);
      start = indices[i];
      prev = indices[i];
    }
  }
  ranges.push([start, prev + 1]);
  return ranges;
}

/**
 * Fuzzy subsequence matcher with boundary & consecutive-run bonuses.
 * Returns { score (lower is better), ranges: [[start, end], ...] } or null.
 */
function fuzzyMatchText(rawPattern, rawText, caseSensitive, maxSpan = Infinity) {
  const pLen = rawPattern.length;
  const tLen = rawText.length;
  if (pLen === 0 || pLen > tLen) return null;

  const pattern = caseSensitive ? rawPattern : rawPattern.toLowerCase();
  const text = caseSensitive ? rawText : rawText.toLowerCase();

  // Fast exact / substring path
  const exactIdx = text.indexOf(pattern);
  if (exactIdx !== -1) {
    let rank = 0;
    if (tLen === pLen) {
      rank = -1000;
    } else if (exactIdx === 0) {
      rank = -600 + (tLen - pLen) * 0.5;
    } else if (isWordBoundary(rawText, exactIdx)) {
      rank = -400 + exactIdx * 0.5 + (tLen - pLen) * 0.3;
    } else {
      rank = -250 + exactIdx + (tLen - pLen) * 0.3;
    }
    return {
      score: rank,
      ranges: [[exactIdx, exactIdx + pLen]],
    };
  }

  // Quick subsequence existence check (forward pass)
  let pi = 0;
  for (let ti = 0; ti < tLen && pi < pLen; ti++) {
    if (text[ti] === pattern[pi]) pi++;
  }
  if (pi < pLen) return null;

  // Greedy boundary-preferring alignment
  const indices = new Array(pLen);
  let searchFrom = 0;
  for (let i = 0; i < pLen; i++) {
    const ch = pattern[i];
    // Find latest possible bound so remaining chars still fit? Keep simple:
    // check if there's a boundary match before forced limit, else first match.
    let firstMatch = -1;
    let boundaryMatch = -1;

    // Calculate max index allowed for position i by scanning backwards on demand only if needed
    for (let j = searchFrom; j <= tLen - (pLen - i); j++) {
      if (text[j] === ch) {
        if (firstMatch === -1) firstMatch = j;
        if (i > 0 && j === indices[i - 1] + 1) {
          // Consecutive char right after previous match is ideal
          boundaryMatch = j;
          break;
        }
        if (isWordBoundary(rawText, j)) {
          // Verify remaining pattern still fits after j
          let rem = i + 1;
          for (let k = j + 1; k < tLen && rem < pLen; k++) {
            if (text[k] === pattern[rem]) rem++;
          }
          if (rem === pLen) {
            boundaryMatch = j;
            break;
          }
        }
      }
    }

    const chosen = boundaryMatch !== -1 ? boundaryMatch : firstMatch;
    if (chosen === -1) return null;
    indices[i] = chosen;
    searchFrom = chosen + 1;
  }

  const span = indices[pLen - 1] - indices[0] + 1;
  if (span > maxSpan) return null;

  let bonus = 0;
  for (let i = 0; i < pLen; i++) {
    const idx = indices[i];
    if (i > 0 && idx === indices[i - 1] + 1) {
      bonus += 18; // consecutive bonus
    }
    if (isWordBoundary(rawText, idx)) {
      bonus += 22; // word/camelCase boundary bonus
    }
    if (rawPattern[i] === rawText[idx]) {
      bonus += 2; // exact case bonus
    }
  }

  const gaps = span - pLen;
  const rank = -bonus + gaps * 6 + indices[0] * 1.5 + (tLen - pLen) * 0.4;
  return {
    score: rank,
    ranges: mergeIndicesToRanges(indices),
  };
}

function buildSearchMatcher(rawQuery, { caseSensitive = false, useRegex = false, fuzzy = true } = {}) {
  const q = useRegex ? rawQuery : rawQuery.trim();
  if (!q) return { matcher: null, regexError: null };

  if (useRegex) {
    let re;
    try {
      re = new RegExp(q, caseSensitive ? '' : 'i');
    } catch (err) {
      return { matcher: null, regexError: err.message || 'Invalid regular expression' };
    }

    const matcher = (name, relPath) => {
      const mName = re.exec(name);
      if (mName && mName[0].length >= 0) {
        const start = mName.index;
        const end = start + mName[0].length;
        const rank = start === 0 && mName[0].length === name.length ? -500 : -200 + start;
        return {
          score: rank,
          nameRanges: end > start ? [[start, end]] : [],
          pathRanges: [],
        };
      }
      const mPath = re.exec(relPath);
      if (mPath && mPath[0].length >= 0) {
        const start = mPath.index;
        const end = start + mPath[0].length;
        return {
          score: 100 + start,
          nameRanges: [],
          pathRanges: end > start ? [[start, end]] : [],
        };
      }
      return null;
    };
    return { matcher, regexError: null };
  }

  if (!fuzzy) {
    const needle = caseSensitive ? q : q.toLowerCase();
    const matcher = (name, relPath) => {
      const hayName = caseSensitive ? name : name.toLowerCase();
      const nIdx = hayName.indexOf(needle);
      if (nIdx !== -1) {
        const rank =
          hayName.length === needle.length
            ? -1000
            : nIdx === 0
              ? -600 + name.length * 0.3
              : -300 + nIdx * 2 + name.length * 0.3;
        return {
          score: rank,
          nameRanges: [[nIdx, nIdx + needle.length]],
          pathRanges: [],
        };
      }
      const hayPath = caseSensitive ? relPath : relPath.toLowerCase();
      const pIdx = hayPath.indexOf(needle);
      if (pIdx !== -1) {
        return {
          score: 80 + pIdx + relPath.length * 0.2,
          nameRanges: [],
          pathRanges: [[pIdx, pIdx + needle.length]],
        };
      }
      return null;
    };
    return { matcher, regexError: null };
  }

  // Fuzzy mode
  const normalizedQ = q.replace(/\\/g, '/');
  const hasSlash = normalizedQ.includes('/');
  const maxPathSpan = Math.max(normalizedQ.length * 4 + 12, 24);

  const matcher = (name, relPath) => {
    if (!hasSlash) {
      const mName = fuzzyMatchText(normalizedQ, name, caseSensitive, Infinity);
      if (mName) {
        return {
          score: mName.score,
          nameRanges: mName.ranges,
          pathRanges: [],
        };
      }
    }
    const mPath = fuzzyMatchText(
      normalizedQ,
      relPath,
      caseSensitive,
      hasSlash ? Infinity : maxPathSpan,
    );
    if (mPath) {
      return {
        score: mPath.score + 120,
        nameRanges: [],
        pathRanges: mPath.ranges,
      };
    }
    return null;
  };
  return { matcher, regexError: null };
}

async function searchSingleProject(resolvedRoot, projectName, matcher, showHidden) {
  if (!matcher) return [];

  const results = [];
  const queue = [resolvedRoot];
  let visited = 0;
  const MAX_VISITED = 30000;

  while (queue.length > 0 && visited < MAX_VISITED) {
    const current = queue.shift();
    let dirents;
    try {
      dirents = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const d of dirents) {
      visited++;
      if (visited > MAX_VISITED) break;

      const isHidden = d.name.startsWith('.');
      if (!showHidden && isHidden) continue;

      // Skip following symlinks during recursive search to avoid cycles
      if (d.isSymbolicLink()) continue;

      const absPath = path.join(current, d.name);
      const isDir = d.isDirectory();
      const relPath = toPosixRel(resolvedRoot, absPath);

      const match = matcher(d.name, relPath);
      if (match) {
        results.push({
          name: d.name,
          relPath,
          absPath,
          rootPath: resolvedRoot,
          projectName,
          fileUri: localPathToUri(absPath),
          isDir,
          isHidden,
          ext: isDir ? '' : path.extname(d.name).toLowerCase().replace(/^\./, ''),
          score: match.score,
          nameRanges: match.nameRanges,
          pathRanges: match.pathRanges,
        });
      }

      if (isDir && !IGNORED_SEARCH_DIRS.has(d.name.toLowerCase()) && !IGNORED_SEARCH_DIRS.has(d.name)) {
        queue.push(absPath);
      }
    }
  }

  return results;
}

const IMAGE_MIME_MAP = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
};

const KNOWN_BINARY_EXTS = new Set([
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'pdf',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'tgz',
  'bz2',
  'xz',
  'exe',
  'dll',
  'so',
  'dylib',
  'bin',
  'dat',
  'db',
  'sqlite',
  'sqlite3',
  'mp3',
  'mp4',
  'wav',
  'ogg',
  'flac',
  'aac',
  'avi',
  'mov',
  'mkv',
  'webm',
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',
  'class',
  'jar',
  'war',
  'pyc',
  'pyd',
  'wasm',
  'psd',
  'ai',
  'sketch',
  'fig',
  'fbx',
  'glb',
  'osgb',
]);

async function readFilePreview(rootPath, relPath) {
  const resolvedRoot = await assertAllowedRoot(rootPath);
  const absPath = path.resolve(resolvedRoot, relPath);
  if (!isSubPath(resolvedRoot, absPath)) {
    throw new Error('Access denied: path escapes project root');
  }

  const stat = await fs.stat(absPath);
  if (stat.isDirectory()) {
    throw new Error('Target is a directory');
  }

  const name = path.basename(absPath);
  const ext = path.extname(name).toLowerCase().replace(/^\./, '');
  const normalizedRel = toPosixRel(resolvedRoot, absPath);
  const imageMime = IMAGE_MIME_MAP[ext] || null;
  const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
  const MAX_TEXT_BYTES = 200 * 1024;

  await addRecentFile({
    name,
    relPath: normalizedRel,
    absPath,
    rootPath: resolvedRoot,
    fileUri: localPathToUri(absPath),
    ext,
  });

  if (imageMime && stat.size <= MAX_IMAGE_BYTES) {
    const buf = await fs.readFile(absPath);
    const dataUrl = `data:${imageMime};base64,${buf.toString('base64')}`;
    const isSvg = ext === 'svg';
    return {
      name,
      relPath: normalizedRel,
      absPath,
      fileUri: localPathToUri(absPath),
      ext,
      size: stat.size,
      isImage: true,
      mimeType: imageMime,
      dataUrl,
      isBinary: !isSvg,
      truncated: false,
      content: isSvg ? buf.toString('utf8') : '',
    };
  }

  if (KNOWN_BINARY_EXTS.has(ext) || (imageMime && stat.size > MAX_IMAGE_BYTES)) {
    return {
      name,
      relPath: normalizedRel,
      absPath,
      fileUri: localPathToUri(absPath),
      ext,
      size: stat.size,
      isImage: false,
      isBinary: true,
      truncated: false,
      content: '',
    };
  }

  const fd = await fs.open(absPath, 'r');
  try {
    const len = Math.min(stat.size, MAX_TEXT_BYTES);
    const buf = Buffer.alloc(len);
    await fd.read(buf, 0, len, 0);

    const sampleLen = Math.min(len, 4096);
    let isBinary = false;
    for (let i = 0; i < sampleLen; i++) {
      if (buf[i] === 0) {
        isBinary = true;
        break;
      }
    }

    if (isBinary) {
      return {
        name,
        relPath: normalizedRel,
        absPath,
        fileUri: localPathToUri(absPath),
        ext,
        size: stat.size,
        isImage: false,
        isBinary: true,
        truncated: false,
        content: '',
      };
    }

    return {
      name,
      relPath: normalizedRel,
      absPath,
      fileUri: localPathToUri(absPath),
      ext,
      size: stat.size,
      isImage: false,
      isBinary: false,
      truncated: stat.size > MAX_TEXT_BYTES,
      content: buf.toString('utf8'),
    };
  } finally {
    await fd.close();
  }
}

function extractWorkspaceFromMeta(extra) {
  const meta = extra?._meta;
  if (!meta || typeof meta !== 'object') return null;
  const candidates = [
    meta.workspaceUri,
    meta.rootUri,
    meta.cwd,
    Array.isArray(meta.workspaceUris) ? meta.workspaceUris[0] : null,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      const p = uriToLocalPath(c);
      if (p) return p;
    }
  }
  return null;
}

async function resolveContext(explicitRootPath, extra) {
  const [knownProjects, clientRoots, hookActive, state] = await Promise.all([
    loadAntigravityProjects(),
    detectClientRoots(),
    readHookActiveWorkspace(),
    readState(),
  ]);
  const uiActive = await readUiActiveConversation(hookActive);

  const projects = [...knownProjects];
  const keySet = new Set(projects.map((p) => normalizePathKey(p.rootPath)));

  for (const cr of clientRoots) {
    const k = normalizePathKey(cr.rootPath);
    if (!keySet.has(k)) {
      projects.unshift(cr);
      keySet.add(k);
    }
  }

  for (const [k, rp] of sessionAllowedRoots.entries()) {
    if (!keySet.has(k) && fsSync.existsSync(rp)) {
      projects.unshift({
        id: `session:${k}`,
        name: path.basename(rp),
        rootPath: rp,
        uri: localPathToUri(rp),
      });
      keySet.add(k);
    }
  }

  let activeProject = null;
  let activeConversationId = null;
  let detectedBy = 'all';
  let signalTime = 0;

  // 1. Explicit tool argument or MCP request _meta
  const candidateExplicit = explicitRootPath || extractWorkspaceFromMeta(extra);
  if (candidateExplicit) {
    const localCandidate = uriToLocalPath(candidateExplicit) || candidateExplicit;
    const resolved = path.resolve(localCandidate);
    try {
      const st = await fs.stat(resolved);
      if (st.isDirectory()) {
        const key = normalizePathKey(resolved);
        sessionAllowedRoots.set(key, resolved);
        activeProject = projects.find((p) => normalizePathKey(p.rootPath) === key) || {
          id: `explicit:${key}`,
          name: path.basename(resolved),
          rootPath: resolved,
          uri: localPathToUri(resolved),
        };
        if (!keySet.has(key)) {
          projects.unshift(activeProject);
          keySet.add(key);
        }
        detectedBy = explicitRootPath ? 'arg' : 'roots';
        signalTime = Date.now();
        await updateState((prev) => ({ ...prev, lastRootPath: resolved }));
      }
    } catch {
      // ignore non-existent explicit path
    }
  }

  // 2. MCP client roots/list
  if (!activeProject && clientRoots.length > 0) {
    const key = normalizePathKey(clientRoots[0].rootPath);
    activeProject = projects.find((p) => normalizePathKey(p.rootPath) === key) || clientRoots[0];
    detectedBy = 'roots';
    signalTime = Date.now();
  }

  // 3. Live Antigravity UI focused conversation (annotations/*.pbtxt + conversation_summaries.db)
  //    compared with initial turn lifecycle hook (.workspace-explorer-active.json)
  if (!activeProject) {
    let uiProj = null;
    let uiTime = 0;
    if (uiActive) {
      if (uiActive.rootPath) {
        const uk = normalizePathKey(uiActive.rootPath);
        uiProj =
          projects.find((p) => normalizePathKey(p.rootPath) === uk) ||
          projects.find((p) => isSubPath(p.rootPath, uiActive.rootPath));
      }
      if (!uiProj && uiActive.projectId) {
        uiProj = projects.find((p) => p.id === uiActive.projectId) || null;
      }
      if (!uiProj && uiActive.rootPath) {
        const uk = normalizePathKey(uiActive.rootPath);
        uiProj = {
          id: `chat:${uk}`,
          name: path.basename(uiActive.rootPath),
          rootPath: uiActive.rootPath,
          uri: localPathToUri(uiActive.rootPath),
        };
        if (!keySet.has(uk)) {
          projects.unshift(uiProj);
          keySet.add(uk);
        }
      }
      if (uiProj) {
        uiTime = uiActive.signalTime || 0;
      }
    }

    let hookProj = null;
    let hookTime = 0;
    if (hookActive?.rootPath) {
      const hk = normalizePathKey(hookActive.rootPath);
      hookProj =
        projects.find((p) => normalizePathKey(p.rootPath) === hk) ||
        projects.find((p) => isSubPath(p.rootPath, hookActive.rootPath)) || {
          id: `chat:${hk}`,
          name: path.basename(hookActive.rootPath),
          rootPath: hookActive.rootPath,
          uri: localPathToUri(hookActive.rootPath),
        };
      if (!keySet.has(hk)) {
        projects.unshift(hookProj);
        keySet.add(hk);
      }
      hookTime = hookActive.updatedAt || 0;
    }

    if (uiProj && (!hookProj || uiTime >= hookTime)) {
      activeProject = uiProj;
      activeConversationId = uiActive.conversationId || null;
      detectedBy = 'active-chat';
      signalTime = uiTime;
    } else if (hookProj) {
      activeProject = hookProj;
      activeConversationId = hookActive.conversationId || null;
      detectedBy = 'active-chat';
      signalTime = hookTime;
    } else {
      // Only fall back to most recently modified project config file when no active conversation is found
      let recentSidebarProj = null;
      let recentSidebarTime = 0;
      for (const p of knownProjects) {
        if ((p.lastSelectedAt || 0) > recentSidebarTime) {
          recentSidebarTime = p.lastSelectedAt || 0;
          recentSidebarProj = p;
        }
      }
      if (recentSidebarProj) {
        activeProject = recentSidebarProj;
        detectedBy = 'selected-project';
        signalTime = recentSidebarTime;
      }
    }
  }

  // 4. Fallback to server process.cwd() if inside a registered project
  if (!activeProject) {
    const cwd = path.resolve(process.cwd());
    const cwdKey = normalizePathKey(cwd);
    const matched = projects.find(
      (p) => cwdKey === normalizePathKey(p.rootPath) || isSubPath(p.rootPath, cwd),
    );
    if (matched) {
      activeProject = matched;
      detectedBy = 'cwd';
    }
  }

  // 5. Fallback to user's last manually selected project
  if (!activeProject && state.lastRootPath) {
    const lastKey = normalizePathKey(state.lastRootPath);
    const matched = projects.find((p) => normalizePathKey(p.rootPath) === lastKey);
    if (matched) {
      activeProject = matched;
      detectedBy = 'manual';
    }
  }

  // Default to 'single' whenever an active project is identified so tree & search target it directly
  const viewMode = activeProject ? 'single' : 'all';

  return {
    projects,
    activeProject,
    activeConversationId,
    viewMode,
    detectedBy,
    signalTime,
    lang: state.lang === 'zh' ? 'zh' : 'en',
    openMode: state.openMode === 'native' ? 'native' : 'split',
    recents: Array.isArray(state.recents) ? state.recents : [],
  };
}

// 1. UI Resource (request clipboardWrite permission for sandboxed iframe)
mcp.registerResource(
  'Workspace Explorer UI',
  APP_URI,
  {
    mimeType: 'text/html;profile=mcp-app',
    description: 'Interactive project file tree explorer for Antigravity',
    _meta: {
      ui: {
        prefersBorder: false,
        permissions: {
          clipboardWrite: {},
        },
      },
    },
  },
  async () => {
    const html = await fs.readFile(APP_HTML_PATH, 'utf8');
    return {
      contents: [
        {
          uri: APP_URI,
          mimeType: 'text/html;profile=mcp-app',
          text: html,
        },
      ],
    };
  },
);

// 2. Entrypoint Tool (visible to both model and UI entrypoints)
mcp.registerTool(
  'open_explorer',
  {
    title: 'Workspace Explorer',
    description:
      'Open the Workspace Explorer side pane to browse the folder tree of the current project or all Antigravity projects. Pass the current active workspace directory in rootPath when known.',
    inputSchema: {
      rootPath: z
        .string()
        .optional()
        .describe('Optional absolute path to the current active workspace root folder.'),
    },
    _meta: {
      ui: {
        resourceUri: APP_URI,
      },
      'com.google.antigravity/ui': {
        entrypoints: [
          { type: 'aux_pane', title: 'Workspace Explorer' },
          { type: 'global', title: 'Workspace Explorer' },
        ],
      },
    },
  },
  async (args, extra) => {
    const ctx = await resolveContext(args?.rootPath, extra);
    let entries = [];
    if (ctx.activeProject) {
      try {
        entries = await readDirEntries(ctx.activeProject.rootPath, '', true);
      } catch {
        entries = [];
      }
    }

    const summary =
      ctx.viewMode === 'single' && ctx.activeProject
        ? `Opened Workspace Explorer for ${ctx.activeProject.name} (${ctx.activeProject.rootPath}) with ${entries.length} top-level items.`
        : `Opened Workspace Explorer listing ${ctx.projects.length} Antigravity projects.`;

    return {
      content: [{ type: 'text', text: summary }],
      structuredContent: {
        ...ctx,
        entries,
      },
    };
  },
);

// 3. App-only tools (hidden from model)
const APP_ONLY_META = {
  ui: {
    visibility: ['app'],
  },
};

mcp.registerTool(
  'list_projects',
  {
    title: 'List Projects',
    description: 'Return all known Antigravity projects and current active context.',
    inputSchema: {},
    _meta: APP_ONLY_META,
  },
  async (_args, extra) => {
    const ctx = await resolveContext(undefined, extra);
    return {
      content: [{ type: 'text', text: `Found ${ctx.projects.length} projects.` }],
      structuredContent: ctx,
    };
  },
);

mcp.registerTool(
  'check_active_workspace',
  {
    title: 'Check Active Workspace',
    description: 'Lightweight check for active conversation or selected project changes.',
    inputSchema: {},
    _meta: APP_ONLY_META,
  },
  async (_args, extra) => {
    const ctx = await resolveContext(undefined, extra);
    return {
      content: [{ type: 'text', text: ctx.activeProject?.name || 'none' }],
      structuredContent: {
        activeProject: ctx.activeProject,
        activeConversationId: ctx.activeConversationId || null,
        detectedBy: ctx.detectedBy,
        signalTime: ctx.signalTime || 0,
        projects: ctx.projects,
      },
    };
  },
);

mcp.registerTool(
  'list_dir',
  {
    title: 'List Directory',
    description: 'List immediate children of a directory inside an allowed project.',
    inputSchema: {
      rootPath: z.string(),
      relPath: z.string().optional(),
      showHidden: z.boolean().optional(),
    },
    _meta: APP_ONLY_META,
  },
  async ({ rootPath, relPath = '', showHidden = true }) => {
    const entries = await readDirEntries(rootPath, relPath, showHidden);
    return {
      content: [{ type: 'text', text: `${entries.length} entries` }],
      structuredContent: {
        rootPath: path.resolve(rootPath),
        relPath,
        entries,
      },
    };
  },
);

mcp.registerTool(
  'search_files',
  {
    title: 'Search Files',
    description: 'Recursively search files and folders inside one project or across all projects.',
    inputSchema: {
      rootPath: z.string().optional(),
      query: z.string(),
      caseSensitive: z.boolean().optional(),
      useRegex: z.boolean().optional(),
      fuzzy: z.boolean().optional(),
      showHidden: z.boolean().optional(),
      maxResults: z.number().int().min(1).max(300).optional(),
    },
    _meta: APP_ONLY_META,
  },
  async ({
    rootPath,
    query,
    caseSensitive = false,
    useRegex = false,
    fuzzy = true,
    showHidden = true,
    maxResults = 150,
  }) => {
    const { matcher, regexError } = buildSearchMatcher(query, {
      caseSensitive,
      useRegex,
      fuzzy,
    });

    if (regexError) {
      return {
        content: [{ type: 'text', text: `Invalid regex: ${regexError}` }],
        structuredContent: {
          query,
          regexError,
          results: [],
        },
      };
    }

    if (!matcher) {
      return {
        content: [{ type: 'text', text: 'Found 0 matches' }],
        structuredContent: {
          query,
          results: [],
        },
      };
    }

    let merged = [];
    if (rootPath) {
      const resolvedRoot = await assertAllowedRoot(rootPath);
      const allowed = await getAllowedProjectsMap();
      const proj = allowed.get(normalizePathKey(resolvedRoot));
      merged = await searchSingleProject(
        resolvedRoot,
        proj?.name || path.basename(resolvedRoot),
        matcher,
        showHidden,
      );
    } else {
      const allowed = await getAllowedProjectsMap();
      const projects = [...allowed.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
      for (const p of projects) {
        const items = await searchSingleProject(p.rootPath, p.name, matcher, showHidden);
        merged.push(...items);
      }
    }

    merged.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.relPath.localeCompare(b.relPath, undefined, { numeric: true, sensitivity: 'base' });
    });

    const results = merged.slice(0, maxResults);
    return {
      content: [{ type: 'text', text: `Found ${results.length} matches` }],
      structuredContent: {
        query,
        results,
      },
    };
  },
);

mcp.registerTool(
  'read_file_preview',
  {
    title: 'Read File Preview',
    description: 'Read a text file preview inside an allowed project.',
    inputSchema: {
      rootPath: z.string(),
      relPath: z.string(),
    },
    _meta: APP_ONLY_META,
  },
  async ({ rootPath, relPath }) => {
    const preview = await readFilePreview(rootPath, relPath);
    return {
      content: [{ type: 'text', text: preview.name }],
      structuredContent: preview,
    };
  },
);

mcp.registerTool(
  'set_active_project',
  {
    title: 'Set Active Project',
    description: 'Remember the selected project root path.',
    inputSchema: {
      rootPath: z.string(),
    },
    _meta: APP_ONLY_META,
  },
  async ({ rootPath }) => {
    const resolved = await assertAllowedRoot(rootPath);
    await updateState((prev) => ({ ...prev, lastRootPath: resolved }));
    return {
      content: [{ type: 'text', text: resolved }],
      structuredContent: { lastRootPath: resolved },
    };
  },
);

mcp.registerTool(
  'set_language',
  {
    title: 'Set Language and UI Preferences',
    description: 'Remember the UI language (en or zh) and file open mode (split or native).',
    inputSchema: {
      lang: z.enum(['en', 'zh']).optional(),
      openMode: z.enum(['split', 'native']).optional(),
    },
    _meta: APP_ONLY_META,
  },
  async ({ lang, openMode }) => {
    const next = await updateState((prev) => ({
      ...prev,
      ...(lang ? { lang: lang === 'zh' ? 'zh' : 'en' } : {}),
      ...(openMode ? { openMode: openMode === 'native' ? 'native' : 'split' } : {}),
    }));
    return {
      content: [{ type: 'text', text: `${next?.lang || 'en'}:${next?.openMode || 'split'}` }],
      structuredContent: {
        lang: next?.lang || 'en',
        openMode: next?.openMode || 'split',
      },
    };
  },
);

mcp.registerTool(
  'reveal_in_os',
  {
    title: 'Reveal in System File Explorer',
    description: 'Open the OS file manager (Windows Explorer / macOS Finder / Linux file manager) and select the target file or folder.',
    inputSchema: {
      rootPath: z.string(),
      relPath: z.string().optional(),
    },
    _meta: APP_ONLY_META,
  },
  async ({ rootPath, relPath = '' }) => {
    const resolvedRoot = await assertAllowedRoot(rootPath);
    const absPath = relPath ? path.resolve(resolvedRoot, relPath) : resolvedRoot;
    if (!isSubPath(resolvedRoot, absPath)) {
      throw new Error('Access denied: path escapes project root');
    }
    const st = await fs.stat(absPath);

    if (process.platform === 'win32') {
      const winPath = path.win32.normalize(absPath);
      const child = spawn('explorer.exe', [`/select,"${winPath}"`], {
        detached: true,
        stdio: 'ignore',
        windowsVerbatimArguments: true,
      });
      child.unref();
    } else if (process.platform === 'darwin') {
      const child = spawn('open', ['-R', absPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else {
      const targetDir = st.isDirectory() ? absPath : path.dirname(absPath);
      const child = spawn('xdg-open', [targetDir], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    }

    return {
      content: [{ type: 'text', text: absPath }],
      structuredContent: { absPath },
    };
  },
);

(async () => {
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
})();
