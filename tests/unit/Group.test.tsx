import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import GroupPage from '@/pages/Group';

vi.mock('@/services', () => ({
  group: { create: vi.fn(), list: vi.fn(), configure: vi.fn() },
  domainEntry: { list: vi.fn() },
}));
import { group, domainEntry } from '@/services';
const groups = [
  { id: 1, group_id: 1001, name: '主站默认分组', domain_entry_id: 1, status: 1 as const, has_links: false },
  { id: 2, group_id: 1002, name: '营销活动', domain_entry_id: 2, status: 1 as const, has_links: true },
];
const domains = [
  { id: 1, domain: 's.example.com', status: 2 as const },
  { id: 2, domain: 'go.example.com', status: 2 as const },
  { id: 3, domain: 'dev.example.com', status: 1 as const },
];
beforeEach(() => {
  vi.mocked(group.create).mockReset();
  vi.mocked(group.configure).mockReset();
  vi.mocked(group.list).mockReset().mockResolvedValue(groups);
  vi.mocked(domainEntry.list).mockReset().mockResolvedValue(domains);
});

async function configureRow(name: string) {
  const row = await screen.findByRole('row', { name: new RegExp(name) });
  await userEvent.click(within(row).getByText('配置'));
  return within(await screen.findByRole('dialog', { name: '分组配置' }));
}

describe('Group 后端配置边界', () => {
  it('loads platform groups and makes the bounded list explicit', async () => {
    renderWithProviders(<GroupPage />);
    expect(await screen.findByText('主站默认分组')).toBeInTheDocument();
    expect(screen.getByText('分组管理（最多100条）')).toBeInTheDocument();
    expect(group.list).toHaveBeenCalledWith();
  });
  it('creates a group under a deployed domain', async () => {
    vi.mocked(group.create).mockResolvedValue(groups[0]);
    renderWithProviders(<GroupPage />);
    await userEvent.click(screen.getByRole('button', { name: /新建分组/ }));
    const form = within(await screen.findByRole('dialog', { name: '新建分组' }));
    await userEvent.type(form.getByLabelText('分组编号'), '1003');
    await userEvent.type(form.getByLabelText('分组名称'), '新组');
    fireEvent.mouseDown(form.getByRole('combobox'));
    await userEvent.click(await screen.findByText('s.example.com'));
    await userEvent.click(form.getByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(group.create).toHaveBeenCalledWith(
      expect.objectContaining({ group_id: 1003, name: '新组', domain_entry_id: 1 })));
  });
  it('keeps business identity and unsupported name editing read-only', async () => {
    renderWithProviders(<GroupPage />);
    const form = await configureRow('主站默认分组');
    expect(form.getByLabelText('分组编号')).toBeDisabled();
    expect(form.getByLabelText('分组名称')).toBeDisabled();
    vi.mocked(group.configure).mockResolvedValue(groups[0]);
    await userEvent.click(form.getByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(group.configure).toHaveBeenCalledWith(1001,
      { domain_entry_id: 1, status: 1 }));
  });
  it('freezes domain editing when the group has any issued links', async () => {
    renderWithProviders(<GroupPage />);
    const form = await configureRow('营销活动');
    expect(form.getByLabelText('绑定域名')).toBeDisabled();
    expect(form.getByText(/域名绑定已冻结/)).toBeInTheDocument();
  });
  it('shows a failed list as an error rather than a successful empty resource set', async () => {
    vi.mocked(group.list).mockRejectedValue(new Error('permission denied'));
    renderWithProviders(<GroupPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied');
  });
});
