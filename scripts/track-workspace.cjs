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
    const wsList = Array.isArray(payload.workspacePaths) ? payload.workspacePaths : [];
    const primary = wsList.find((p) => typeof p === 'string' && p.trim().length > 0);
    if (primary) {
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
