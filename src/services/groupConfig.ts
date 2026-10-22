// 分组配置 API Client —— 对应后端 /api/v1/admin/group_config/*
import { fetchAPI } from './request';
import type { GroupConfigItem, SetGroupConfigBody } from './typings';

export const groupConfig = {
  list: (group_id: number) =>
    fetchAPI<GroupConfigItem[]>('/api/v1/admin/group_config/list', {
      method: 'GET',
      params: { group_id },
    }),
  set: (body: SetGroupConfigBody) =>
    fetchAPI<GroupConfigItem>('/api/v1/admin/group_config/set', { method: 'PUT', data: body }),
  delete: (group_id: number, config_key: string) =>
    fetchAPI<{ group_id: number; config_key: string }>('/api/v1/admin/group_config/delete', {
      method: 'DELETE',
      data: { group_id, config_key },
    }),
};
