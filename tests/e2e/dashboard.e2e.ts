// Dashboard 页 E2E —— 4 资源概览计数（请求 shortLink/group/domain/tenant list 聚合）
// 验证：4 个 Statistic 标题渲染 + 计数与种子数据对齐（shortLink=3 group=2 domain=3 tenant=2）
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('dashboard', () => {
  test('renders four resource statistics', async ({ app, screen }) => {
    await app.open('/dashboard');
    await expect(screen.getByText('短链总数')).toBeVisible();
    await expect(screen.getByText('分组数')).toBeVisible();
    await expect(screen.getByText('域名数')).toBeVisible();
    await expect(screen.getByText('租户数')).toBeVisible();
  });

  test('counts align with seeded data', async ({ app, browser }) => {
    await app.open('/dashboard');
    // 等待 4 个 list 请求聚合完成：异步轮询直到 Statistic 数值渲染
    // Statistic 渲染 <span class="ant-statistic-content-value-int">N</span>
    const dom = await browser.evaluate(async () => {
      const pick = (label: string): string | null => {
        const cards = Array.from(document.querySelectorAll('.ant-statistic'));
        const card = cards.find((c) => c.textContent?.includes(label));
        if (!card) return null;
        const n = card.querySelector('.ant-statistic-content-value-int');
        return n ? n.textContent : null;
      };
      return await new Promise((resolve) => {
        const tick = () => {
          const r = {
            shortLink: pick('短链总数'),
            group: pick('分组数'),
            domain: pick('域名数'),
            tenant: pick('租户数'),
          };
          if (r.shortLink && r.group && r.domain && r.tenant) return resolve(r);
          setTimeout(tick, 120);
        };
        tick();
      });
    });
    expect(dom.shortLink).toBe('3');
    expect(dom.group).toBe('2');
    expect(dom.domain).toBe('3');
    expect(dom.tenant).toBe('2');
  });
});
