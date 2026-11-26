#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ACTIVE_FILE = path.join(os.homedir(), '.gemini', '.workspace-explorer-active.json');

function hashInput(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
}

function readPrevious() {
  try {
    const prev = JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf8'));
    return prev && typeof prev === 'object' ? prev : {};
  } catch {
    return {};
  }
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  try {
    const payload = raw ? JSON.parse(raw) : {};

    // Ignore headless CLI invocations and subagent invocations so background jobs
    // don't hijack the GUI active workspace.
    const tp = String(payload.transcriptPath || payload.artifactDirectoryPath || '');
    if (
      tp.includes('antigravity-cli') ||
      payload.parentConversationId ||
      Number(payload.nestingDepth) > 0
    ) {
      process.stdout.write('{}\n');
      return;
    }

    // Only record on SessionStart or the first model invocation of a user turn (invocationNum <= 1),
    // so multi-step tool-loop continuations in a background tab don't overwrite the user's focused tab.
    const isSessionStart = payload.hookEventName === 'SessionStart';
    const invNum = Number(payload.invocationNum);
    const isInitialTurnStep = isSessionStart || !Number.isFinite(invNum) || invNum <= 1;

    const wsList = Array.isArray(payload.workspacePaths) ? payload.workspacePaths : [];
    const primary = wsList.find((p) => typeof p === 'string' && p.trim().length > 0);
    if (primary && isInitialTurnStep) {
      const convId = payload.conversationId || null;
      const inputHash = hashInput(payload.lastUserInput);
      const prev = readPrevious();
      const prevSeen =
        prev.seenInputs && typeof prev.seenInputs === 'object' ? { ...prev.seenInputs } : {};

      // On PreInvocation, skip if this conversation already recorded the exact same lastUserInput
      // (happens when a background conversation wakes up from a subagent/timer without new user input).
      if (!isSessionStart && convId && inputHash && prevSeen[convId] === inputHash) {
        process.stdout.write('{}\n');
        return;
      }

      if (convId && inputHash) {
        delete prevSeen[convId];
        prevSeen[convId] = inputHash;
        const keys = Object.keys(prevSeen);
        while (keys.length > 20) {
          delete prevSeen[keys.shift()];
        }
      }

      const dir = path.dirname(ACTIVE_FILE);
      fs.mkdirSync(dir, { recursive: true });
      const tmpFile = `${ACTIVE_FILE}.${process.pid}.tmp`;
      fs.writeFileSync(
        tmpFile,
        JSON.stringify(
          {
            workspacePath: path.resolve(primary),
            workspacePaths: wsList.map((p) => path.resolve(p)),
            conversationId: convId,
            hookEventName: payload.hookEventName || null,
            updatedAt: Date.now(),
            seenInputs: prevSeen,
          },
          null,
          2,
        ),
        'utf8',
      );
      fs.renameSync(tmpFile, ACTIVE_FILE);
    }
  } catch {
    // Never fail or block the conversation
  }
  process.stdout.write('{}\n');
});
