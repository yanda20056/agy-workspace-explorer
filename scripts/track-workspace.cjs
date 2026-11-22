#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ACTIVE_FILE = path.join(os.homedir(), '.gemini', '.workspace-explorer-active.json');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  try {
    const payload = raw ? JSON.parse(raw) : {};

    // Ignore headless CLI invocations so background CLI jobs don't hijack the GUI active workspace
    const tp = String(payload.transcriptPath || payload.artifactDirectoryPath || '');
    if (tp.includes('antigravity-cli')) {
      process.stdout.write('{}\n');
      return;
    }

    // Only record on SessionStart or the first model invocation of a user turn (invocationNum <= 1),
    // so multi-step tool-loop continuations in a background tab don't overwrite the user's focused tab.
    const invNum = Number(payload.invocationNum);
    const isInitialTurnStep =
      payload.hookEventName === 'SessionStart' || !Number.isFinite(invNum) || invNum <= 1;

    const wsList = Array.isArray(payload.workspacePaths) ? payload.workspacePaths : [];
    const primary = wsList.find((p) => typeof p === 'string' && p.trim().length > 0);
    if (primary && isInitialTurnStep) {
      const dir = path.dirname(ACTIVE_FILE);
      fs.mkdirSync(dir, { recursive: true });
      const tmpFile = `${ACTIVE_FILE}.${process.pid}.tmp`;
      fs.writeFileSync(
        tmpFile,
        JSON.stringify(
          {
            workspacePath: path.resolve(primary),
            workspacePaths: wsList.map((p) => path.resolve(p)),
            conversationId: payload.conversationId || null,
            updatedAt: Date.now(),
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
