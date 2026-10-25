// GroupConfig 页面测试 —— (group_id, config_key) 唯一；key max128 value max65536
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import GroupConfigPage from '@/pages/GroupConfig';

vi.mock('@/services', () => ({
  groupConfig: {
    list: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

import { groupConfig } from '@/services';
const mockSet = vi.mocked(groupConfig.set);

beforeEach(() => {
  mockSet.mockReset();
  vi.mocked(groupConfig.list).mockReset();
  vi.mocked(groupConfig.delete).mockReset();
});

describe('GroupConfig 分组配置', () => {
  it('设置配置：填写表单提交，调用 set', async () => {
    vi.mocked(groupConfig.list).mockResolvedValue([]);
    mockSet.mockResolvedValue({ id: 2, group_id: 1001, config_key: 'k', config_value: 'v' });
    const user = userEvent.setup();
    renderWithProviders(<GroupConfigPage />);

    await user.click(screen.getByRole('button', { name: /设置配置/ }));

    await user.type(screen.getByLabelText('分组编号'), '1001');
    await user.type(screen.getByLabelText('配置键'), 'max_retries');
    await user.type(screen.getByLabelText('配置值'), '3');
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          group_id: 1001,
          config_key: 'max_retries',
          config_value: '3',
        }),
      );
    });
  });

  it('必填校验：未填 config_key 提交，set 不被调用', async () => {
    vi.mocked(groupConfig.list).mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithProviders(<GroupConfigPage />);

    await user.click(screen.getByRole('button', { name: /设置配置/ }));
    await user.type(screen.getByLabelText('分组编号'), '1001');
    // 不填 config_key 和 config_value
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  it('说明字段为可选：仅填必填项即可提交', async () => {
    vi.mocked(groupConfig.list).mockResolvedValue([]);
    mockSet.mockResolvedValue({ id: 3, group_id: 1001, config_key: 'k2', config_value: 'v2' });
    const user = userEvent.setup();
    renderWithProviders(<GroupConfigPage />);

    await user.click(screen.getByRole('button', { name: /设置配置/ }));
    await user.type(screen.getByLabelText('分组编号'), '1001');
    await user.type(screen.getByLabelText('配置键'), 'k2');
    await user.type(screen.getByLabelText('配置值'), 'v2');
    // 不填"说明"
    await user.click(screen.getByRole('button', { name: /确\s?定/ }));

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ group_id: 1001, config_key: 'k2', config_value: 'v2' }),
      );
    });
  });
});
