import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import CredentialPage from '@/pages/Credential';
import { credential, tenant } from '@/services';

vi.mock('@/services', () => ({
  credential: { create: vi.fn(), disable: vi.fn(), list: vi.fn() },
  tenant: { list: vi.fn() },
}));
const tenants = [
  { id: 1, name: '运营主体A', group_ids: [], status: 1 as const },
  { id: 2, name: '运营主体B', group_ids: [], status: 1 as const },
];
const creds = [
  { id: 1, tenant_id: 1, access_key: 'AKL0001MOCK', status: 1 as const },
  { id: 2, tenant_id: 1, access_key: 'AKL0002MOCK', status: 2 as const },
];
beforeEach(() => {
  vi.mocked(tenant.list).mockReset().mockResolvedValue(tenants);
  vi.mocked(credential.list).mockReset().mockResolvedValue(creds);
  vi.mocked(credential.create).mockReset().mockResolvedValue({ id: 3, access_key: 'AK_NEW', secret_key: 'SK_ONCE_ONLY' });
  vi.mocked(credential.disable).mockReset().mockResolvedValue({ access_key: 'AKL0001MOCK', status: 'disabled' });
});

describe('Credential tenant workflow', () => {
  it('automatically loads the first tenant and credentials on entry', async () => {
    renderWithProviders(<CredentialPage />);
    expect(await screen.findByText('AKL0001MOCK')).toBeInTheDocument();
    expect(screen.getByText('运营主体A（ID：1）')).toBeInTheDocument();
    expect(credential.list).toHaveBeenCalledWith(1);
    expect(screen.getByRole('button', { name: /新建凭证/ })).toBeEnabled();
  });
  it('refreshes credentials when the tenant selection changes', async () => {
    vi.mocked(credential.list).mockImplementation(async (id) => id === 1 ? creds : [{ ...creds[0], id: 3, tenant_id: 2, access_key: 'AK_TENANT_2' }]);
    renderWithProviders(<CredentialPage />);
    await screen.findByText('AKL0001MOCK');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '租户' }));
    await userEvent.click(await screen.findByText('运营主体B（ID：2）'));
    expect(await screen.findByText('AK_TENANT_2')).toBeInTheDocument();
    expect(credential.list).toHaveBeenLastCalledWith(2);
  });
  it('lets users open creation immediately and choose a tenant explicitly', async () => {
    renderWithProviders(<CredentialPage />);
    await screen.findByText('AKL0001MOCK');
    await userEvent.click(screen.getByRole('button', { name: /新建凭证/ }));
    const form = within(await screen.findByRole('dialog', { name: '新建凭证' }));
    expect(form.getByLabelText('所属租户')).toBeInTheDocument();
    await userEvent.click(form.getByRole('button', { name: /确\s?定/ }));
    await waitFor(() => expect(credential.create).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: 1 })));
    expect(await screen.findByText('SK_ONCE_ONLY')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '我已保存' }));
    await waitFor(() => expect(screen.queryByText('SK_ONCE_ONLY')).not.toBeInTheDocument());
  });
  it('explains missing tenants and does not issue a credential without one', async () => {
    vi.mocked(tenant.list).mockResolvedValue([]);
    renderWithProviders(<CredentialPage />);
    expect(await screen.findByText(/暂无租户/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /新建凭证/ }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: '新建凭证' })).getByRole('button', { name: /确\s?定/ }));
    expect(await screen.findByText('请选择所属租户')).toBeInTheDocument();
    expect(credential.create).not.toHaveBeenCalled();
  });
  it('keeps disabled credentials irreversible and confirms disabling active ones', async () => {
    renderWithProviders(<CredentialPage />);
    const disabled = await screen.findByRole('row', { name: /AKL0002MOCK/ });
    expect(within(disabled).getByText('已停用')).toBeInTheDocument();
    expect(within(disabled).queryByText('启用', { selector: 'a' })).not.toBeInTheDocument();
    const active = screen.getByRole('row', { name: /AKL0001MOCK/ });
    await userEvent.click(within(active).getByText('停用', { selector: 'a' }));
    await userEvent.click(screen.getByRole('button', { name: /确\s?定/ }));
    await waitFor(() => expect(credential.disable).toHaveBeenCalledWith('AKL0001MOCK'));
  });
});
