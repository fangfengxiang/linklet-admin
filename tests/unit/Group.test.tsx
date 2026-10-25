// Group 页面测试 —— group_id 不可改；可改绑域名；停用不影响已有短链
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import GroupPage from '@/pages/Group';

vi.mock('@/services', () => ({
  group: {
    create: vi.fn(),
    list: vi.fn(),
    configure: vi.fn(),
  },
  domainEntry: {
    list: vi.fn(),
  },
}));

import { group, domainEntry } from '@/services';
const mockCreate = vi.mocked(group.create);
const mockList = vi.mocked(group.list);
const mockConfigure = vi.mocked(group.configure);
const mockDomainList = vi.mocked(domainEntry.list);

const groups = [
  { id: 1, group_id: 1001, name: '主站默认分组', domain_entry_id: 1, status: 1 },
  { id: 2, group_id: 1002, name: '营销活动', domain_entry_id: 2, status: 1 },
];
const domains = [
  { id: 1, domain: 's.example.com', tag: '主站', status: 2 },
  { id: 2, domain: 'go.example.com', tag: '营销', status: 2 },
  { id: 3, domain: 'dev.example.com', tag: '测试', status: 1 },
];

beforeEach(() => {
  mockCreate.mockReset();
  mockList.mockReset();
  mockConfigure.mockReset();
  mockDomainList.mockReset();
});

describe('Group 分组管理', () => {
  it('加载列表显示分组数据', async () => {
    mockList.mockResolvedValue(groups);
    mockDomainList.mockResolvedValue(domains);
    renderWithProviders(<GroupPage />);

    await waitFor(() => {
      expect(screen.getByText('主站默认分组')).toBeInTheDocument();
      expect(screen.getByText('营销活动')).toBeInTheDocument();
    });
  });

  it('新建分组：填写表单提交，调用 create', async () => {
    mockList.mockResolvedValue([]);
    mockDomainList.mockResolvedValue(domains);
    mockCreate.mockResolvedValue({ id: 3, group_id: 1003, name: '新组', domain_entry_id: 1, status: 1 });
    const user = userEvent.setup();
    renderWithProviders(<GroupPage />);

    await user.click(screen.getByRole('button', { name: /新建分组/ }));

    await user.type(screen.getByLabelText('分组编号'), '1003');
    await user.type(screen.getByLabelText('分组名称'), '新组');

    // 选择域名（仅已投产域名：s.example.com / go.example.com）
    await user.click(screen.getByText('请选择'));
    await user.click(screen.getByText('s.example.com'));

    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          group_id: 1003,
          name: '新组',
          domain_entry_id: 1,
        }),
      );
    });
  });

  it('配置分组：group_id 字段 disabled（创建后不可改）', async () => {
    mockList.mockResolvedValue(groups);
    mockDomainList.mockResolvedValue(domains);
    const user = userEvent.setup();
    renderWithProviders(<GroupPage />);

    await waitFor(() => expect(screen.getByText('主站默认分组')).toBeInTheDocument());
    await user.click(screen.getByText('配置'));

    const gidInput = screen.getByLabelText('分组编号');
    expect(gidInput).toBeDisabled();
  });

  it('配置分组：修改名称提交，调用 configure', async () => {
    mockList.mockResolvedValue(groups);
    mockDomainList.mockResolvedValue(domains);
    mockConfigure.mockResolvedValue({ id: 1, group_id: 1001, name: '改名后', domain_entry_id: 1, status: 1 });
    const user = userEvent.setup();
    renderWithProviders(<GroupPage />);

    await waitFor(() => expect(screen.getByText('主站默认分组')).toBeInTheDocument());
    await user.click(screen.getByText('配置'));

    const nameInput = screen.getByLabelText('分组名称');
    await user.clear(nameInput);
    await user.type(nameInput, '改名后');

    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockConfigure).toHaveBeenCalledWith(
        1001,
        expect.objectContaining({ name: '改名后' }),
      );
    });
  });
});
