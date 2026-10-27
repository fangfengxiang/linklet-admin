import { defineConfig } from '@umijs/max';
import routes from './config/routes';
import crypto from 'node:crypto';

// 后端 Admin API 地址（BFF 代理目标）。本地默认直连 linklet 后端。
const LINKLET_BACKEND = process.env.LINKLET_BACKEND || 'http://127.0.0.1:8080';

// 是否启用 Mock（开发期默认 Mock，连接真实后端时设 MOCK=0）
const USE_MOCK = process.env.MOCK !== '0';

// 部署基路径：
// - DEPLOY_BASE=gh-pages → /linklet-admin/（GitHub Pages 项目站点快捷值）
// - DEPLOY_BASE=/admin 或 admin → /admin/（通用子路径，自动补首尾斜杠）
// - 不设 → /（根部署，默认）
// Deploy base path: gh-pages shortcut → /linklet-admin/; arbitrary subpath auto-normalized; root by default
const DEPLOY_BASE = process.env.DEPLOY_BASE;
const BASE_PATH = (() => {
  if (!DEPLOY_BASE) return '/';
  if (DEPLOY_BASE === 'gh-pages') return '/linklet-admin/';
  const p = DEPLOY_BASE.startsWith('/') ? DEPLOY_BASE : `/${DEPLOY_BASE}`;
  return p.endsWith('/') ? p : `${p}/`;
})();

export default defineConfig({
  hash: true,
  publicPath: BASE_PATH,
  base: BASE_PATH,
  define: {
    // 将 mock 开关注入客户端 bundle（in-app mock 在 dev 与演示站生效）
    'process.env.MOCK': JSON.stringify(USE_MOCK ? '1' : '0'),
  },
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: 'Linklet 管理控制台',
    locale: false,
  },
  mock: false,
  proxy: {
    '/api': {
      target: LINKLET_BACKEND,
      changeOrigin: true,
      // dev BFF 代签：仅业务 API（/api/v1/shorten/*）需 AK/SK 签名；
      // admin API（/api/v1/admin/*）后端无鉴权中间件，生产 SPA 走 nginx IP 白名单。
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq, req) => {
          signRequest(proxyReq, req);
        });
      },
    },
  },
  routes,
  npmClient: 'npm',
  favicons: [],
  fastRefresh: true,
});

/**
 * BFF 签名中间件 —— 服务端用 AK/SK 对后端请求签名。
 * 签名串：{METHOD}\n{REQUEST_URI}\n{TIMESTAMP}\n{BODY}
 * 签名材料仅从服务端环境变量读取，绝不进客户端 bundle。
 */
function signRequest(proxyReq: any, req: any): void {
  const accessKey = process.env.LINKLET_ACCESS_KEY;
  const secretKey = process.env.LINKLET_SECRET_KEY;
  // authMiddleware 注入点：后续登录 change 在此根据操作员身份选择 AK/SK
  // 本次为 placeholder：未配置 AK/SK 时透传（Mock 场景由 in-app mock 在 request.ts 拦截，不走到这里）
  if (!accessKey || !secretKey) {
    return;
  }
  const method = (req.method || 'GET').toUpperCase();
  const uri = req.url || '';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  // body 在 GET 请求下为空；POST/PUT 由 proxyReq 已写入
  let body = '';
  if (method !== 'GET' && method !== 'DELETE' && req.body) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }
  const message = [method, uri, timestamp, body].join('\n');
  // HMAC-SHA1 与后端 docs/api.md 一致（crypto 在 Umi node 层可用）
  const signature = crypto
    .createHmac('sha1', secretKey)
    .update(message)
    .digest('base64');
  proxyReq.setHeader('X-Access-Key', accessKey);
  proxyReq.setHeader('X-Signature', signature);
  proxyReq.setHeader('X-Timestamp', timestamp);
}
