// 领域类型定义 + 领域错误 —— 对应 linklet 后端七表模型与 Admin API 契约
// Domain types + domain error — mirroring linklet backend 7-table model & Admin API contract

/** 通用状态：1 启用 / 2 停用；仅短链和凭证停用不可逆。 */
export type ActiveStatus = 1 | 2;

/** 域名状态：1 新增 → 2 投产 → 3 下线（不可逆） */
export type DomainStatus = 1 | 2 | 3;

/** 后端统一响应封装：成功 code=0，失败 code 为业务错误码 */
export interface UnifiedResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

/** 领域错误 —— 客户端按 code 分支 */
export class DomainError extends Error {
  code: number;
  httpStatus?: number;
  constructor(code: number, message: string, httpStatus?: number) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export interface DomainEntry {
  id: number;
  domain: string;
  tag?: string;
  description?: string;
  status: DomainStatus;
  created_at?: string;
  updated_at?: string;
  enabled_at?: string | null;
  disabled_at?: string | null;
}

export interface Group {
  id: number;
  group_id: number;
  name: string;
  domain_entry_id: number;
  status: ActiveStatus;
  has_links?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GroupConfigItem {
  id: number;
  group_id: number;
  config_key: string;
  config_value: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id: number;
  name: string;
  group_ids: number[];
  status: ActiveStatus;
  created_at?: string;
  updated_at?: string;
}

export interface TenantCredential {
  id: number;
  tenant_id: number;
  access_key: string;
  description?: string;
  status: ActiveStatus;
  created_at?: string;
  updated_at?: string;
  disabled_at?: string | null;
}

export interface ShortLink {
  id: number;
  group_id: number;
  code: string;
  target_url: string; // 创建后不可修改
  status: ActiveStatus;
  created_at?: string;
  expires_at?: string | null;
  disabled_at?: string | null;
}

/** 创建短链请求体 —— 业务 API（/api/v1/shorten/*），需租户 AK/SK 签名 */
export interface CreateShortLinkBody {
  target_url: string;
  group_id: number;
  expires_at?: string | null;
}

export interface CreateShortLinkResult {
  code: string;
  short_url?: string;
}

export interface CreateDomainEntryBody {
  domain: string;
  tag?: string;
  description?: string;
}

export interface CreateGroupBody {
  group_id: number;
  name: string;
  domain_entry_id: number;
}

export interface ConfigureGroupBody {
  domain_entry_id?: number;
  status?: ActiveStatus;
}

export interface SetGroupConfigBody {
  group_id: number;
  config_key: string;
  config_value: string;
  description?: string;
}

export interface GrantGroupsBody {
  id: number;
  group_ids: number[];
}

export interface CreateCredentialBody {
  tenant_id: number;
  access_key?: string;
  secret_key?: string;
}

export interface CreateCredentialResult {
  id: number;
  access_key: string;
  secret_key?: string; // 仅创建时返回明文
}
