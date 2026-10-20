// 领域类型定义 + 领域错误 —— 对应 linklet 后端七表模型与 Admin API 契约
// Domain types + domain error — mirroring linklet backend 7-table model & Admin API contract

/** 通用状态：1 启用 / 2 停用（终端态，不可逆） */
export type ActiveStatus = 1 | 2;

/** 域名状态：1 新增 → 2 投产 → 3 下线（不可逆） */
export type DomainStatus = 1 | 2 | 3;

/** 后端统一响应封装 */
export interface UnifiedResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

/** 领域错误 —— 客户端按 code 分支 */
export class DomainError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
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

export interface Scene {
  id: number;
  scene_id: number;
  name: string;
  description?: string;
  domain_entry_id: number;
  status: ActiveStatus;
  created_at?: string;
  updated_at?: string;
}

export interface SceneConfigItem {
  id: number;
  scene_id: number;
  config_key: string;
  config_value: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id: number;
  name: string;
  scene_ids: number[];
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
  scene_id: number;
  code: string;
  dest_url: string; // 后端字段名为 dest_url，不可修改
  status: ActiveStatus;
  created_at?: string;
  expires_at?: string | null;
  disabled_at?: string | null;
}

/** 创建短链请求体 */
export interface CreateShortLinkBody {
  target_url: string;
  scene_id: number;
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

export interface CreateSceneBody {
  scene_id: number;
  name: string;
  domain_entry_id: number;
}

export interface ConfigureSceneBody {
  domain_entry_id?: number;
  status?: ActiveStatus;
  name?: string;
}

export interface SetSceneConfigBody {
  scene_id: number;
  config_key: string;
  config_value: string;
  description?: string;
}

export interface GrantScenesBody {
  id: number;
  scene_ids: number[];
}

export interface CreateCredentialBody {
  tenant_id: number;
  access_key?: string;
  secret_key?: string;
  description?: string;
}

export interface CreateCredentialResult {
  id: number;
  access_key: string;
  secret_key?: string; // 仅创建时返回明文
}
