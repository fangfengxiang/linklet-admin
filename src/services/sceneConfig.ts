// 场景配置 API Client —— 对应后端 /api/v1/admin/scene_config/*
import { fetchAPI } from './request';
import type { SceneConfigItem, SetSceneConfigBody } from './typings';

export const sceneConfig = {
  list: (scene_id: number) =>
    fetchAPI<SceneConfigItem[]>('/api/v1/admin/scene_config/list', {
      method: 'GET',
      params: { scene_id },
    }),
  set: (body: SetSceneConfigBody) =>
    fetchAPI<SceneConfigItem>('/api/v1/admin/scene_config/set', { method: 'PUT', data: body }),
  delete: (scene_id: number, config_key: string) =>
    fetchAPI<{ scene_id: number; config_key: string }>('/api/v1/admin/scene_config/delete', {
      method: 'DELETE',
      data: { scene_id, config_key },
    }),
};
