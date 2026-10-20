// 凭证 API Client —— 对应后端 /api/v1/admin/credential/*
import { fetchAPI } from './request';
import type { CreateCredentialBody, CreateCredentialResult, TenantCredential } from './typings';

export const credential = {
  create: (body: CreateCredentialBody) =>
    fetchAPI<CreateCredentialResult>('/api/v1/admin/credential/create', {
      method: 'POST',
      data: body,
    }),
  disable: (access_key: string) =>
    fetchAPI<{ access_key: string; status: string }>('/api/v1/admin/credential/disable', {
      method: 'PUT',
      data: { access_key },
    }),
  // 列表：后端无独立 credential/list，按租户列出由 tenant/list 间接获得；
  // 此处保留按 tenant_id 查询的客户端约定，后端补全后直接生效
  list: (tenant_id: number) =>
    fetchAPI<TenantCredential[]>('/api/v1/admin/credential/list', {
      method: 'GET',
      params: { tenant_id },
    }),
};
