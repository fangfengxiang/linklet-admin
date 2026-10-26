import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import ShortLinkPage, { normalizeExpiry } from '@/pages/ShortLink';
vi.mock('@/services', () => ({
  shortLink: { list: vi.fn(), get: vi.fn(), create: vi.fn(), gen: vi.fn(), disable: vi.fn() },
  group: { list: vi.fn() },
}));
import { shortLink, group } from '@/services';
const links = [
  { id: 1, group_id: 1001, code: 'aB9xK2', target_url: 'https://example.com/page1', status: 1 as const, expires_at: null },
  { id: 3, group_id: 1001, code: 'oPp2xR', target_url: 'https://example.com/old', status: 2 as const, expires_at: null },
];
beforeEach(() => {
  vi.mocked(shortLink.list).mockReset().mockResolvedValue(links);
  vi.mocked(shortLink.get).mockReset().mockResolvedValue(links[0]);
  vi.mocked(shortLink.create).mockReset().mockResolvedValue({ code: 'NEW001' });
  vi.mocked(shortLink.gen).mockReset().mockResolvedValue({ code: 'NEW002', short_url: 'https://s.example.com/NEW002' });
  vi.mocked(shortLink.disable).mockReset().mockResolvedValue({ code: 'aB9xK2', status: 'disabled' });
  vi.mocked(group.list).mockReset().mockResolvedValue([
    { id: 1, group_id: 1001, name: '主站默认分组', domain_entry_id: 1, status: 1 },
  ]);
});
describe('ShortLink 真实请求契约', () => {
  it('renders target_url and exposes only the irreversible disable action for active rows', async () => {
    renderWithProviders(<ShortLinkPage />);
    const disabled = await screen.findByRole('row', { name: /oPp2xR/ });
    expect(within(disabled).getByText('https://example.com/old')).toBeInTheDocument();
    expect(within(disabled).queryByText('停用', { selector: 'a' })).not.toBeInTheDocument();
  });
  it('loads details through the authenticated get endpoint and keeps the target read-only', async () => {
    renderWithProviders(<ShortLinkPage />);
    const row = await screen.findByRole('row', { name: /aB9xK2/ });
    await userEvent.click(within(row).getByText('详情'));
    const drawer = within(await screen.findByRole('dialog', { name: '短链详情' }));
    expect(await drawer.findByText('https://example.com/page1')).toBeInTheDocument();
    expect(shortLink.get).toHaveBeenCalledWith({ code: 'aB9xK2' });
    expect(drawer.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('disables only after confirmation', async () => {
    renderWithProviders(<ShortLinkPage />);
    const row = await screen.findByRole('row', { name: /aB9xK2/ });
    await userEvent.click(within(row).getByText('停用', { selector: 'a' }));
    await userEvent.click(screen.getByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(shortLink.disable).toHaveBeenCalledWith('aB9xK2'));
  });
  it.each(['创建短链', '生成短链'])('submits the %s action with a permanent expiry', async (action) => {
    renderWithProviders(<ShortLinkPage />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(action) }));
    const form = within(await screen.findByRole('dialog', { name: action === '生成短链' ? '生成短链（含完整URL）' : action }));
    await userEvent.type(form.getByLabelText('目标URL'), 'https://test.com');
    fireEvent.mouseDown(form.getByRole('combobox'));
    await userEvent.click(await screen.findByText('1001 主站默认分组'));
    await userEvent.click(form.getByRole('button', { name: /确\s*定/ }));
    const method = action === '生成短链' ? shortLink.gen : shortLink.create;
    await waitFor(() => expect(method).toHaveBeenCalledWith({ target_url: 'https://test.com', group_id: 1001, expires_at: null }));
  });
  it('does not submit missing required fields', async () => {
    renderWithProviders(<ShortLinkPage />);
    await userEvent.click(screen.getByRole('button', { name: /创建短链/ }));
    const form = within(await screen.findByRole('dialog', { name: /创建短链/ }));
    await userEvent.click(form.getByRole('button', { name: /确\s*定/ }));
    expect(shortLink.create).not.toHaveBeenCalled();
  });
  it('serializes picker values as RFC3339 and preserves permanent links', () => {
    expect(normalizeExpiry(null)).toBeNull();
    expect(normalizeExpiry('2030-01-02 03:04:05')).toMatch(/^2030-01-0[12]T\d\d:\d\d:\d\d\.000Z$/);
    expect(normalizeExpiry('2030-01-02T03:04:05+08:00')).toBe('2030-01-01T19:04:05.000Z');
    expect(() => normalizeExpiry('not a date')).toThrow('过期时间无效');
  });
});
