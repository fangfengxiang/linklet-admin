// 测试辅助 —— render 包装，注入 antd ConfigProvider，避免主题/上下文缺失
import { render, type RenderOptions } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { ReactElement, ReactNode } from 'react';

/** antd 组件测试统一入口：包 ConfigProvider + 默认中文，保证按钮文案为中文 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
  );
  return render(ui, { wrapper, ...options });
}
