// 状态标签组件 —— 统一呈现域名状态与启停状态
import { Tag } from 'antd';
import type { ActiveStatus, DomainStatus } from '@/services/typings';

const DOMAIN_STATUS_MAP: Record<DomainStatus, { text: string; color: string }> = {
  1: { text: '新增', color: 'default' },
  2: { text: '投产', color: 'success' },
  3: { text: '下线', color: 'error' },
};

const ACTIVE_STATUS_MAP: Record<ActiveStatus, { text: string; color: string }> = {
  1: { text: '启用', color: 'success' },
  2: { text: '停用', color: 'error' },
};

export function DomainStatusTag({ status }: { status: DomainStatus }) {
  const m = DOMAIN_STATUS_MAP[status];
  return <Tag color={m.color}>{m.text}</Tag>;
}

export function ActiveStatusTag({ status }: { status: ActiveStatus }) {
  const m = ACTIVE_STATUS_MAP[status];
  return <Tag color={m.color}>{m.text}</Tag>;
}
