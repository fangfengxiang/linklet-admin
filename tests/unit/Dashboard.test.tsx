// Dashboard 页面测试 —— 验证资源概览卡片渲染与计数加载
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import Dashboard from '@/pages/Dashboard';

// 隔离数据层：mock 全部 4 个 service
vi.mock('@/services', () => ({
  shortLink: { list: vi.fn() },
  group: { list: vi.fn() },
  domainEntry: { list: vi.fn() },
  tenant: { list: vi.fn() },
}));

import { shortLink, group, domainEntry, tenant } from '@/services';

beforeEach(() => {
  vi.mocked(shortLink.list).mockReset();
  vi.mocked(group.list).mockReset();
  vi.mocked(domainEntry.list).mockReset();
  vi.mocked(tenant.list).mockReset();
});

describe('Dashboard 仪表盘', () => {
  it('加载后展示 4 个统计卡片及正确计数', async () => {
    vi.mocked(shortLink.list).mockResolvedValue([
      { id: 1, group_id: 1, code: 'a', target_url: 'https://a.com', status: 1 },
      { id: 2, group_id: 1, code: 'b', target_url: 'https://b.com', status: 1 },
    ]);
    vi.mocked(group.list).mockResolvedValue([
      { id: 1, group_id: 1001, name: 'G1', domain_entry_id: 1, status: 1 },
      { id: 2, group_id: 1002, name: 'G2', domain_entry_id: 1, status: 1 },
      { id: 3, group_id: 1003, name: 'G3', domain_entry_id: 1, status: 1 },
    ]);
    vi.mocked(domainEntry.list).mockResolvedValue([
      { id: 1, domain: 's.com', status: 2 },
    ]);
    vi.mocked(tenant.list).mockResolvedValue([
      { id: 1, name: 'T1', group_ids: [], status: 1 },
      { id: 2, name: 'T2', group_ids: [], status: 1 },
      { id: 3, name: 'T3', group_ids: [], status: 1 },
      { id: 4, name: 'T4', group_ids: [], status: 1 },
    ]);

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('短链记录数')).toBeInTheDocument();
      expect(screen.getByText('分组数')).toBeInTheDocument();
      expect(screen.getByText('域名数')).toBeInTheDocument();
      expect(screen.getByText('租户数')).toBeInTheDocument();
    });
    // 各计数唯一，避免 getByText 歧义
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // 短链=2
    });
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // 分组=3
    });
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // 域名=1
    });
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument(); // 租户=4
    });
  });

  it('service 调用失败时不崩溃，卡片标题仍渲染', async () => {
    vi.mocked(shortLink.list).mockRejectedValue(new Error('network'));
    vi.mocked(group.list).mockRejectedValue(new Error('network'));
    vi.mocked(domainEntry.list).mockRejectedValue(new Error('network'));
    vi.mocked(tenant.list).mockRejectedValue(new Error('network'));

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('短链记录数')).toBeInTheDocument();
      expect(screen.getByText('分组数')).toBeInTheDocument();
      expect(screen.getByText('域名数')).toBeInTheDocument();
      expect(screen.getByText('租户数')).toBeInTheDocument();
    });
  });
});
