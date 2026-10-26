import { beforeEach, describe, expect, it, vi } from 'vitest';
const { fetchAPI } = vi.hoisted(() => ({ fetchAPI: vi.fn() }));
vi.mock('@/services/request', () => ({ fetchAPI }));
import { group } from '@/services/group';
import { tenant } from '@/services/tenant';
import { shortLink } from '@/services/shortLink';
import { credential } from '@/services/credential';
import { groupConfig } from '@/services/groupConfig';

beforeEach(() => fetchAPI.mockReset().mockResolvedValue([]));
describe('service request contracts', () => {
  it('keeps group platform enumeration distinct from tenant-granted enumeration', async () => {
    await group.list();
    expect(fetchAPI).toHaveBeenLastCalledWith('/api/v1/admin/group/list', { method: 'GET', params: undefined });
    await group.list(7);
    expect(fetchAPI).toHaveBeenLastCalledWith('/api/v1/admin/group/list', { method: 'GET', params: { tenant_id: 7 } });
  });
  it('cannot rename a group or replace its identity through configuration form extras', async () => {
    const formValues = { group_id: 99, name: 'ignored', status: 2 as const, domain_entry_id: 3 };
    await group.configure(7, formValues);
    expect(fetchAPI).toHaveBeenLastCalledWith('/api/v1/admin/group/configure', {
      method: 'PUT', data: { group_id: 7, status: 2, domain_entry_id: 3 },
    });
  });
  it('deduplicates tenant grants and permits complete revocation', async () => {
    await tenant.grant(1, [7, 7, 8]);
    expect(fetchAPI).toHaveBeenLastCalledWith('/api/v1/admin/tenant/grant', {
      method: 'PUT', data: { id: 1, group_ids: [7, 8] },
    });
    await tenant.grant(1, []);
    expect(fetchAPI).toHaveBeenLastCalledWith('/api/v1/admin/tenant/grant', {
      method: 'PUT', data: { id: 1, group_ids: [] },
    });
  });
  it('lists authorized short links and retrieves details by code', async () => {
    await shortLink.list({ group_id: 7 });
    expect(fetchAPI).toHaveBeenLastCalledWith('/api/v1/shorten/list', { method: 'GET', params: { group_id: 7 } });
    await shortLink.get({ code: 'abc123' });
    expect(fetchAPI).toHaveBeenLastCalledWith('/api/v1/shorten/get', { method: 'GET', params: { code: 'abc123' } });
  });
  it('requests safe credential fields through the tenant list and preserves the DELETE body', async () => {
    await credential.list(7);
    expect(fetchAPI).toHaveBeenLastCalledWith('/api/v1/admin/credential/list', { method: 'GET', params: { tenant_id: 7 } });
    await groupConfig.delete(7, 'key');
    expect(fetchAPI).toHaveBeenLastCalledWith('/api/v1/admin/group_config/delete', {
      method: 'DELETE', data: { group_id: 7, config_key: 'key' },
    });
  });
});
