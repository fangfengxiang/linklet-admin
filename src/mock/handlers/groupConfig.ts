// GroupConfig 处理器 —— (group_id, config_key) 唯一
import { db, ok, fail, nextId, fields, type Handler } from '../store';

const handlers: Record<string, Handler> = {
  'GET /api/v1/admin/group_config/list': (q) => {
    const group_id = Number(q.group_id);
    return ok(db.groupConfigs.filter((c) => c.group_id === group_id));
  },
  'PUT /api/v1/admin/group_config/set': (_q, body) => {
    const { group_id, config_key, config_value, description } = fields(body);
    if (!group_id || !config_key || config_value === undefined)
      return fail(4000, 'invalid parameters');
    let row = db.groupConfigs.find(
      (c) => c.group_id === group_id && c.config_key === config_key,
    );
    if (row) {
      row.config_value = config_value as string;
      if (description !== undefined) row.description = description as string;
    } else {
      row = {
        id: nextId(),
        group_id: group_id as number,
        config_key: config_key as string,
        config_value: config_value as string,
        description: description as string,
        created_at: new Date().toISOString(),
      };
      db.groupConfigs.push(row);
    }
    return ok(row);
  },
  'DELETE /api/v1/admin/group_config/delete': (_q, body) => {
    const { group_id, config_key } = fields(body);
    const idx = db.groupConfigs.findIndex(
      (c) => c.group_id === group_id && c.config_key === config_key,
    );
    if (idx < 0) return fail(409, 'config not found');
    db.groupConfigs.splice(idx, 1);
    return ok({ group_id, config_key });
  },
};
export default handlers;
