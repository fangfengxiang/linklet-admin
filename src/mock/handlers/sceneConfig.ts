// SceneConfig 处理器 —— (scene_id, config_key) 唯一
import { db, ok, fail, nextId, fields, type Handler } from '../store';

const handlers: Record<string, Handler> = {
  'GET /api/v1/admin/scene_config/list': (q) => {
    const scene_id = Number(q.scene_id);
    return ok(db.sceneConfigs.filter((c) => c.scene_id === scene_id));
  },
  'PUT /api/v1/admin/scene_config/set': (_q, body) => {
    const { scene_id, config_key, config_value, description } = fields(body);
    if (!scene_id || !config_key || config_value === undefined)
      return fail(4000, 'invalid parameters');
    let row = db.sceneConfigs.find(
      (c) => c.scene_id === scene_id && c.config_key === config_key,
    );
    if (row) {
      row.config_value = config_value as string;
      if (description !== undefined) row.description = description as string;
    } else {
      row = {
        id: nextId(),
        scene_id: scene_id as number,
        config_key: config_key as string,
        config_value: config_value as string,
        description: description as string,
        created_at: new Date().toISOString(),
      };
      db.sceneConfigs.push(row);
    }
    return ok(row);
  },
  'DELETE /api/v1/admin/scene_config/delete': (_q, body) => {
    const { scene_id, config_key } = fields(body);
    const idx = db.sceneConfigs.findIndex(
      (c) => c.scene_id === scene_id && c.config_key === config_key,
    );
    if (idx < 0) return fail(409, 'config not found');
    db.sceneConfigs.splice(idx, 1);
    return ok({ scene_id, config_key });
  },
};
export default handlers;
