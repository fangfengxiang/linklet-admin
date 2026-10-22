// DomainEntry 处理器 —— 状态 new→deployed→offline 不可逆；有 Group 绑定不可下线
import { db, ok, fail, nextId, fields, type Handler } from '../store';

const handlers: Record<string, Handler> = {
  'GET /api/v1/admin/domain/list': () => ok(db.domains),
  'POST /api/v1/admin/domain/create': (_q, body) => {
    const { domain, tag, description } = fields(body);
    if (!domain || (domain as string).length > 255) return fail(4000, 'invalid domain');
    if (db.domains.some((d) => d.domain === domain)) return fail(4000, 'domain exists');
    const row = {
      id: nextId(),
      domain: domain as string,
      tag: tag as string,
      description: description as string,
      status: 1 as const,
      created_at: new Date().toISOString(),
    };
    db.domains.push(row);
    return ok(row);
  },
  'PUT /api/v1/admin/domain/deploy': (_q, body) => {
    const { id } = fields(body);
    const row = db.domains.find((d) => d.id === id);
    if (!row) return fail(409, 'resource missing or state conflict');
    if (row.status !== 1) return fail(409, 'domain must be new to deploy');
    row.status = 2;
    row.enabled_at = new Date().toISOString();
    return ok(row);
  },
  'PUT /api/v1/admin/domain/disable': (_q, body) => {
    const { id } = fields(body);
    const row = db.domains.find((d) => d.id === id);
    if (!row) return fail(409, 'resource missing or state conflict');
    if (row.status !== 2) return fail(409, 'domain must be deployed to offline');
    const bound = db.groups.some((g) => g.domain_entry_id === id && g.status === 1);
    if (bound) return fail(409, 'domain is still bound to active groups');
    row.status = 3;
    row.disabled_at = new Date().toISOString();
    return ok(row);
  },
};
export default handlers;
