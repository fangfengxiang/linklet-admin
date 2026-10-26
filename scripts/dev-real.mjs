import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConsoleServer } from '../server/bff.mjs';

const port = Number(process.env.PORT || 8000);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Umi's dev listener binds all interfaces. Real API mode deliberately builds
// first and serves the SPA and signed API on the same loopback-only server.
const child = spawn(process.execPath, ['node_modules/@umijs/max/bin/max.js', 'build'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, MOCK: '0' },
});
let server;
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  stopping = true;
  child.kill(signal);
  if (server) server.close(() => process.exit(0));
});
child.on('error', () => { console.error('Console build could not start'); process.exit(1); });
child.on('exit', (code, signal) => {
  if (stopping) process.exit(0);
  if (signal || code !== 0) process.exit(code || 1);
  server = createConsoleServer({ staticDir: resolve(root, 'dist') });
  server.listen(port, '127.0.0.1', () => console.log(`Linklet console (real API) http://127.0.0.1:${port}`));
});
