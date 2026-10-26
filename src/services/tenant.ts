// 租户 API Client —— 对应后端 /api/v1/admin/tenant/*
import { fetchAPI } from './request';
import type { ActiveStatus, GrantGroupsBody, Tenant } from './typings';

export const tenant = {
  create: (body: { name: string }) =>
    fetchAPI<Tenant>('/api/v1/admin/tenant/create', { method: 'POST', data: body }),
  list: (params?: { limit?: number }) =>
    fetchAPI<Tenant[]>('/api/v1/admin/tenant/list', { method: 'GET', params: { limit: 100, ...params } }),
  grant: (id: number, group_ids: number[]) =>
    fetchAPI<Tenant>('/api/v1/admin/tenant/grant', {
      method: 'PUT',
      data: { id, group_ids: [...new Set(group_ids)] } satisfies GrantGroupsBody,
    }),
  setStatus: (id: number, status: ActiveStatus) =>
    fetchAPI<Tenant>('/api/v1/admin/tenant/status', { method: 'PUT', data: { id, status } }),
};
