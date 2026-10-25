// GroupConfig 页 E2E —— group_id 不可改；config_key 同分组唯一；删除即丢
// 覆盖：按 group_id 查询 → 种子配置可见 → 设置新配置 → 删除配置
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const RUN = process.env.CI ? 'ci' : String(Date.now());

describe('group-config', { tags: ['group-config'], serial: true }, () => {
  test('searches configs by group id and shows seed', async ({ app, screen }) => {
    await app.open('/group-config');
    await screen.getByLabel('分组编号').fill('1001');
    await screen.getByRole('button', /查\s?询/).tap();
    await expect(screen.getByText('utm_default')).toBeVisible();
  });

  test('sets a new config item', async ({ app, screen }) => {
    await app.open('/group-config');
    // 等表格结构渲染稳定再点触发器，避免页面挂载期 trigger 未就绪
    await expect(screen.getByRole('columnheader', '分组编号')).toBeVisible();
    await screen.getByRole('button', '设置配置', { exact: false }).tap();
    // 弹窗内字段与搜索栏"分组编号"重名，按 dialog 作用域定位避免歧义
    const dialog = screen.getByRole('dialog', '设置配置项');
    // antd ProFormText 的 label 不产生标准 <label for> 关联，getByLabel 定位失败；
    // 改用 dialog 内 textbox 顺序定位（group_id → config_key → config_value）
    const inputs = dialog.getByRole('textbox');
    await inputs.nth(0).fill('1001');
    await inputs.nth(1).fill(`e2e_key_${RUN.slice(-5)}`);
    await inputs.nth(2).fill('e2e_value');
    await screen.getByRole('button', /确\s?定/).tap();
    await expect(screen.getByText('已保存')).toBeVisible();
  });

  test('deletes a config item', async ({ app, screen }) => {
    const key = `e2e_del_${RUN.slice(-5)}`;
    await app.open('/group-config');
    await expect(screen.getByRole('columnheader', '分组编号')).toBeVisible();

    // 自包含：先创建一个临时配置项，再删除它（不依赖 sets 测试的副作用，
    // 避免跨测试状态依赖导致查询不到）
    await screen.getByRole('button', '设置配置', { exact: false }).tap();
    const dialog = screen.getByRole('dialog', '设置配置项');
    const inputs = dialog.getByRole('textbox');
    await inputs.nth(0).fill('1001');
    await inputs.nth(1).fill(key);
    await inputs.nth(2).fill('to_be_deleted');
    await screen.getByRole('button', /确\s?定/).tap();
    await expect(screen.getByText('已保存')).toBeVisible();

    // 查询并删除该配置项
    await screen.getByLabel('分组编号').fill('1001');
    await screen.getByRole('button', /查\s?询/).tap();
    await expect(screen.getByText(key)).toBeVisible();
    const row = screen.getByRole('row').filter({ hasText: key });
    await row.getByText('删除').tap();
    await screen.getByRole('button', /确\s?定/).tap();
    await expect(screen.getByText('已删除')).toBeVisible();
  });
});
