// 分组 API Client —— 对应后端 /api/v1/admin/group/*
import { fetchAPI } from './request';
import type { ConfigureGroupBody, CreateGroupBody, Group } from './typings';

export const group = {
  create: (body: CreateGroupBody) =>
    fetchAPI<Group>('/api/v1/admin/group/create', { method: 'POST', data: body }),
  list: (tenant_id?: number) =>
    fetchAPI<Group[]>('/api/v1/admin/group/list', {
      method: 'GET',
      params: tenant_id === undefined ? undefined : { tenant_id },
    }),
  configure: (group_id: number, body: ConfigureGroupBody) =>
    fetchAPI<Group>('/api/v1/admin/group/configure', { method: 'PUT', data: { group_id, domain_entry_id: body.domain_entry_id, status: body.status } }),
};
