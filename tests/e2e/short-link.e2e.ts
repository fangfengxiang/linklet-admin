// ShortLink 页 E2E —— target_url 不可改；code 不复用；停用不可逆；expires_at null=不过期
// 覆盖：列表加载 → 创建短链(含分组 Select) → 生成短链(完整URL) → 详情抽屉(只读) → 停用(不可逆)
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { pickAntdSelect } from './helpers';

const RUN = process.env.CI ? 'ci' : String(Date.now());

describe('short-link', { tags: ['short-link'], serial: true }, () => {
  test('loads the list with seeded short links', async ({ app, screen }) => {
    await app.open('/short-link');
    await expect(screen.getByText('aB9xK2')).toBeVisible();
  });

  test('keeps expiry and actions inside their columns at desktop and narrow widths', async ({ app, screen, browser }) => {
    await app.open('/short-link');
    await expect(screen.getByText('mK3pQ7')).toBeVisible();
    for (const width of [1600, 1024, 768]) {
      await browser.setViewport({ width, height: 900 });
      const layout = await browser.evaluate(() => {
        const row = Array.from(document.querySelectorAll('tbody tr')).find(element =>
          Array.from(element.querySelectorAll('td')).some(cell => cell.textContent === 'mK3pQ7'));
        const time = row?.querySelector('time');
        const expiry = time?.closest('td');
        const actions = row?.querySelector('td:last-child');
        if (!time || !expiry || !actions) throw new Error('Expected expiring link and action cells');
        const timeBox = time.getBoundingClientRect();
        const cellBox = expiry.getBoundingClientRect();
        const actionBox = actions.getBoundingClientRect();
        return {
          readableTime: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(time.textContent || ''),
          expiryFits: timeBox.left >= cellBox.left && timeBox.right <= cellBox.right,
          actionsFit: Array.from(actions.querySelectorAll('a')).every(link => {
            const box = link.getBoundingClientRect();
            return box.left >= actionBox.left && box.right <= actionBox.right;
          }),
          pageFits: document.documentElement.scrollWidth <= window.innerWidth + 1,
        };
      });
      expect(layout).toEqual({ readableTime: true, expiryFits: true, actionsFit: true, pageFits: true });
      await app.screenshot(`short-link-layout-${width}`);
    }
  });

  test('creates a short link', async ({ app, screen, browser }) => {
    await app.open('/short-link');
    await expect(screen.getByText('aB9xK2')).toBeVisible();
    await screen.getByRole('button', '创建短链', { exact: false }).tap();
    await screen.getByPlaceholder('https://example.com/page').fill(`https://e2e.example.com/create-${RUN}`);
    await pickAntdSelect(browser, '.ant-modal-body', '1001 主站默认分组');
    await screen.getByRole('button', /确\s?定/).tap();
    await expect(screen.getByText(/创建成功/)).toBeVisible();
  });

  test('generates a short link with full url', async ({ app, screen, browser }) => {
    await app.open('/short-link');
    await expect(screen.getByText('aB9xK2')).toBeVisible();
    await screen.getByRole('button', '生成短链', { exact: false }).tap();
    await screen.getByPlaceholder('https://example.com/page').fill(`https://e2e.example.com/gen-${RUN}`);
    await pickAntdSelect(browser, '.ant-modal-body', '1001 主站默认分组');
    await screen.getByRole('button', /确\s?定/).tap();
    await expect(screen.getByText(/生成成功/)).toBeVisible();
  });

  test('opens detail drawer with read-only target url', async ({ app, screen }) => {
    await app.open('/short-link');
    await expect(screen.getByText('aB9xK2')).toBeVisible();
    const row = screen.getByRole('row').filter({ hasText: 'aB9xK2' });
    await row.getByText('详情').tap();
    await expect(screen.getByRole('dialog', '短链详情')).toBeVisible();
    await expect(screen.getByText('目标 URL 不可修改', { exact: false })).toBeVisible();
  });

  test('disables a short link (irreversible, code never reused)', async ({ app, screen }) => {
    await app.open('/short-link');
    await expect(screen.getByText('aB9xK2')).toBeVisible();
    const row = screen.getByRole('row').filter({ hasText: 'aB9xK2' });
    await row.getByText('停用').tap();
    await screen.getByRole('button', /确\s?定/).tap();
    await expect(screen.getByText('已停用')).toBeVisible();
  });
});
