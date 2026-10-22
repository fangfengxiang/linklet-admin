// 短链 API Client —— 对应后端业务 API /api/v1/shorten/*
// 注意：业务 API 需租户 AK/SK HMAC-SHA1 签名，admin 控制台不持有 SK；
// dev 由 .umirc.ts proxy BFF 代签，生产 SPA 需 BFF 或 nginx(OpenResty) 代签。
// 后端 admin API 无 short_link 端点（无 list），list() 仅供 in-app mock 演示。
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
  // 后端无 admin short_link list 端点；此处仅 in-app mock 命中，真实后端调用会 404。
  // 生产管理控制台如需短链列表，需后端补 /api/v1/admin/short_link/list 或经 BFF 代签查询。
  list: () => fetchAPI<ShortLink[]>('/api/v1/shorten/list', { method: 'GET' }),
  get: (params: Record<string, unknown>) =>
    fetchAPI<ShortLink>('/api/v1/shorten/get', { method: 'GET', params }),
};
