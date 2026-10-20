// Scene 处理器 —— scene_id 不可改；可改绑域名；停用不影响已有短链
import { db, ok, fail, nextId, fields, type Handler } from '../store';

const handlers: Record<string, Handler> = {
  'GET /api/v1/admin/scene/list': (q) => {
    const tid = q.tenant_id;
    if (tid) {
      const t = db.tenants.find((x) => x.id === Number(tid));
      const ids = t ? t.scene_ids : [];
      return ok(db.scenes.filter((s) => ids.includes(s.scene_id)));
    }
    return ok(db.scenes);
  },
  'POST /api/v1/admin/scene/create': (_q, body) => {
    const { scene_id, name, domain_entry_id } = fields(body);
    if (!scene_id || !name || !domain_entry_id) return fail(4000, 'invalid parameters');
    if (db.scenes.some((s) => s.scene_id === scene_id)) return fail(409, 'scene_id exists');
    const row = {
      id: nextId(),
      scene_id: scene_id as number,
      name: name as string,
      domain_entry_id: domain_entry_id as number,
      status: 1 as const,
      created_at: new Date().toISOString(),
    };
    db.scenes.push(row);
    return ok(row);
  },
  'PUT /api/v1/admin/scene/configure': (_q, body) => {
    const { scene_id, domain_entry_id, status, name } = fields(body);
    const row = db.scenes.find((s) => s.scene_id === scene_id);
    if (!row) return fail(409, 'scene not found');
    if (domain_entry_id !== undefined) row.domain_entry_id = domain_entry_id as number;
    if (status !== undefined) row.status = status as 1 | 2;
    if (name !== undefined) row.name = name as string;
    return ok(row);
  },
};
export default handlers;
