// ShortLink 页面测试 —— target_url 不可改；code 不复用；停用不可逆；expires_at null=不过期
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import ShortLinkPage from '@/pages/ShortLink';

vi.mock('@/services', () => ({
  shortLink: {
    list: vi.fn(),
    create: vi.fn(),
    gen: vi.fn(),
    disable: vi.fn(),
  },
  group: {
    list: vi.fn(),
  },
}));

import { shortLink, group } from '@/services';
const mockList = vi.mocked(shortLink.list);
const mockCreate = vi.mocked(shortLink.create);
const mockGen = vi.mocked(shortLink.gen);
const mockDisable = vi.mocked(shortLink.disable);
const mockGroupList = vi.mocked(group.list);

const links = [
  { id: 1, group_id: 1001, code: 'aB9xK2', dest_url: 'https://example.com/page1', status: 1, created_at: '2026-09-10T00:00:00Z', expires_at: null },
  { id: 3, group_id: 1001, code: 'oPp2xR', dest_url: 'https://example.com/old', status: 2, created_at: '2026-08-01T00:00:00Z', expires_at: null, disabled_at: '2026-09-01T00:00:00Z' },
];
const groups = [
  { id: 1, group_id: 1001, name: '主站默认分组', domain_entry_id: 1, status: 1 },
];

beforeEach(() => {
  mockList.mockReset();
  mockCreate.mockReset();
  mockGen.mockReset();
  mockDisable.mockReset();
  mockGroupList.mockReset();
});

describe('ShortLink 短链管理', () => {
  it('加载列表显示短链数据', async () => {
    mockList.mockResolvedValue(links);
    mockGroupList.mockResolvedValue(groups);
    renderWithProviders(<ShortLinkPage />);

    await waitFor(() => {
      expect(screen.getByText('aB9xK2')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/page1')).toBeInTheDocument();
    });
  });

  it('停用态短链不显示停用操作（停用不可逆）', async () => {
    mockList.mockResolvedValue(links);
    mockGroupList.mockResolvedValue(groups);
    renderWithProviders(<ShortLinkPage />);

    await waitFor(() => expect(screen.getByText('oPp2xR')).toBeInTheDocument());
    // 已停用的短链操作列只有"详情"，无"停用"
    expect(screen.queryByText('停用')).not.toBeInTheDocument();
  });

  it('点击详情后打开抽屉显示 dest_url（target_url 只读）', async () => {
    mockList.mockResolvedValue(links);
    mockGroupList.mockResolvedValue(groups);
    const user = userEvent.setup();
    renderWithProviders(<ShortLinkPage />);

    await waitFor(() => expect(screen.getByText('aB9xK2')).toBeInTheDocument());
    await user.click(screen.getByText('详情'));

    await waitFor(() => {
      expect(screen.getByText('短链详情')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/page1')).toBeInTheDocument();
    });
  });

  it('停用短链：Popconfirm 确认后调用 disable', async () => {
    mockList.mockResolvedValue(links);
    mockGroupList.mockResolvedValue(groups);
    mockDisable.mockResolvedValue({ code: 'aB9xK2', status: 'disabled' });
    const user = userEvent.setup();
    renderWithProviders(<ShortLinkPage />);

    await waitFor(() => expect(screen.getByText('aB9xK2')).toBeInTheDocument());
    await user.click(screen.getByText('停用'));
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockDisable).toHaveBeenCalledWith('aB9xK2');
    });
  });

  it('创建短链：填写表单提交调用 create', async () => {
    mockList.mockResolvedValue([]);
    mockGroupList.mockResolvedValue(groups);
    mockCreate.mockResolvedValue({ code: 'NEW001' });
    const user = userEvent.setup();
    renderWithProviders(<ShortLinkPage />);

    await user.click(screen.getByRole('button', { name: /创建短链/ }));

    await user.type(screen.getByPlaceholderText('https://example.com/page'), 'https://test.com');

    // 选择分组
    await user.click(screen.getByText('请选择'));
    await user.click(screen.getByText('1001 主站默认分组'));

    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          target_url: 'https://test.com',
          group_id: 1001,
          expires_at: null,
        }),
      );
    });
  });

  it('必填校验：未填 target_url 提交，create 不被调用', async () => {
    mockList.mockResolvedValue([]);
    mockGroupList.mockResolvedValue(groups);
    const user = userEvent.setup();
    renderWithProviders(<ShortLinkPage />);

    await user.click(screen.getByRole('button', { name: /创建短链/ }));
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
