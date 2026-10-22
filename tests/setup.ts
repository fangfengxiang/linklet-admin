// 测试全局 setup —— 注入 jest-dom 断言 + antd 依赖的浏览器 API 桩
import '@testing-library/jest-dom/vitest';

// antd 依赖 matchMedia，happy-dom 不提供，补桩
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as typeof window.matchMedia;
}

// antd Table 等依赖 ResizeObserver，补桩
if (!(window as unknown as { ResizeObserver?: unknown }).ResizeObserver) {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// 滚动相关桩（部分组件读取 scrollHeight）
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}
