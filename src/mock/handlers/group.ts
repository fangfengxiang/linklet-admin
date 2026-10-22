// Group 处理器 —— group_id 不可改；可改绑域名；停用不影响已有短链
import { db, ok, fail, nextId, fields, type Handler } from '../store';

const handlers: Record<string, Handler> = {
  'GET /api/v1/admin/group/list': (q) => {
    const tid = q.tenant_id;
    if (tid) {
      const t = db.tenants.find((x) => x.id === Number(tid));
      const ids = t ? t.group_ids : [];
      return ok(db.groups.filter((g) => ids.includes(g.group_id)));
    }
    return ok(db.groups);
  },
  'POST /api/v1/admin/group/create': (_q, body) => {
    const { group_id, name, domain_entry_id } = fields(body);
    if (!group_id || !name || !domain_entry_id) return fail(4000, 'invalid parameters');
    if (db.groups.some((g) => g.group_id === group_id)) return fail(409, 'group_id exists');
    const row = {
      id: nextId(),
      group_id: group_id as number,
      name: name as string,
      domain_entry_id: domain_entry_id as number,
      status: 1 as const,
      created_at: new Date().toISOString(),
    };
    db.groups.push(row);
    return ok(row);
  },
  'PUT /api/v1/admin/group/configure': (_q, body) => {
    const { group_id, domain_entry_id, status, name } = fields(body);
    const row = db.groups.find((g) => g.group_id === group_id);
    if (!row) return fail(409, 'group not found');
    if (domain_entry_id !== undefined) {
      const dom = db.domains.find((d) => d.id === domain_entry_id);
      if (!dom || dom.status !== 2) return fail(4009, 'domain not deployed or not found');
      row.domain_entry_id = domain_entry_id as number;
    }
    if (status !== undefined) row.status = status as 1 | 2;
    if (name !== undefined) row.name = name as string;
    return ok(row);
  },
};
export default handlers;
