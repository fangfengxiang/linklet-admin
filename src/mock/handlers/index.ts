// Mock 处理器索引 —— 合并各资源处理器为单一路由表
import shortLink from './shortLink';
import tenant from './tenant';
import domain from './domain';
import scene from './scene';
import sceneConfig from './sceneConfig';
import credential from './credential';
import type { Handler } from '../store';

export type { Handler };

export const routes: Record<string, Handler> = {
  ...shortLink,
  ...tenant,
  ...domain,
  ...scene,
  ...sceneConfig,
  ...credential,
};
