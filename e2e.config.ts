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
      command: {
        executable: 'npm',
        args: ['run', 'dev'],
        startupTimeout: 180_000, // Umi Max 首次编译较慢,给足 3 分钟
        reuseExisting: true,
        log: '.e2e/logs/app.log',
      },
    },
  }],
} satisfies E2EConfig;
