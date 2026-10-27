// Tenant 页 E2E —— group_ids 授权（多租户可共管同分组）；停用可逆（区别于凭证/短链）
// 覆盖：列表加载 → 新建租户 → 分组授权（多选）→ 停用/启用可逆切换
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { openAntdMultiSelect, pickAntdMultiOption, closeAntdSelect } from './helpers';

const RUN = process.env.CI ? 'ci' : String(Date.now());

describe('tenant', { tags: ['tenant'], serial: true }, () => {
  test('loads the list with seeded tenants', async ({ app, screen }) => {
    await app.open('/tenant');
    await expect(screen.getByText('运营主体A')).toBeVisible();
    await expect(screen.getByText('运营主体B')).toBeVisible();
  });

  test('creates a new tenant', async ({ app, screen }) => {
    await app.open('/tenant');
    await expect(screen.getByText('运营主体A')).toBeVisible();
    await screen.getByRole('button', '新建租户', { exact: false }).tap();
    await screen.getByLabel('租户名称').fill(`e2e-tenant-${RUN.slice(-5)}`);
    await screen.getByRole('button', /确\s?定/).tap();
    await expect(screen.getByText('创建成功')).toBeVisible();
  });

  test('grants an additional group to a tenant', async ({ app, screen, browser }) => {
    await app.open('/tenant');
    await expect(screen.getByText('运营主体B')).toBeVisible();
    const row = screen.getByRole('row').filter({ hasText: '运营主体B' });
    await row.getByText('授权').tap();
    await expect(screen.getByRole('dialog', '分组授权')).toBeVisible();
    // 多选授权：B 已有 1001，追加 1002 营销活动
    await openAntdMultiSelect(browser, '.ant-modal-body');
    await pickAntdMultiOption(browser, '.ant-modal-body', '1002 营销活动');
    await closeAntdSelect(browser);
    await screen.getByRole('button', /确\s?定/).tap();
    await expect(screen.getByText('授权已更新')).toBeVisible();
    // 授权后 B 的授权分组列出现具体名称
    await expect(screen.getByRole('row').filter({ hasText: '运营主体B' }).getByText('营销活动')).toBeVisible();
  });

  test('disables then re-enables a tenant (reversible)', async ({ app, screen }) => {
    await app.open('/tenant');
    await expect(screen.getByText('运营主体A')).toBeVisible();
    const row = () => screen.getByRole('row').filter({ hasText: '运营主体A' });
    await row().getByText('停用').tap();
    await screen.getByRole('button', /确\s?定/).tap();
    // 停用后该行操作列变为"启用"（租户状态可逆，区别于凭证/短链）
    await expect(row().getByText('启用')).toBeVisible();
    await row().getByText('启用').tap();
    await screen.getByRole('button', /确\s?定/).tap();
    // 启用后该行操作列恢复"停用"
    await expect(row().getByText('停用')).toBeVisible();
  });
});
