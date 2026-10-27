// Group 页 E2E —— group_id 不可改；可改绑域名（仅已投产）；停用不影响解析
// 覆盖：列表加载（种子分组）→ 新建分组（含域名 Select）→ 配置（改名称/状态）
import { randomInt } from 'node:crypto';
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { pickAntdSelect } from './helpers';

const GROUP_ID = randomInt(1_000_000, 4_000_000_000);

describe('group', { tags: ['group'], serial: true }, () => {
  test('loads the list with seeded groups', async ({ app, screen }) => {
    await app.open('/group');
    await expect(screen.getByText('主站默认分组')).toBeVisible();
    await expect(screen.getByText('营销活动')).toBeVisible();
    await expect(screen.getByRole('columnheader', '绑定域名')).toBeVisible();
    await expect(screen.getByRole('row').filter({ hasText: '主站默认分组' }).getByText('s.example.com')).toBeVisible();
    await expect(screen.getByRole('row').filter({ hasText: '营销活动' }).getByText('go.example.com')).toBeVisible();
  });

  test('creates a new group with a deployed domain', async ({ app, screen, browser }) => {
    const gid = GROUP_ID; // Keep CI input numeric as well.
    await app.open('/group');
    await expect(screen.getByText('主站默认分组')).toBeVisible(); // 等表格稳定再操作
    await screen.getByRole('button', '新建分组', { exact: false }).tap();
    // getByLabel 自动等待表单字段（仅存在于已打开的 Modal 内），无需再断言标题
    await screen.getByLabel('分组编号').fill(String(gid));
    await screen.getByLabel('分组名称').fill('e2e-create-group');
    // 域名 Select：screen.getByRole('option') 会触发 Select onBlur 关闭下拉
    // 改用 browser.locator CSS 连续点击（开下拉→选可见 option），避开失焦
    await pickAntdSelect(browser, '.ant-modal-body', 's.example.com');
    await screen.getByRole('button', '确 定').tap();
    await expect(screen.getByText('创建成功')).toBeVisible();
    await expect(screen.getByText(String(gid))).toBeVisible();
  });

  test('configures an existing group (rename only)', async ({ app, screen }) => {
    await app.open('/group');
    await expect(screen.getByText('主站默认分组')).toBeVisible(); // 等表格稳定
    const row = screen.getByRole('row').filter({ hasText: '主站默认分组' });
    await row.getByText('配置').click();
    await expect(screen.getByRole('dialog', '分组配置')).toBeVisible(); // 精确匹配配置弹窗
    // 配置弹窗：group_id 字段 disabled（不可改）；只改 name，domain/status 走 initialValues
    await screen.getByLabel('分组名称').fill('主站默认分组-改');
    await screen.getByRole('button', '确 定').tap();
    await expect(screen.getByText('配置已更新')).toBeVisible();
  });
});
