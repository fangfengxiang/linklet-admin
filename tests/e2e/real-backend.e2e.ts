// Run with E2E_REAL=1 against an isolated real Linklet+BFF stack.
// No mock data, browser request interception, database writes, or browser SKs.
import { randomBytes, randomInt } from 'node:crypto';
import { beforeAll, beforeEach, describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { closeAntdSelect, openAntdMultiSelect, pickAntdMultiOption, pickAntdSelect } from './helpers';
import { fixtureRequest, tableRow, uiResponse } from './real-backend';

interface Domain { id: number; domain: string; status: number }
interface Group { group_id: number; domain_entry_id: number; status: number }
interface Tenant { id: number; name: string; group_ids: number[]; status: number }
interface Credential { access_key: string; secret_key?: string; secret_key_enc?: string; status: number }
interface Link { id: number; code: string; group_id: number; target_url: string; status: number; expires_at?: string | null }
interface Config { group_id: number; config_key: string; config_value: string }

const run = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
const domainName = `${run}.real-e2e.example.test`;
const spareDomainName = `spare-${run}.real-e2e.example.test`;
const groupId = randomInt(1_000_000_000, 4_000_000_000);
const groupName = `real-group-${run}`;
const tenantName = `real-tenant-${run}`;
const configKey = `real_${run}`;
const target = `https://target.example.test/${run}?source=browser&label=%E9%AA%8C%E6%94%B6`;
let domainId: number;
let createdTenantId: number;
let signingTenantId: number;
let createdCode: string;

describe('real backend: seven admin pages', {
  tags: ['real-backend'],
  serial: true,
  retries: 0,
  skip: process.env.E2E_REAL !== '1',
}, () => {
  beforeAll(async () => {
    signingTenantId = Number(process.env.E2E_TENANT_ID);
    if (!Number.isSafeInteger(signingTenantId) || signingTenantId < 1) {
      throw new Error('E2E_REAL=1 requires E2E_TENANT_ID from the isolated BFF bootstrap');
    }
    const tenants = await fixtureRequest<Tenant[]>('/api/v1/admin/tenant/list?limit=100');
    expect(tenants.some((tenant) => tenant.id === signingTenantId && tenant.status === 1)).toBe(true);
  });

  beforeEach(async ({ app }) => {
    // This engine requires a document before waitForResponse can attach.
    // The unfiltered credential page makes no API request, so it cannot race
    // with the actual page's list response registered by the test below.
    await app.open('/credential');
  });

  test('domain page creates, deploys, and offlines independently named resources', async ({ app, screen, browser }) => {
    const initial = await uiResponse<Domain[]>(browser, '/api/v1/admin/domain/list', () => app.open('/domain-entry'));
    expect(Array.isArray(initial.data)).toBe(true);
    for (const name of [domainName, spareDomainName]) {
      await screen.getByRole('button', '新建域名', { exact: false }).tap();
      await screen.getByPlaceholder('s.example.com').fill(name);
      await screen.getByPlaceholder('分类标签').fill(`real-${run}`);
      const created = await uiResponse<Domain>(browser, '/api/v1/admin/domain/create', () =>
        screen.getByRole('button', /确\s?定/).tap());
      expect(created.data.domain).toBe(name);
      expect(created.data.status).toBe(1);
      if (name === domainName) domainId = created.data.id;
      const row = await tableRow(browser, name);
      const deployed = await uiResponse<Domain>(browser, '/api/v1/admin/domain/deploy', () => row.getByText('投产').tap());
      expect(deployed.data.status).toBe(2);
      await expect(row.getByText('下线')).toBeVisible();
    }
    const spare = await tableRow(browser, spareDomainName);
    await spare.getByText('下线').tap();
    const disabled = await uiResponse<Domain>(browser, '/api/v1/admin/domain/disable', () =>
      screen.getByRole('button', /确\s?定/).tap());
    expect(disabled.data.status).toBe(3);
    const persisted = await uiResponse<Domain[]>(browser, '/api/v1/admin/domain/list', () => browser.locator('.anticon-reload').click());
    expect(persisted.data.find((domain) => domain.domain === spareDomainName)?.status).toBe(3);
    const offline = await tableRow(browser, spareDomainName);
    await expect(offline.getByText('下线')).toBeVisible();
    expect(await offline.getByText('投产').count()).toBe(0);
  });

  test('group page creates a group and persists reversible status configuration', async ({ app, screen, browser }) => {
    await uiResponse<Group[]>(browser, '/api/v1/admin/group/list', () => app.open('/group'));
    await screen.getByRole('button', '新建分组', { exact: false }).tap();
    await screen.getByLabel('分组编号').fill(String(groupId));
    await screen.getByLabel('分组名称').fill(groupName);
    await pickAntdSelect(browser, '.ant-modal-body', domainName);
    const created = await uiResponse<Group>(browser, '/api/v1/admin/group/create', () =>
      screen.getByRole('button', /确\s?定/).tap());
    expect(created.data.group_id).toBe(groupId);
    expect(created.data.domain_entry_id).toBe(domainId);
    for (const [label, status] of [['停用', 2], ['启用', 1]] as const) {
      const row = await tableRow(browser, groupName);
      await row.getByText('配置').tap();
      const dialog = screen.getByRole('dialog', '分组配置');
      await expect(dialog).toBeVisible();
      expect(await dialog.getByRole('textbox', /^分组编号/).isDisabled()).toBe(true);
      await browser.locator('.ant-modal-body .ant-select-selector').last().click();
      await browser.locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${label}"]`).click();
      const configured = await uiResponse<Group>(browser, '/api/v1/admin/group/configure', () =>
        screen.getByRole('button', /确\s?定/).tap());
      expect(configured.data.group_id).toBe(groupId);
      expect(configured.data.domain_entry_id).toBe(domainId);
      expect(configured.data.status).toBe(status);
      await expect(dialog).not.toBeVisible();
    }
    const persisted = await uiResponse<Group[]>(browser, '/api/v1/admin/group/list', () => browser.locator('.anticon-reload').click());
    expect(persisted.data.find((group) => group.group_id === groupId)?.status).toBe(1);
  });

  test('tenant page creates, grants the group, and toggles status through real APIs', async ({ app, screen, browser }) => {
    await uiResponse<Tenant[]>(browser, '/api/v1/admin/tenant/list', () => app.open('/tenant'));
    await screen.getByRole('button', '新建租户', { exact: false }).tap();
    await screen.getByLabel('租户名称').fill(tenantName);
    const created = await uiResponse<Tenant>(browser, '/api/v1/admin/tenant/create', () =>
      screen.getByRole('button', /确\s?定/).tap());
    createdTenantId = created.data.id;
    expect(created.data.name).toBe(tenantName);
    const row = await tableRow(browser, tenantName);
    await row.getByText('授权').tap();
    await expect(screen.getByRole('dialog', '分组授权')).toBeVisible();
    await openAntdMultiSelect(browser, '.ant-modal-body');
    await pickAntdMultiOption(browser, '.ant-modal-body', `${groupId} ${groupName}`);
    await closeAntdSelect(browser);
    const granted = await uiResponse<Tenant>(browser, '/api/v1/admin/tenant/grant', () =>
      screen.getByRole('button', /确\s?定/).tap());
    expect(granted.data.group_ids).toEqual([groupId]);
    await expect(row.getByText(String(groupId))).toBeVisible();
    for (const [label, status] of [['停用', 2], ['启用', 1]] as const) {
      await row.getByRole('cell').filter({ hasText: '授权' }).getByText(label).tap();
      const changed = await uiResponse<Tenant>(browser, '/api/v1/admin/tenant/status', () =>
        screen.getByRole('button', /确\s?定/).tap());
      expect(changed.data.status).toBe(status);
      await expect(row.getByRole('cell').filter({ hasText: '授权' }).getByText(status === 2 ? '启用' : '停用')).toBeVisible();
    }
    const persisted = await uiResponse<Tenant[]>(browser, '/api/v1/admin/tenant/list', () => browser.locator('.anticon-reload').click());
    expect(persisted.data.find((tenant) => tenant.id === createdTenantId)?.group_ids).toEqual([groupId]);
  });

  test('credential page shows a newly generated SK once and persists irreversible disable', async ({ app, screen, browser }) => {
    await app.open('/credential');
    await screen.getByLabel('租户ID').fill(String(createdTenantId));
    const initial = await uiResponse<Credential[]>(browser, '/api/v1/admin/credential/list', () =>
      screen.getByRole('button', /刷\s?新/).tap());
    expect(initial.data).toEqual([]);
    await screen.getByRole('button', '新建凭证', { exact: false }).tap();
    const created = await uiResponse<Credential>(browser, '/api/v1/admin/credential/create', () =>
      screen.getByRole('button', /确\s?定/).tap());
    expect(typeof created.data.access_key).toBe('string');
    expect(typeof created.data.secret_key).toBe('string');
    expect(created.data.secret_key!.length >= 16).toBe(true);
    await expect(screen.getByText('凭证创建成功')).toBeVisible();
    await expect(screen.getByText(/SecretKey:/)).toBeVisible();
    // Inspect the temporary DOM value inside the browser. Passing the SK as a
    // locator/evaluate argument would copy it into the test runner's trace.
    const secretDisplay = await browser.evaluate(() => {
      const paragraph = Array.from(document.querySelectorAll('.ant-modal-body div.ant-typography'))
        .find((element) => element.textContent?.startsWith('SecretKey:'));
      const secret = Array.from(paragraph?.children ?? [])
        .find((element) => element.matches('span.ant-typography') && !element.querySelector('strong'))
        ?.textContent?.trim();
      return {
        shown: !!secret && secret.length >= 16,
        persisted: !!secret && JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }).includes(secret),
      };
    });
    expect(secretDisplay.shown).toBe(true);
    expect(secretDisplay.persisted).toBe(false);
    await screen.getByRole('button', '我已保存', { exact: false }).tap();
    await expect(screen.getByText(/SecretKey:/)).not.toBeVisible();
    const listed = await uiResponse<Credential[]>(browser, '/api/v1/admin/credential/list', () =>
      screen.getByRole('button', /刷\s?新/).tap());
    expect(listed.data.some((credential) => credential.access_key === created.data.access_key)).toBe(true);
    expect(listed.data.every((credential) => Object.keys(credential).every((key) =>
      ['id', 'tenant_id', 'access_key', 'status', 'description', 'created_at', 'updated_at', 'disabled_at'].includes(key)))).toBe(true);
    const row = await tableRow(browser, created.data.access_key);
    await row.getByText('停用').tap();
    await uiResponse(browser, '/api/v1/admin/credential/disable', () =>
      screen.getByRole('button', /确\s?定/).tap());
    await expect(row.getByText('已停用')).toBeVisible();
    expect(await row.getByText('启用', { exact: true }).count()).toBe(0);
    const persisted = await uiResponse<Credential[]>(browser, '/api/v1/admin/credential/list', () =>
      screen.getByRole('button', /刷\s?新/).tap());
    expect(persisted.data.find((credential) => credential.access_key === created.data.access_key)?.status).toBe(2);
  });

  test('short-link page creates, generates, reads, and disables using server-side signing', async ({ app, screen, browser }) => {
    // Preserve the bootstrap tenant's existing grants. The browser never sees its SK.
    const tenants = await fixtureRequest<Tenant[]>('/api/v1/admin/tenant/list?limit=100');
    const signingTenant = tenants.find((tenant) => tenant.id === signingTenantId)!;
    await fixtureRequest('/api/v1/admin/tenant/grant', 'PUT', {
      id: signingTenantId,
      group_ids: [...new Set([...signingTenant.group_ids, groupId])],
    });
    await uiResponse<Link[]>(browser, '/api/v1/shorten/list', () => app.open('/short-link'));
    for (const action of ['create', 'gen'] as const) {
      await screen.getByRole('button', action === 'create' ? '创建短链' : '生成短链', { exact: false }).tap();
      await screen.getByPlaceholder('https://example.com/page').fill(`${target}&action=${action}`);
      await pickAntdSelect(browser, '.ant-modal-body', `${groupId} ${groupName}`);
      const created = await uiResponse<{ code: string; short_url?: string }>(browser, `/api/v1/shorten/${action}`, () =>
        screen.getByRole('button', /确\s?定/).tap());
      expect(typeof created.data.code).toBe('string');
      if (action === 'create') createdCode = created.data.code;
      else {
        expect(created.data.code).not.toBe(createdCode);
        expect(created.data.short_url).toBe(`https://${domainName}/${created.data.code}`);
      }
      await expect(screen.getByRole('dialog')).not.toBeVisible();
    }
    const listed = await uiResponse<Link[]>(browser, '/api/v1/shorten/list', () => browser.locator('.anticon-reload').click());
    const persisted = listed.data.find((link) => link.code === createdCode)!;
    expect(persisted.target_url).toBe(`${target}&action=create`);
    expect(persisted.group_id).toBe(groupId);
    expect(persisted.expires_at ?? null).toBe(null);
    const row = await tableRow(browser, createdCode);
    const detailResponse = await uiResponse<Link>(browser, '/api/v1/shorten/get', () => row.getByText('详情').tap());
    expect(detailResponse.data.code).toBe(createdCode);
    expect(detailResponse.data.target_url).toBe(persisted.target_url);
    const drawer = screen.getByRole('dialog', '短链详情');
    await expect(drawer.getByText(`${target}&action=create`, { exact: true })).toBeVisible();
    expect(await drawer.getByRole('textbox').count()).toBe(0);
    await drawer.getByRole('button', '关闭').tap();
    await row.getByText('停用').tap();
    await uiResponse(browser, '/api/v1/shorten/disable', () =>
      screen.getByRole('button', /确\s?定/).tap());
    const disabled = await uiResponse<Link[]>(browser, '/api/v1/shorten/list', () => browser.locator('.anticon-reload').click());
    expect(disabled.data.find((link) => link.code === createdCode)?.status).toBe(2);
    const disabledRow = await tableRow(browser, createdCode);
    expect(await browser.locator(`tr[data-row-key="${persisted.id}"] a`).filter({ hasText: '停用' }).count()).toBe(0);
    expect(await disabledRow.getByText('启用', { exact: true }).count()).toBe(0);

    // A rejected platform operation must surface the real backend's 409 reason.
    await uiResponse<Domain[]>(browser, '/api/v1/admin/domain/list', () => app.open('/domain-entry'));
    const domain = await tableRow(browser, domainName);
    await domain.getByText('下线').tap();
    const rejected = await uiResponse<null>(browser, '/api/v1/admin/domain/disable', () =>
      screen.getByRole('button', /确\s?定/).tap(), 409);
    await expect(screen.getByText(rejected.message, { exact: true })).toBeVisible();
    await expect(domain.getByText('下线')).toBeVisible();
  });

  test('group-config page sets, queries, updates, and deletes an independently named key', async ({ app, screen, browser }) => {
    await app.open('/group-config');
    await expect(screen.getByRole('columnheader', '分组编号')).toBeVisible();
    for (const value of [`value-${run}`, `updated-${run}`]) {
      await screen.getByRole('button', '设置配置', { exact: false }).tap();
      const dialog = screen.getByRole('dialog', '设置配置项');
      const inputs = dialog.getByRole('textbox');
      await inputs.nth(0).fill(String(groupId));
      await inputs.nth(1).fill(configKey);
      await inputs.nth(2).fill(value);
      const saved = await uiResponse<Config>(browser, '/api/v1/admin/group_config/set', () =>
        screen.getByRole('button', /确\s?定/).tap());
      expect(saved.data.config_value).toBe(value);
      await expect(dialog).not.toBeVisible();
    }
    await screen.getByLabel('分组编号').fill(String(groupId));
    const listed = await uiResponse<Config[]>(browser, '/api/v1/admin/group_config/list', () =>
      screen.getByRole('button', /查\s?询/).tap());
    expect(listed.data.find((config) => config.config_key === configKey)?.config_value).toBe(`updated-${run}`);
    const row = await tableRow(browser, configKey);
    await expect(row.getByText(`updated-${run}`)).toBeVisible();
    await row.getByText('删除').tap();
    await uiResponse(browser, '/api/v1/admin/group_config/delete', () =>
      screen.getByRole('button', /确\s?定/).tap());
    await expect(row).not.toBeVisible();
    const deleted = await uiResponse<Config[]>(browser, '/api/v1/admin/group_config/list', () =>
      screen.getByRole('button', /查\s?询/).tap());
    expect(deleted.data.some((config) => config.config_key === configKey)).toBe(false);
  });

  test('dashboard displays counts from the four actual backend list responses', async ({ app, screen, browser }) => {
    const paths = ['/api/v1/shorten/list', '/api/v1/admin/group/list', '/api/v1/admin/domain/list', '/api/v1/admin/tenant/list'];
    const responses = paths.map((path) => uiResponse<unknown[]>(browser, path, async () => {}));
    await app.open('/dashboard');
    const bodies = await Promise.all(responses);
    const labels = ['短链记录数', '分组数', '域名数', '租户数'];
    for (let index = 0; index < labels.length; index += 1) {
      expect(Array.isArray(bodies[index].data)).toBe(true);
      await expect(screen.getByText(labels[index], { exact: true })).toBeVisible();
      const statistic = browser.locator('.ant-statistic').filter({ hasText: labels[index] });
      await expect(statistic.getByText(String(bodies[index].data.length), { exact: true })).toBeVisible();
    }
  });
});
