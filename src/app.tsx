// Umi 运行时配置 —— 布局、请求拦截、全局错误处理
// Runtime configuration: layout, request interception, global error handling

import type { Settings as LayoutSettings } from '@ant-design/pro-components';

export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
}> {
  return {
    settings: {
      title: 'Linklet 管理控制台',
      navTheme: 'light',
      colorPrimary: '#1677ff',
      layout: 'mix',
    } as Partial<LayoutSettings>,
  };
}

/**
 * 布局配置 / Layout config
 */
export const layout = ({
  initialState,
}: {
  initialState?: { settings?: Partial<LayoutSettings> };
}) => {
  return {
    logo: false,
    menu: { locale: false },
    ...initialState?.settings,
  };
};
