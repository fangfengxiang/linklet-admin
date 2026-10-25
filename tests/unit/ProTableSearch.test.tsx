// ProTable 筛选交互测试 —— 验证搜索表单“查询/重置”点击 → 表格数据更新
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import DomainSearchTable from '../fixtures/DomainSearchTable';

// 组件测试隔离数据层：mock 掉 service，返回固定 fixture 数据
vi.mock('@/services', () => ({
  domainEntry: {
    list: vi.fn(),
    create: vi.fn(),
    deploy: vi.fn(),
    disable: vi.fn(),
  },
}));

import { domainEntry } from '@/services';
const mockList = vi.mocked(domainEntry.list);

const domains = [
  { id: 1, domain: 's.example.com', tag: '主站', status: 2 as const, created_at: '2026-09-01T00:00:00Z' },
  { id: 2, domain: 'go.example.com', tag: '营销', status: 2 as const, created_at: '2026-09-02T00:00:00Z' },
  { id: 3, domain: 'dev.example.com', tag: '测试', status: 1 as const, created_at: '2026-10-01T00:00:00Z' },
];

beforeEach(() => {
  mockList.mockReset();
});

describe('ProTable 筛选交互', () => {
  it('输入域名关键字查询后，表格只显示匹配行', async () => {
    mockList.mockResolvedValue(domains);
    const user = userEvent.setup();
    renderWithProviders(<DomainSearchTable />);

    // 初始加载 3 条
    await waitFor(() => {
      expect(screen.getByText('s.example.com')).toBeInTheDocument();
      expect(screen.getByText('go.example.com')).toBeInTheDocument();
      expect(screen.getByText('dev.example.com')).toBeInTheDocument();
    });

    // 输入域名关键字并查询
    await user.type(screen.getByPlaceholderText('请输入域名'), 'go');
    await user.click(screen.getByRole('button', { name: /查\s?询/ }));

    // 只剩匹配行
    await waitFor(() => {
      expect(screen.getByText('go.example.com')).toBeInTheDocument();
      expect(screen.queryByText('s.example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('dev.example.com')).not.toBeInTheDocument();
    });
  });

  it('点重置清空筛选条件，恢复全部行', async () => {
    mockList.mockResolvedValue(domains);
    const user = userEvent.setup();
    renderWithProviders(<DomainSearchTable />);

    await waitFor(() => expect(screen.getByText('s.example.com')).toBeInTheDocument());

    // 先筛选
    await user.type(screen.getByPlaceholderText('请输入域名'), 'go');
    await user.click(screen.getByRole('button', { name: /查\s?询/ }));
    await waitFor(() => expect(screen.queryByText('s.example.com')).not.toBeInTheDocument());

    // 重置
    await user.click(screen.getByRole('button', { name: /重\s?置/ }));
    await waitFor(() => {
      expect(screen.getByText('s.example.com')).toBeInTheDocument();
      expect(screen.getByText('go.example.com')).toBeInTheDocument();
      expect(screen.getByText('dev.example.com')).toBeInTheDocument();
    });
  });
});
