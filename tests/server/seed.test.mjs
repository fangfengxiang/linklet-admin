import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('local bootstrap reserves its private output before issuing credentials', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'linklet-bootstrap-'));
  let calls = 0;
  const upstream = http.createServer((req, res) => {
    req.resume(); calls += 1;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ code: 0, data: req.url.includes('credential') ? { access_key: 'generated-test-ak', secret_key: 'generated-test-secret' } : { id: 12 } }));
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const output = join(dir, 'nested', 'runtime.env');
  const options = { env: { ...process.env, LINKLET_BACKEND: `http://127.0.0.1:${upstream.address().port}`, LINKLET_RUNTIME_ENV: output } };
  try {
    const result = await promisify(execFile)(process.execPath, [resolve('scripts/seed-local.mjs')], options);
    assert.equal(calls, 2);
    assert.equal(result.stdout.includes('generated-test-secret'), false);
    assert.match(await readFile(output, 'utf8'), /E2E_TENANT_ID=12/);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    await assert.rejects(promisify(execFile)(process.execPath, [resolve('scripts/seed-local.mjs')], options));
    assert.equal(calls, 2, 'repeat invocation must not issue another credential');
  } finally {
    upstream.closeAllConnections(); await new Promise(r => upstream.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
