// 短链 API Client —— 对应后端业务 API /api/v1/shorten/*
// 业务请求由服务端 BFF 用当前配置凭证签名；浏览器不读取签名 SK。
import { fetchAPI } from './request';
import type { CreateShortLinkBody, CreateShortLinkResult, ShortLink } from './typings';

export const shortLink = {
  create: (body: CreateShortLinkBody) =>
    fetchAPI<CreateShortLinkResult>('/api/v1/shorten/create', { method: 'POST', data: body }),
  gen: (body: CreateShortLinkBody) =>
    fetchAPI<CreateShortLinkResult>('/api/v1/shorten/gen', { method: 'POST', data: body }),
  disable: (code: string) =>
    fetchAPI<{ code: string; status: string }>('/api/v1/shorten/disable', {
      method: 'PUT',
      data: { code },
    }),
  list: (params?: { group_id?: number }) =>
    fetchAPI<ShortLink[]>('/api/v1/shorten/list', { method: 'GET', params }),
  get: (params: { code: string }) =>
    fetchAPI<ShortLink>('/api/v1/shorten/get', { method: 'GET', params }),
};
