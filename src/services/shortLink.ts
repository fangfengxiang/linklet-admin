// 短链 API Client —— 对应后端 /api/v1/shorten/*
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
  list: () => fetchAPI<ShortLink[]>('/api/v1/shorten/list', { method: 'GET' }),
  get: (params: Record<string, unknown>) =>
    fetchAPI<ShortLink>('/api/v1/shorten/get', { method: 'GET', params }),
};
