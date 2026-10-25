// Agent 驱动测试示例 —— 需 model gateway，CI 不跑（见 .github/workflows/e2e.yml 文件列表）
//
// 本地运行：
//   1. npx e2e login   (选 ChatGPT / GitHub Copilot / SuperGrok 等订阅，无需单独 API key)
//   2. e2e.config.ts 配置 agents.default.model = gateway('openai/gpt-6-luna-fast')
//   3. npx e2e run tests/agent-demo.e2e.ts
//
// agent.act 首次录制调 LLM 生成步骤，之后回放不调（缓存于 .e2e/cache）；UI 变化时自动重录。
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('domain entry (agent)', { tags: ['agent'] }, () => {
  test('agent creates a domain entry by natural language', async ({ app, agent, screen }) => {
    await app.open('/domain-entry');
    await agent.act(
      'click the "新建域名" button and create a new domain entry named e2e-agent.example.com with tag "AI"',
    );
    await expect(screen.getByText('e2e-agent.example.com')).toBeVisible();
  });
});
