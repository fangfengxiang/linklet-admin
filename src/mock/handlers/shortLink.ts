// ShortLink 处理器 —— target_url 不可改、code 不复用、停用不可逆、expires_at null=不过期
import { db, ok, fail, genCode, nextId, fields, type Handler } from '../store';

const handlers: Record<string, Handler> = {
  'GET /api/v1/shorten/list': () => ok(db.shortLinks),
  'GET /api/v1/shorten/get': (q) => {
    const row = db.shortLinks.find((l) => l.code === q.code);
    return row ? ok(row) : fail(4006, 'link not found');
  },
  'POST /api/v1/shorten/create': (_q, body) => {
    const { target_url, scene_id, expires_at } = fields(body);
    if (!target_url) return fail(4001, 'target_url is required');
    if (!scene_id) return fail(4002, 'scene_id is required');
    const code = genCode();
    db.shortLinks.push({
      id: nextId(),
      scene_id: scene_id as number,
      code,
      dest_url: target_url as string,
      status: 1 as const,
      created_at: new Date().toISOString(),
      expires_at: (expires_at as string) || null,
    });
    return ok({ code });
  },
  'POST /api/v1/shorten/gen': (_q, body) => {
    const { target_url, scene_id, expires_at } = fields(body);
    if (!target_url) return fail(4001, 'target_url is required');
    if (!scene_id) return fail(4002, 'scene_id is required');
    const sc = db.scenes.find((s) => s.scene_id === scene_id);
    if (!sc) return fail(4003, 'scene not found');
    const dom = db.domains.find((d) => d.id === sc.domain_entry_id);
    if (!dom) return fail(4005, 'domain not configured for scene');
    const code = genCode();
    db.shortLinks.push({
      id: nextId(),
      scene_id: scene_id as number,
      code,
      dest_url: target_url as string,
      status: 1 as const,
      created_at: new Date().toISOString(),
      expires_at: (expires_at as string) || null,
    });
    return ok({ code, short_url: `https://${dom.domain}/${code}` });
  },
  'PUT /api/v1/shorten/disable': (_q, body) => {
    const { code } = fields(body);
    if (!code) return fail(4001, 'code is required');
    const row = db.shortLinks.find((l) => l.code === code);
    if (!row || row.status === 2) return fail(4006, 'link not found or already disabled');
    row.status = 2;
    row.disabled_at = new Date().toISOString();
    return ok({ code, status: 'disabled' });
  },
};
export default handlers;
