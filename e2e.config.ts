import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

// Umi Max dev server 默认 8000 端口;默认 Mock 模式,无需后端
const APP_URL = process.env.APP_URL ?? 'http://localhost:8000';

export default {
  targets: [{
    engine: web(),
    app: {
      url: APP_URL,
      // 本地复用已起 dev server(reuseExisting);CI 无 dev server 时由 command 拉起
      // CI 用 max build + max preview(预编译,避免 dev server 按需编译未完成时测试就跑)
      command: {
        executable: 'npm',
        args: ['run', 'e2e:serve'],
        startupTimeout: 240_000, // max build + preview 首次较慢,给足 4 分钟
        reuseExisting: true,
        log: '.e2e/logs/app.log',
      },
    },
  }],
} satisfies E2EConfig;
