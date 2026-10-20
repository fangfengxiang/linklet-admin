// 租户 API Client —— 对应后端 /api/v1/admin/tenant/*
import { fetchAPI } from './request';
import type { ActiveStatus, GrantScenesBody, Tenant } from './typings';

export const tenant = {
  create: (body: { name: string }) =>
    fetchAPI<Tenant>('/api/v1/admin/tenant/create', { method: 'POST', data: body }),
  list: (params?: { limit?: number }) =>
    fetchAPI<Tenant[]>('/api/v1/admin/tenant/list', { method: 'GET', params }),
  grant: (id: number, scene_ids: number[]) =>
    fetchAPI<Tenant>('/api/v1/admin/tenant/grant', {
      method: 'PUT',
      data: { id, scene_ids } satisfies GrantScenesBody,
    }),
  setStatus: (id: number, status: ActiveStatus) =>
    fetchAPI<Tenant>('/api/v1/admin/tenant/status', { method: 'PUT', data: { id, status } }),
};
