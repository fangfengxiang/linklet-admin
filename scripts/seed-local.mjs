import { mkdir, open, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { backendOrigin } from '../server/bff.mjs';

// Explicit local-only bootstrap: creates a tenant and one credential in an isolated
// Docker database. It never removes records or logs the credential response.
const endpoint = backendOrigin(process.env.LINKLET_BACKEND || 'http://127.0.0.1:18080');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)) throw new Error('seed-local only accepts a loopback backend');
const output = resolve(process.env.LINKLET_RUNTIME_ENV || '.env.runtime.local');
async function post(action, body) {
  const response = await fetch(new URL(`/api/v1/admin/${action}`, endpoint), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || data.code !== 0) throw new Error(`${action} failed: ${data.message}`);
  return data.data;
}
await mkdir(dirname(output), { recursive: true });
// Reserve before issuing credentials; concurrent/repeated invocations fail
// before touching the backend, rather than orphaning a live credential.
const file = await open(output, 'wx', 0o600);
let issued = false;
try {
  const tenant = await post('tenant/create', { name: `local-console-${Date.now()}` });
  const credential = await post('credential/create', { tenant_id: tenant.id });
  issued = true;
  await file.writeFile(`LINKLET_BACKEND=${endpoint.origin}\nLINKLET_ACCESS_KEY=${credential.access_key}\nLINKLET_SECRET_KEY=${credential.secret_key}\nE2E_TENANT_ID=${tenant.id}\n`);
  console.log(`Local tenant ${tenant.id} ready. Server-only environment saved to ${output}`);
} finally {
  await file.close();
  if (!issued) await unlink(output);
}
