import { defineConfig } from '@umijs/max';
import routes from './config/routes';

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
    // Umi serializes define values itself; pre-stringifying silently enables mock.
    'process.env.MOCK': USE_MOCK ? '1' : '0',
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
  routes,
  npmClient: 'npm',
  favicons: [],
  fastRefresh: true,
});
