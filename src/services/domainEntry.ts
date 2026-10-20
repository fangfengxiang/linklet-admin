// 域名资源 API Client —— 对应后端 /api/v1/admin/domain/*
import { fetchAPI } from './request';
import type { CreateDomainEntryBody, DomainEntry } from './typings';

export const domainEntry = {
  create: (body: CreateDomainEntryBody) =>
    fetchAPI<DomainEntry>('/api/v1/admin/domain/create', { method: 'POST', data: body }),
  list: () => fetchAPI<DomainEntry[]>('/api/v1/admin/domain/list', { method: 'GET' }),
  deploy: (id: number) =>
    fetchAPI<DomainEntry>('/api/v1/admin/domain/deploy', { method: 'PUT', data: { id } }),
  disable: (id: number) =>
    fetchAPI<DomainEntry>('/api/v1/admin/domain/disable', { method: 'PUT', data: { id } }),
};
