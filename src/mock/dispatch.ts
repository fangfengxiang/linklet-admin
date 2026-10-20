// Mock 请求分发器 —— in-app mock 模式下按 method + path 分发到 handler
// Mock dispatcher — dispatches by method + path under in-app mock mode.
import type { UnifiedResponse } from '@/services/typings';
import { routes } from './handlers';

/**
 * 命中返回统一响应，未命中返回 null（由调用方决定是否回退真实请求）。
 * Returns the unified response on hit, null on miss.
 */
export function mockRequest(
  method: string,
  url: string,
  query?: Record<string, unknown>,
  body?: unknown,
): UnifiedResponse | null {
  const path = url.split('?')[0];
  const handler = routes[`${method.toUpperCase()} ${path}`];
  if (!handler) return null;
  return handler(query || {}, body);
}
