import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

// Real acceptance uses an explicitly started BFF and backend. It must never
// silently start the default mock preview when the real server is unavailable.
const APP_URL = process.env.APP_URL ?? 'http://localhost:8000';
const REAL_BACKEND = process.env.E2E_REAL === '1';

export default {
  tests: REAL_BACKEND
    ? ['tests/e2e/real-backend.e2e.ts']
    : ['tests/e2e/**/*.e2e.ts', '!tests/e2e/real-backend.e2e.ts'],
  targets: [{
    engine: web(),
    app: {
      url: APP_URL,
      // 本地复用已起 dev server(reuseExisting);CI 无 dev server 时由 command 拉起
      // CI 用 max build + max preview(预编译,避免 dev server 按需编译未完成时测试就跑)
      ...(!REAL_BACKEND && { command: {
        executable: 'npm',
        args: ['run', 'e2e:serve'],
        startupTimeout: 240_000, // max build + preview 首次较慢,给足 4 分钟
        reuseExisting: true,
        log: '.e2e/logs/app.log',
      } }),
    },
  }],
} satisfies E2EConfig;
