#!/usr/bin/env node
/**
 * EAS Build pre-install (Linux). Builds workspace packages before the Android compile.
 * Uses Node (not bash) so Windows CRLF in .sh files cannot break the hook on EAS.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

function run(command) {
  console.log(`\n[eas-pre-install] ${command}`);
  execSync(command, { stdio: 'inherit', env: process.env, shell: true });
}

console.log(`[eas-pre-install] cwd=${root}`);

try {
  run('corepack enable');
  run('corepack prepare pnpm@10.33.3 --activate');
} catch {
  console.log('[eas-pre-install] corepack not available; expecting pnpm on PATH');
}

run('pnpm --version');
run('pnpm install --ignore-scripts');
run('pnpm --filter @guardian/shared build');
run('pnpm --filter @guardian/ui build');
run('pnpm --filter @guardian/risk-engine build');
run('pnpm --filter @guardian/simulator build');

console.log('[eas-pre-install] done');
