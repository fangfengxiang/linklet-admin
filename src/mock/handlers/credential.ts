// TenantCredential 处理器 —— SK 仅创建时返回明文；停用不可逆；AK 不复用
import { db, ok, fail, nextId, fields, type Handler } from '../store';

const handlers: Record<string, Handler> = {
  'GET /api/v1/admin/credential/list': (q) => {
    const tenant_id = Number(q.tenant_id);
    return ok(db.credentials.filter((c) => c.tenant_id === tenant_id));
  },
  'POST /api/v1/admin/credential/create': (_q, body) => {
    const { tenant_id, access_key, description } = fields(body);
    if (!tenant_id) return fail(4000, 'tenant_id is required');
    const ak = (access_key as string) || `AK${Date.now().toString(36).toUpperCase()}`;
    const sk = `SK${Math.random().toString(36).slice(2, 14).toUpperCase()}`;
    const row = {
      id: nextId(),
      tenant_id: tenant_id as number,
      access_key: ak,
      description: description as string,
      status: 1 as const,
      created_at: new Date().toISOString(),
    };
    db.credentials.push(row);
    return ok({ ...row, secret_key: sk });
  },
  'PUT /api/v1/admin/credential/disable': (_q, body) => {
    const { access_key } = fields(body);
    const row = db.credentials.find((c) => c.access_key === access_key);
    if (!row || row.status === 2) return fail(409, 'credential not found or already disabled');
    row.status = 2;
    row.disabled_at = new Date().toISOString();
    return ok({ access_key, status: 'disabled' });
  },
};
export default handlers;
