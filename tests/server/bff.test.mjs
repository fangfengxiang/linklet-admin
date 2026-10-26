import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { createConsoleServer, backendOrigin } from '../../server/bff.mjs';

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}
async function withPair(fn, options = {}) {
  const seen = [];
  const upstream = http.createServer(async (req, res) => {
    const parts = [];
    for await (const chunk of req) parts.push(chunk);
    seen.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(parts).toString() });
    res.writeHead(req.url.includes('conflict') ? 409 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: req.url.includes('conflict') ? 409 : 0, message: 'backend message', data: [] }));
  });
  const backend = await listen(upstream);
  const server = createConsoleServer({ backend, accessKey: 'test-ak', secretKey: 'server-secret-only', ...options });
  const origin = await listen(server);
  try { await fn({ origin, seen }); }
  finally {
    server.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise(r => server.close(r)), new Promise(r => upstream.close(r))]);
  }
}

test('business signatures preserve exact query ordering/escaping and raw JSON bytes', async () => {
  await withPair(async ({ origin, seen }) => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const body = '{ "target_url": "https://example.test/中文", "group_id": 23 }';
      const uri = '/api/v1/shorten/create?x=a%2Fb&x=2';
      const response = await fetch(origin + uri, { method, headers: { 'Content-Type': 'application/json', 'X-Access-Key': 'untrusted', 'X-Signature': 'spoof' }, body });
      assert.equal(response.status, 200);
      const request = seen.at(-1);
      assert.equal(request.body, body);
      assert.equal(request.url, uri);
      const expected = createHmac('sha1', 'server-secret-only').update([method, uri, request.headers['x-timestamp'], body].join('\n')).digest('base64');
      assert.equal(request.headers['x-signature'], expected);
      assert.equal(request.headers['x-access-key'], 'test-ak');
      assert.equal((await response.text()).includes('server-secret-only'), false);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    await fetch(origin + '/api/v1/shorten/get?code=x%2By');
    const request = seen.at(-1);
    assert.equal(request.headers['x-signature'], createHmac('sha1', 'server-secret-only').update(`GET\n${request.url}\n${request.headers['x-timestamp']}\n`).digest('base64'));
  });
});

test('Admin requests do not get tenant credentials; errors remain backend envelopes', async () => {
  await withPair(async ({ origin, seen }) => {
    const response = await fetch(origin + '/api/v1/admin/group/conflict', { method: 'PUT', body: '{"group_id":1}', headers: { 'X-Access-Key': 'spoof', 'X-Signature': 'spoof' } });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).message, 'backend message');
    assert.equal(seen[0].headers['x-access-key'], undefined);
    assert.equal(seen[0].headers['x-signature'], undefined);
  });
});

test('missing business identity fails closed while internal Admin remains usable', async () => {
  await withPair(async ({ origin, seen }) => {
    assert.equal((await fetch(origin + '/api/v1/shorten/list')).status, 503);
    assert.equal((await fetch(origin + '/api/v1/admin/tenant/list')).status, 200);
    assert.equal(seen.length, 1);
  }, { accessKey: '', secretKey: '' });
});

test('rejects cross-origin writes, rebinding hosts and arbitrary proxy targets', async () => {
  await withPair(async ({ origin, seen }) => {
    assert.equal((await fetch(origin + '/api/v1/admin/tenant/create', { method: 'POST', headers: { Origin: 'https://foreign.test' }, body: '{}' })).status, 403);
    const reboundStatus = await new Promise((resolve, reject) => {
      http.get(origin + '/api/v1/admin/tenant/list', { headers: { Host: 'foreign.test' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
    });
    assert.equal(reboundStatus, 403);
    assert.equal((await fetch(origin + '/api/proxy?url=https://foreign.test')).status, 404);
    assert.equal(seen.length, 0);
  });
  for (const value of ['file:///etc/passwd', 'https://user:secret@example.test', 'http://example.test/api', 'http://example.test/?query=1']) assert.throws(() => backendOrigin(value));
});

test('unavailable backend returns a safe JSON 502', async () => {
  const server = createConsoleServer({ backend: 'http://127.0.0.1:1' });
  const origin = await listen(server);
  try {
    const response = await fetch(origin + '/api/v1/admin/tenant/list');
    assert.equal(response.status, 502);
    assert.equal((await response.json()).message, 'Linklet backend unavailable');
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
});

test('a truncated upstream response closes the browser request promptly', async () => {
  const upstream = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write('{"code":0,"data":');
    setTimeout(() => res.destroy(), 20);
  });
  const backend = await listen(upstream);
  const server = createConsoleServer({ backend });
  const origin = await listen(server);
  try {
    const response = await fetch(origin + '/api/v1/admin/tenant/list', { signal: AbortSignal.timeout(1000) });
    await assert.rejects(response.text(), error => error.name !== 'TimeoutError');
  } finally {
    server.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise(r => server.close(r)), new Promise(r => upstream.close(r))]);
  }
});
