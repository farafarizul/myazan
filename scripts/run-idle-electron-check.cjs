'use strict';
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist-build/qa/idle-electron-check.cjs');
buildSync({
  entryPoints: [path.join(__dirname, 'idle-electron-check.cjs')], outfile: output,
  bundle: true, platform: 'node', format: 'cjs', external: ['electron', 'better-sqlite3'],
  define: { __dirname: JSON.stringify(path.join(root, 'dist/main')) },
});
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const result = spawnSync(require('electron'), [output], {
  cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 90000,
});
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
if (result.error) console.error(result.error.message);
process.exit(result.status === 0 && result.stdout?.includes('IDLE_ELECTRON_CHECK_PASSED') ? 0 : 1);
