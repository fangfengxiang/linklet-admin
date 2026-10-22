// Tenant 处理器 —— group_ids 授权集合（去重）；停用阻止管理不影响解析
import { db, ok, fail, nextId, fields, type Handler } from '../store';

const handlers: Record<string, Handler> = {
  'GET /api/v1/admin/tenant/list': () => ok(db.tenants),
  'POST /api/v1/admin/tenant/create': (_q, body) => {
    const { name } = fields(body);
    if (!name) return fail(4000, 'name is required');
    const row = {
      id: nextId(),
      name: name as string,
      group_ids: [] as number[],
      status: 1 as const,
      created_at: new Date().toISOString(),
    };
    db.tenants.push(row);
    return ok(row);
  },
  'PUT /api/v1/admin/tenant/grant': (_q, body) => {
    const { id, group_ids } = fields(body);
    const row = db.tenants.find((t) => t.id === id);
    if (!row) return fail(409, 'tenant not found');
    row.group_ids = Array.from(new Set((group_ids as number[]) || [])).filter((gid) =>
      db.groups.some((g) => g.group_id === gid),
    );
    return ok(row);
  },
  'PUT /api/v1/admin/tenant/status': (_q, body) => {
    const { id, status } = fields(body);
    const row = db.tenants.find((t) => t.id === id);
    if (!row) return fail(409, 'tenant not found');
    row.status = status as 1 | 2;
    return ok(row);
  },
};
export default handlers;
