// Mock 内存状态机 + 统一响应封装（遵守领域不变量）
// In-memory mock state + unified response envelope (honors domain invariants).
// 单一数据来源：dev / 生产构建 / 演示站共用此处的 db 与 helper。
import type {
  DomainEntry,
  Group,
  GroupConfigItem,
  Tenant,
  TenantCredential,
  ShortLink,
  UnifiedResponse,
} from '@/services/typings';

/** 统一响应：成功 */
export function ok<T>(data: T): UnifiedResponse<T> {
  return { code: 0, message: 'success', data };
}

/** 统一响应：失败 */
export function fail(code: number, message: string): UnifiedResponse {
  return { code, message, data: null };
}

let seq = 100;
/** 自增 id */
export function nextId(): number {
  return ++seq;
}

let codeSeq = 1000;
/** 短码生成器（mock） */
export function genCode(): string {
  const n = ++codeSeq;
  return n.toString(36).toUpperCase().padStart(6, '0');
}

/** 处理器签名：纯函数 (query, body) => UnifiedResponse */
export type Handler = (query: Record<string, unknown>, body: unknown) => UnifiedResponse;

/** body 解包为字段表 */
export function fields(body: unknown): Record<string, unknown> {
  return (body || {}) as Record<string, unknown>;
}

/** 内存数据（初始种子） */
export const db: {
  domains: DomainEntry[];
  groups: Group[];
  groupConfigs: GroupConfigItem[];
  tenants: Tenant[];
  credentials: TenantCredential[];
  shortLinks: ShortLink[];
} = {
  domains: [
    { id: 1, domain: 's.example.com', tag: '主站', description: '主短链域名', status: 2, created_at: '2026-09-01T00:00:00Z', enabled_at: '2026-09-01T00:00:00Z' },
    { id: 2, domain: 'go.example.com', tag: '营销', description: '营销活动域名', status: 2, created_at: '2026-09-02T00:00:00Z', enabled_at: '2026-09-02T00:00:00Z' },
    { id: 3, domain: 'dev.example.com', tag: '测试', description: '测试域名', status: 1, created_at: '2026-10-01T00:00:00Z' },
  ],
  groups: [
    { id: 1, group_id: 1001, name: '主站默认分组', domain_entry_id: 1, status: 1, created_at: '2026-09-01T00:00:00Z' },
    { id: 2, group_id: 1002, name: '营销活动', domain_entry_id: 2, status: 1, created_at: '2026-09-15T00:00:00Z' },
  ],
  groupConfigs: [
    { id: 1, group_id: 1001, config_key: 'utm_default', config_value: 'utm_source=linklet', description: '默认UTM', created_at: '2026-09-01T00:00:00Z' },
  ],
  tenants: [
    { id: 1, name: '运营主体A', group_ids: [1001, 1002], status: 1, created_at: '2026-09-01T00:00:00Z' },
    { id: 2, name: '运营主体B', group_ids: [1001], status: 1, created_at: '2026-09-05T00:00:00Z' },
  ],
  credentials: [
    { id: 1, tenant_id: 1, access_key: 'AKL0001MOCK', description: '主凭证', status: 1, created_at: '2026-09-01T00:00:00Z' },
  ],
  shortLinks: [
    { id: 1, group_id: 1001, code: 'aB9xK2', target_url: 'https://example.com/page1', status: 1, created_at: '2026-09-10T00:00:00Z', expires_at: null },
    { id: 2, group_id: 1002, code: 'mK3pQ7', target_url: 'https://example.com/promo', status: 1, created_at: '2026-09-20T00:00:00Z', expires_at: '2026-12-31T23:59:59Z' },
    { id: 3, group_id: 1001, code: 'oPp2xR', target_url: 'https://example.com/old', status: 2, created_at: '2026-08-01T00:00:00Z', expires_at: null, disabled_at: '2026-09-01T00:00:00Z' },
  ],
};
