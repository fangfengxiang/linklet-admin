// Backend envelopes and HTTP errors share one typed boundary.
import { request } from '@umijs/max';
import type { UnifiedResponse } from './typings';
import { DomainError } from './typings';
import { mockRequest } from '../mock/dispatch';

const MOCK_ENABLED = process.env.MOCK !== '0';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, unknown>;
  data?: unknown;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function envelope(value: unknown): value is UnifiedResponse<unknown> {
  return object(value) && typeof value.code === 'number' &&
    typeof value.message === 'string' && 'data' in value;
}

function unwrap<T>(value: unknown, httpStatus?: number): T {
  if (!envelope(value)) throw new DomainError(502, '后端响应格式无效', httpStatus);
  if (value.code !== 0) throw new DomainError(value.code, value.message, httpStatus);
  return value.data as T;
}

export async function fetchAPI<T>(url: string, options: RequestOptions = {}): Promise<T> {
  if (MOCK_ENABLED) {
    const mocked = mockRequest(options.method || 'GET', url, options.params, options.data);
    if (!mocked) throw new DomainError(404, '演示模式未实现该接口');
    return unwrap<T>(mocked);
  }

  try {
    const response = await request<UnifiedResponse<T>>(url, {
      method: options.method || 'GET',
      params: options.params,
      data: options.data,
      skipErrorHandler: true,
      responseType: 'json',
    });
    return unwrap<T>(response);
  } catch (error: unknown) {
    if (error instanceof DomainError) throw error;
    const response = object(error) && object(error.response) ? error.response : undefined;
    const status = response && typeof response.status === 'number' ? response.status : undefined;
    const body = response?.data ?? (object(error) ? error.data : undefined);
    if (envelope(body)) throw new DomainError(body.code || status || 500, body.message, status);
    if (status) throw new DomainError(status, `请求失败（HTTP ${status}）`, status);
    throw new DomainError(503, '无法连接后端，请检查服务和网络');
  }
}
