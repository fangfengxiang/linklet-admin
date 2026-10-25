// Credential 页面测试 —— SK 仅创建时返回明文一次；停用不可逆；AK 不复用；轮换=新建
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import CredentialPage from '@/pages/Credential';

vi.mock('@/services', () => ({
  credential: {
    create: vi.fn(),
    disable: vi.fn(),
    list: vi.fn(),
  },
}));

import { credential } from '@/services';
const mockCreate = vi.mocked(credential.create);
const mockDisable = vi.mocked(credential.disable);
const mockList = vi.mocked(credential.list);

const creds = [
  { id: 1, tenant_id: 1, access_key: 'AKL0001MOCK', description: '主凭证', status: 1, created_at: '2026-09-01T00:00:00Z' },
  { id: 2, tenant_id: 1, access_key: 'AKL0002MOCK', description: '旧凭证', status: 2, created_at: '2026-08-01T00:00:00Z', disabled_at: '2026-09-01T00:00:00Z' },
];

beforeEach(() => {
  mockCreate.mockReset();
  mockDisable.mockReset();
  mockList.mockReset();
});

describe('Credential 凭证管理', () => {
  it('未设置租户ID时新建按钮 disabled', async () => {
    mockList.mockResolvedValue([]);
    renderWithProviders(<CredentialPage />);

    expect(screen.getByRole('button', { name: /新建凭证/ })).toBeDisabled();
  });

  it('设置租户ID后加载凭证列表', async () => {
    mockList.mockResolvedValue(creds);
    const user = userEvent.setup();
    renderWithProviders(<CredentialPage />);

    const tenantInput = screen.getByRole('spinbutton');
    await user.type(tenantInput, '1');

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(1);
      expect(screen.getByText('AKL0001MOCK')).toBeInTheDocument();
    });
  });

  it('停用态凭证操作列显示"已停用"', async () => {
    mockList.mockResolvedValue(creds);
    const user = userEvent.setup();
    renderWithProviders(<CredentialPage />);

    const tenantInput = screen.getByRole('spinbutton');
    await user.type(tenantInput, '1');

    await waitFor(() => expect(screen.getByText('AKL0002MOCK')).toBeInTheDocument());
    expect(screen.getByText('已停用')).toBeInTheDocument();
  });

  it('新建凭证：提交后弹出 SK 一次性展示弹窗', async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue({ id: 3, access_key: 'AK_NEW', secret_key: 'SK_SECRET123' });
    const user = userEvent.setup();
    renderWithProviders(<CredentialPage />);

    // 输入租户ID → 新建按钮启用
    const tenantInput = screen.getByRole('spinbutton');
    await user.type(tenantInput, '1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /新建凭证/ })).not.toBeDisabled();
    });

    await user.click(screen.getByRole('button', { name: /新建凭证/ }));
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    // SK 弹窗展示 AccessKey 和 SecretKey
    await waitFor(() => {
      expect(screen.getByText('凭证创建成功')).toBeInTheDocument();
      expect(screen.getByText('AK_NEW')).toBeInTheDocument();
      expect(screen.getByText('SK_SECRET123')).toBeInTheDocument();
    });
  });

  it('停用凭证：Popconfirm 确认后调用 disable', async () => {
    mockList.mockResolvedValue(creds);
    mockDisable.mockResolvedValue({ access_key: 'AKL0001MOCK', status: 'disabled' });
    const user = userEvent.setup();
    renderWithProviders(<CredentialPage />);

    const tenantInput = screen.getByRole('spinbutton');
    await user.type(tenantInput, '1');

    await waitFor(() => expect(screen.getByText('AKL0001MOCK')).toBeInTheDocument());
    await user.click(screen.getByText('停用'));
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockDisable).toHaveBeenCalledWith('AKL0001MOCK');
    });
  });
});
