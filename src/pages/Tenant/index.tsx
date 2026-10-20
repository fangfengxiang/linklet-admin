// 租户管理 —— scene_ids 授权集合（非所有权，去重）；停用阻止管理不影响解析
import { ModalForm, ProFormSelect, ProFormText, ProTable } from '@ant-design/pro-components';
import { Alert, Button, message, Popconfirm, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { scene, tenant } from '@/services';
import { DomainError } from '@/services/typings';
import { ActiveStatusTag } from '@/components/StatusTag';
import type { Tenant } from '@/services/typings';
import { useRef, useState } from 'react';

export default function TenantPage() {
  const tableRef = useRef<any>();
  const refresh = () => tableRef.current?.reload();
  const [granting, setGranting] = useState<Tenant | null>(null);

  const toggleStatus = async (row: Tenant) => {
    try {
      await tenant.setStatus(row.id, row.status === 1 ? 2 : 1);
      message.success('状态已更新');
      refresh();
    } catch (e) {
      message.error((e as DomainError).message);
    }
  };

  return (
    <ProTable<Tenant>
      actionRef={tableRef}
      rowKey="id"
      headerTitle="租户管理"
      search={false}
      toolBarRender={() => [
        <ModalForm
          key="create"
          title="新建租户"
          trigger={<Button type="primary" icon={<PlusOutlined />}>新建租户</Button>}
          modalProps={{ destroyOnClose: true }}
          onFinish={async (values) => {
            try {
              await tenant.create(values as any);
              message.success('创建成功');
              refresh();
              return true;
            } catch (e) {
              message.error((e as DomainError).message);
              return false;
            }
          }}
        >
          <ProFormText name="name" label="租户名称" rules={[{ required: true, max: 255 }]} />
        </ModalForm>,
      ]}
      request={async () => {
        try {
          const data = await tenant.list();
          return { data, success: true };
        } catch (e) {
          message.error((e as DomainError).message);
          return { data: [], success: false };
        }
      }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '名称', dataIndex: 'name' },
        {
          title: '授权场景', dataIndex: 'scene_ids',
          render: (_, r) => r.scene_ids?.length
            ? <Space wrap>{r.scene_ids.map((id) => <Tag key={id}>{id}</Tag>)}</Space>
            : <span style={{ color: '#999' }}>无</span>,
        },
        { title: '状态', dataIndex: 'status', width: 90, render: (_, r) => <ActiveStatusTag status={r.status} /> },
        {
          title: '操作', width: 160, valueType: 'option',
          render: (_, row) => [
            row.status === 1 ? (
              <a key="grant" onClick={() => setGranting(row)}>授权</a>
            ) : (
              <span key="grant" style={{ color: '#999' }} title="租户已停用，管理 API 不可用">
                授权
              </span>
            ),
            <Popconfirm
              key="status"
              title={row.status === 1 ? '停用租户？' : '启用租户？'}
              description="停用阻止管理 API，不影响已有短链解析。"
              onConfirm={() => toggleStatus(row)}
            >
              <a style={{ color: row.status === 1 ? '#ff4d4f' : undefined }}>
                {row.status === 1 ? '停用' : '启用'}
              </a>
            </Popconfirm>,
          ],
        },
      ]}
    >
      <ModalForm
        open={!!granting}
        onOpenChange={(open) => { if (!open) setGranting(null); }}
        title="场景授权"
        modalProps={{ destroyOnClose: true }}
        initialValues={granting ? { scene_ids: granting.scene_ids } : undefined}
        onFinish={async (values) => {
          if (!granting) return false;
          try {
            await tenant.grant(granting.id, values.scene_ids || []);
            message.success('授权已更新');
            refresh();
            return true;
          } catch (e) {
            message.error((e as DomainError).message);
            return false;
          }
        }}
      >
        <ProFormSelect
          name="scene_ids"
          label="授权场景"
          mode="multiple"
          request={async () => {
            const list = await scene.list();
            return list.map((s) => ({ label: `${s.scene_id} ${s.name}`, value: s.scene_id }));
          }}
          rules={[{ required: true }]}
        />
        <Alert
          type="info"
          showIcon
          message="同一场景可授权给多个租户共同管理其下短链；授权撤销不影响历史短链解析。"
          style={{ marginBottom: 16 }}
        />
      </ModalForm>
    </ProTable>
  );
}
