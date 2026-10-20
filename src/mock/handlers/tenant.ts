// Tenant 处理器 —— scene_ids 授权集合（去重）；停用阻止管理不影响解析
import { db, ok, fail, nextId, fields, type Handler } from '../store';

const handlers: Record<string, Handler> = {
  'GET /api/v1/admin/tenant/list': () => ok(db.tenants),
  'POST /api/v1/admin/tenant/create': (_q, body) => {
    const { name } = fields(body);
    if (!name) return fail(4000, 'name is required');
    const row = {
      id: nextId(),
      name: name as string,
      scene_ids: [] as number[],
      status: 1 as const,
      created_at: new Date().toISOString(),
    };
    db.tenants.push(row);
    return ok(row);
  },
  'PUT /api/v1/admin/tenant/grant': (_q, body) => {
    const { id, scene_ids } = fields(body);
    const row = db.tenants.find((t) => t.id === id);
    if (!row) return fail(409, 'tenant not found');
    row.scene_ids = Array.from(new Set((scene_ids as number[]) || [])).filter((sid) =>
      db.scenes.some((s) => s.scene_id === sid),
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
