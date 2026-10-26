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
  // 仅返回凭证的公开管理字段；列表不包含明文或密文 SK。
  list: (tenant_id: number) =>
    fetchAPI<TenantCredential[]>('/api/v1/admin/credential/list', {
      method: 'GET',
      params: { tenant_id },
    }),
};
