// ProForm(ModalForm) 提交测试 —— 基于真实 DomainEntry 页面
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import DomainEntryPage from '@/pages/DomainEntry';

// 隔离数据层：mock service，返回固定数据
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
const mockCreate = vi.mocked(domainEntry.create);

beforeEach(() => {
  mockList.mockReset();
  mockCreate.mockReset();
});

describe('DomainEntry 页面 — ProForm(ModalForm) 提交', () => {
  it('点击新建 → 填写域名 → 确定，调用 create 并刷新列表', async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue({ id: 99, domain: 'x.example.com', status: 1 });

    const user = userEvent.setup();
    renderWithProviders(<DomainEntryPage />);

    // 打开 ModalForm
    await user.click(screen.getByRole('button', { name: /新建域名/ }));

    // 填写必填域名（placeholder 为 's.example.com'）
    const domainInput = await screen.findByPlaceholderText('s.example.com');
    await user.type(domainInput, 'x.example.com');

    // 点确定提交
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    // create 被调用，参数含 domain
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ domain: 'x.example.com' }));
    });
    // 列表刷新：初始加载 + 提交后 reload，list 至少被调用 2 次
    await waitFor(() => {
      expect(mockList.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('必填校验：未填域名点确定，create 不被调用', async () => {
    mockList.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithProviders(<DomainEntryPage />);

    await user.click(screen.getByRole('button', { name: /新建域名/ }));
    // 不填域名，直接点确定 → 触发必填校验
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    // 校验失败，不提交
    await waitFor(() => {
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
