// 统一响应请求层 —— 解包后端 { code, message, data }，失败抛 DomainError(含 code)
// Unified response layer — unwrap backend { code, message, data }, throw DomainError with code

import { request } from '@umijs/max';
import type { UnifiedResponse } from './typings';
import { DomainError } from './typings';
import { mockRequest } from '../mock/dispatch';

// 构建期注入的 mock 开关：MOCK !== '0' 时启用 in-app mock（dev 与 gh-pages 演示均生效）
// Build-time mock flag: in-app mock active when MOCK !== '0' (dev + gh-pages demo)
const MOCK_ENABLED = process.env.MOCK !== '0';

/** 请求选项 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, unknown>;
  data?: unknown;
}

/**
 * 统一请求：成功返回 data，失败抛 DomainError(code, message)
 * 页面消费纯领域对象，按 err.code 分支（如 409 资源约束冲突）
 *
 * mock 开启时优先走 in-app mock 分发（复用 src/mock/handlers），
 * 未命中路由再回退到真实请求，便于渐进接入后端。
 */
export async function fetchAPI<T>(url: string, options: RequestOptions = {}): Promise<T> {
  if (MOCK_ENABLED) {
    const mocked = mockRequest(options.method || 'GET', url, options.params, options.data);
    if (mocked) {
      if (mocked.code === 0) return mocked.data as T;
      throw new DomainError(mocked.code, mocked.message);
    }
  }
  const resp = await request<UnifiedResponse<T>>(url, {
    method: options.method || 'GET',
    params: options.params,
    data: options.data as any,
    // 不让 Umi 自动处理，统一由本层解包
    skipErrorHandler: true,
    responseType: 'json',
  });

  // 容错：部分管理接口直接返回数组/对象（非统一封装），按原样透传
  if (resp && typeof resp === 'object' && 'code' in resp && 'message' in resp) {
    if (resp.code === 0) {
      return resp.data as T;
    }
    // code !== 0 → 结构化错误
    throw new DomainError(resp.code, resp.message);
  }
  // 非统一封装，原样返回
  return resp as unknown as T;
}
