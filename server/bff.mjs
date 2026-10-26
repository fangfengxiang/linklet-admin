import { createHmac } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function json(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ code: status >= 400 ? status : 0, message, data: null }));
}

export function backendOrigin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('LINKLET_BACKEND must be an HTTP(S) origin, without credentials, path, query or fragment');
  }
  return url;
}

/** Same-origin, loopback-only operator BFF. Only the business API is signed. */
export function createConsoleServer({
  backend = process.env.LINKLET_BACKEND || 'http://127.0.0.1:8080',
  accessKey = process.env.LINKLET_ACCESS_KEY,
  secretKey = process.env.LINKLET_SECRET_KEY,
  consoleOrigin = process.env.LINKLET_CONSOLE_ORIGIN,
  staticDir,
} = {}) {
  const upstream = backendOrigin(backend);
  return http.createServer(async (req, res) => {
    try {
      const host = new URL(`http://${req.headers.host}`).hostname;
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) return json(res, 403, 'console is restricted to localhost');
      if (req.headers.origin) {
        const allowed = [consoleOrigin, `http://${req.headers.host}`].filter(Boolean);
        if (!allowed.includes(req.headers.origin)) return json(res, 403, 'cross-origin console request denied');
      }
      if (req.url === '/__console/health') return json(res, 200, 'ok');
      const api = /^\/api\/v1\/(admin\/[a-z_]+|shorten)\/[a-z_]+(?:\?|$)/.exec(req.url || '');
      if (api) {
        if (api[1] === 'shorten' && (!accessKey || !secretKey)) return json(res, 503, 'Configure LINKLET_ACCESS_KEY and LINKLET_SECRET_KEY on the BFF server');
        const parts = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 1024 * 1024) return json(res, 413, 'request body too large');
          parts.push(chunk);
        }
        const body = Buffer.concat(parts);
        const headers = { Accept: 'application/json', 'Content-Type': req.headers['content-type'] || 'application/json', 'Content-Length': body.length };
        if (api[1] === 'shorten') {
          const timestamp = String(Math.floor(Date.now() / 1000));
          const signature = createHmac('sha1', secretKey).update(`${req.method}\n${req.url}\n${timestamp}\n`).update(body).digest('base64');
          Object.assign(headers, { 'X-Access-Key': accessKey, 'X-Timestamp': timestamp, 'X-Signature': signature });
        }
        // The destination is server configuration, never a browser-supplied URL.
        const transport = upstream.protocol === 'https:' ? https : http;
        const request = transport.request({ protocol: upstream.protocol, hostname: upstream.hostname.replace(/^\[|\]$/g, ''), port: upstream.port, path: req.url, method: req.method, headers }, (response) => {
          res.writeHead(response.statusCode || 502, { 'Content-Type': response.headers['content-type'] || 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          // Propagate truncated upstream bodies; a dangling browser request
          // would otherwise survive after the upstream socket has closed.
          pipeline(response, res, () => {});
        });
        request.setTimeout(15_000, () => request.destroy(new Error('upstream timeout')));
        request.on('error', () => {
          if (!res.headersSent) json(res, 502, 'Linklet backend unavailable');
          else res.destroy();
        });
        res.on('close', () => request.destroy());
        request.end(body);
        return;
      }
      if (req.url?.startsWith('/api/')) return json(res, 404, 'unknown console API');
      if (!staticDir || !['GET', 'HEAD'].includes(req.method)) return json(res, 404, 'not found');
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const root = resolve(staticDir);
      let path = resolve(root, '.' + pathname);
      if (path !== root && !path.startsWith(root + sep)) return json(res, 403, 'invalid path');
      let info = await stat(path).catch(() => null);
      if (!info?.isFile()) {
        if (extname(path)) return json(res, 404, 'not found');
        path = resolve(root, 'index.html');
        info = await stat(path).catch(() => null);
      }
      if (!info?.isFile()) return json(res, 503, 'Build the console first: MOCK=0 npm run build');
      res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') res.end();
      else createReadStream(path).pipe(res);
    } catch {
      if (!res.headersSent) json(res, 400, 'invalid console request');
      else res.destroy();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8000);
  const server = createConsoleServer({ staticDir: process.argv.includes('--api-only') ? undefined : resolve(ROOT, 'dist') });
  server.listen(port, '127.0.0.1', () => console.log(`Linklet console listening on http://127.0.0.1:${port}`));
}
