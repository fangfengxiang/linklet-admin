// 租户管理 —— group_ids 授权集合（非所有权，去重）；停用阻止管理不影响解析
import { ModalForm, ProFormSelect, ProFormText, ProTable, type ActionType } from '@ant-design/pro-components';
import { Alert, Button, message, Popconfirm, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { group, tenant } from '@/services';
import { DomainError } from '@/services/typings';
import { ActiveStatusTag } from '@/components/StatusTag';
import type { Tenant } from '@/services/typings';
import { useRef, useState } from 'react';

export default function TenantPage() {
  const tableRef = useRef<ActionType>();
  const [listError, setListError] = useState<string>();
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
    <>
      {listError && <Alert type="error" showIcon message={listError} style={{ marginBottom: 16 }} />}
      <ProTable<Tenant>
        actionRef={tableRef}
        rowKey="id"
        headerTitle="租户管理（最多100条）"
        pagination={false}
        search={false}
        toolBarRender={() => [
          <ModalForm
            key="create"
            title="新建租户"
            trigger={<Button type="primary" icon={<PlusOutlined />}>新建租户</Button>}
            modalProps={{ destroyOnHidden: true }}
            onFinish={async (values) => {
              try {
                await tenant.create(values as { name: string });
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
          setListError(undefined);
          try {
            const data = await tenant.list();
            return { data, success: true };
          } catch (e) {
            message.error((e as DomainError).message);
            setListError((e as DomainError).message);
            return { data: [], success: false };
          }
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '名称', dataIndex: 'name' },
          {
            title: '授权分组', dataIndex: 'group_ids',
            render: (_, r) => r.group_ids?.length
              ? <Space wrap>{r.group_ids.map((id) => <Tag key={id}>{id}</Tag>)}</Space>
              : <span style={{ color: '#999' }}>无</span>,
          },
          { title: '状态', dataIndex: 'status', width: 90, render: (_, r) => <ActiveStatusTag status={r.status} /> },
          {
            title: '操作', width: 160, valueType: 'option',
            render: (_, row) => [
              <a key="grant" onClick={() => setGranting(row)}>授权</a>,
              <Popconfirm
                key="status"
                title={row.status === 1 ? '停用租户？' : '启用租户？'}
                description="停用拒绝该租户的业务 API，不影响平台配置或已有短链解析。"
                onConfirm={() => toggleStatus(row)}
              >
                <a style={{ color: row.status === 1 ? '#ff4d4f' : undefined }}>
                  {row.status === 1 ? '停用' : '启用'}
                </a>
              </Popconfirm>,
            ],
          },
        ]}
      />

      {/* 分组授权弹窗 —— 作为 ProTable 兄弟节点，确保受控 open 驱动 Modal 渲染。
          此前作为 ProTable 子节点时受控 open 不生效，授权弹窗无法打开。 */}
      <ModalForm
        open={!!granting}
        onOpenChange={(open) => { if (!open) setGranting(null); }}
        title="分组授权"
        modalProps={{ destroyOnHidden: true }}
        initialValues={granting ? { group_ids: granting.group_ids } : undefined}
        onFinish={async (values) => {
          if (!granting) return false;
          try {
            await tenant.grant(granting.id, [...new Set<number>(values.group_ids || [])]);
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
          name="group_ids"
          label="授权分组"
          mode="multiple"
          request={async () => {
            const list = await group.list();
            return list.map((g) => ({ label: `${g.group_id} ${g.name}`, value: g.group_id }));
          }}
          tooltip="留空可撤销全部分组授权"
        />
        <Alert
          type="info"
          showIcon
          message="同一分组可授权给多个租户共同管理其下短链；授权撤销不影响历史短链解析。"
          style={{ marginBottom: 16 }}
        />
      </ModalForm>
    </>
  );
}
