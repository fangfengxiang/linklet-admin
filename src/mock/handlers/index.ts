// Mock 处理器索引 —— 合并各资源处理器为单一路由表
import shortLink from './shortLink';
import tenant from './tenant';
import domain from './domain';
import group from './group';
import groupConfig from './groupConfig';
import credential from './credential';
import type { Handler } from '../store';

export type { Handler };

export const routes: Record<string, Handler> = {
  ...shortLink,
  ...tenant,
  ...domain,
  ...group,
  ...groupConfig,
  ...credential,
};
