// 场景 API Client —— 对应后端 /api/v1/admin/scene/*
import { fetchAPI } from './request';
import type { ConfigureSceneBody, CreateSceneBody, Scene } from './typings';

export const scene = {
  create: (body: CreateSceneBody) =>
    fetchAPI<Scene>('/api/v1/admin/scene/create', { method: 'POST', data: body }),
  list: (tenant_id?: number) =>
    fetchAPI<Scene[]>('/api/v1/admin/scene/list', {
      method: 'GET',
      params: tenant_id ? { tenant_id } : undefined,
    }),
  configure: (scene_id: number, body: ConfigureSceneBody) =>
    fetchAPI<Scene>('/api/v1/admin/scene/configure', { method: 'PUT', data: { scene_id, ...body } }),
};
