// Credential 页 E2E —— SK 仅创建时返回一次；停用不可逆；AK 不复用
// 覆盖：按租户过滤 → 种子凭证可见 → 新建凭证(SK 一次性弹窗) → 停用(不可逆)
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const RUN = process.env.CI ? 'ci' : String(Date.now());

describe('credential', { tags: ['credential'], serial: true }, () => {
  test('filters credentials by tenant id and shows seed', async ({ app, screen }) => {
    await app.open('/credential');
    // 无租户过滤 → 空列表；填租户ID=1 后刷新
    await screen.getByLabel('租户ID').fill('1');
    await screen.getByRole('button', /刷\s?新/).tap();
    await expect(screen.getByText('AKL0001MOCK')).toBeVisible();
  });

  test('creates a credential and reveals SK once', async ({ app, screen }) => {
    await app.open('/credential');
    await screen.getByLabel('租户ID').fill('1');
    await screen.getByRole('button', /刷\s?新/).tap();
    await screen.getByRole('button', '新建凭证', { exact: false }).tap();
    await screen.getByLabel('说明').fill(`e2e-cred-${RUN.slice(-5)}`);
    await screen.getByRole('button', /确\s?定/).tap();
    // SK 一次性弹窗
    await expect(screen.getByText('凭证创建成功')).toBeVisible();
    // antd Typography Text 把 "SecretKey" 渲染为 "SecretKey:"（含冒号），
    // getByText 精确匹配会落空，用正则做子串匹配更稳
    await expect(screen.getByText(/SecretKey/)).toBeVisible();
    await screen.getByRole('button', '我已保存', { exact: false }).tap();
  });

  test('disables a credential (irreversible)', async ({ app, screen }) => {
    await app.open('/credential');
    await screen.getByLabel('租户ID').fill('1');
    await screen.getByRole('button', /刷\s?新/).tap();
    await expect(screen.getByText('AKL0001MOCK')).toBeVisible();
    const row = () => screen.getByRole('row').filter({ hasText: 'AKL0001MOCK' });
    await row().getByText('停用').tap();
    await screen.getByRole('button', /确\s?定/).tap();
    await expect(screen.getByText('凭证已停用')).toBeVisible();
    // 停用后该行显示"已停用"（无操作按钮）
    await expect(row().getByText('已停用')).toBeVisible();
  });
});
