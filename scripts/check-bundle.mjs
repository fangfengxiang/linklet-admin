import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const secret = process.env.LINKLET_SECRET_KEY;
if (!secret) throw new Error('Set a server-only LINKLET_SECRET_KEY to verify the client build');
for (const item of await readdir('dist', { recursive: true, withFileTypes: true })) {
  if (!item.isFile()) continue;
  const path = resolve(item.parentPath, item.name);
  if ((await readFile(path)).includes(Buffer.from(secret))) throw new Error('Server credential found in a client asset');
}
console.log('Server credential is absent from all client assets');
