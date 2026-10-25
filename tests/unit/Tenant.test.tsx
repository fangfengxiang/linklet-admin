// Tenant 页面测试 —— group_ids 授权集合（非所有权，去重）；停用阻止管理不影响解析
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import TenantPage from '@/pages/Tenant';

vi.mock('@/services', () => ({
  tenant: {
    create: vi.fn(),
    list: vi.fn(),
    grant: vi.fn(),
    setStatus: vi.fn(),
  },
  group: {
    list: vi.fn(),
  },
}));

import { tenant, group } from '@/services';
const mockCreate = vi.mocked(tenant.create);
const mockList = vi.mocked(tenant.list);
const mockGrant = vi.mocked(tenant.grant);
const mockSetStatus = vi.mocked(tenant.setStatus);
const mockGroupList = vi.mocked(group.list);

const tenants = [
  { id: 1, name: '运营主体A', group_ids: [1001, 1002], status: 1 },
  { id: 2, name: '运营主体B', group_ids: [1001], status: 2 },
];
const groups = [
  { id: 1, group_id: 1001, name: '主站默认分组', domain_entry_id: 1, status: 1 },
  { id: 2, group_id: 1002, name: '营销活动', domain_entry_id: 2, status: 1 },
];

beforeEach(() => {
  mockCreate.mockReset();
  mockList.mockReset();
  mockGrant.mockReset();
  mockSetStatus.mockReset();
  mockGroupList.mockReset();
});

describe('Tenant 租户管理', () => {
  it('加载列表显示租户数据', async () => {
    mockList.mockResolvedValue(tenants);
    mockGroupList.mockResolvedValue(groups);
    renderWithProviders(<TenantPage />);

    await waitFor(() => {
      expect(screen.getByText('运营主体A')).toBeInTheDocument();
      expect(screen.getByText('运营主体B')).toBeInTheDocument();
    });
  });

  it('停用态租户：授权操作不可点击（灰色 span）', async () => {
    mockList.mockResolvedValue(tenants);
    mockGroupList.mockResolvedValue(groups);
    renderWithProviders(<TenantPage />);

    await waitFor(() => expect(screen.getByText('运营主体B')).toBeInTheDocument());
    // 运营主体B status=2，授权为灰色 span
    const grantSpans = screen.getAllByText('授权');
    // 第 2 个租户的授权是灰色
    const disabledGrant = grantSpans[1];
    expect(disabledGrant.tagName).toBe('SPAN');
  });

  it('新建租户：填写名称提交，调用 create', async () => {
    mockList.mockResolvedValue([]);
    mockGroupList.mockResolvedValue(groups);
    mockCreate.mockResolvedValue({ id: 3, name: '新租户', group_ids: [], status: 1 });
    const user = userEvent.setup();
    renderWithProviders(<TenantPage />);

    await user.click(screen.getByRole('button', { name: /新建租户/ }));
    await user.type(screen.getByLabelText('租户名称'), '新租户');
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ name: '新租户' });
    });
  });

  it('停用租户：Popconfirm 确认后调用 setStatus', async () => {
    mockList.mockResolvedValue(tenants);
    mockGroupList.mockResolvedValue(groups);
    mockSetStatus.mockResolvedValue({ id: 1, name: '运营主体A', group_ids: [1001, 1002], status: 2 });
    const user = userEvent.setup();
    renderWithProviders(<TenantPage />);

    await waitFor(() => expect(screen.getByText('运营主体A')).toBeInTheDocument());
    await user.click(screen.getByText('停用'));
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockSetStatus).toHaveBeenCalledWith(1, 2);
    });
  });

  it('启用租户：Popconfirm 确认后调用 setStatus', async () => {
    mockList.mockResolvedValue(tenants);
    mockGroupList.mockResolvedValue(groups);
    mockSetStatus.mockResolvedValue({ id: 2, name: '运营主体B', group_ids: [1001], status: 1 });
    const user = userEvent.setup();
    renderWithProviders(<TenantPage />);

    await waitFor(() => expect(screen.getByText('运营主体B')).toBeInTheDocument());
    await user.click(screen.getByText('启用'));
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockSetStatus).toHaveBeenCalledWith(2, 1);
    });
  });

  it('授权分组：打开弹窗选择分组提交，调用 grant', async () => {
    mockList.mockResolvedValue(tenants);
    mockGroupList.mockResolvedValue(groups);
    mockGrant.mockResolvedValue({ id: 1, name: '运营主体A', group_ids: [1001, 1002], status: 1 });
    const user = userEvent.setup();
    renderWithProviders(<TenantPage />);

    await waitFor(() => expect(screen.getByText('运营主体A')).toBeInTheDocument());

    // 点授权（运营主体A status=1，可点击的 a 标签）
    const grantLinks = screen.getAllByText('授权');
    // 第 1 个租户的授权是可点击的 <a>
    await user.click(grantLinks[0]);

    // 清空已有选择后重新选
    await user.click(screen.getByText('请选择'));
    await user.click(screen.getByText('1001 主站默认分组'));
    await user.click(screen.getByText('1002 营销活动'));

    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockGrant).toHaveBeenCalledWith(1, expect.arrayContaining([1001, 1002]));
    });
  });
});
