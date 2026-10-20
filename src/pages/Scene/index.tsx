// 场景管理 —— scene_id 不可改；可改绑域名；停用不影响已有短链
import { ModalForm, ProForm, ProFormDigit, ProFormSelect, ProFormText, ProTable } from '@ant-design/pro-components';
import { Button, message, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { domainEntry, scene } from '@/services';
import { DomainError } from '@/services/typings';
import { ActiveStatusTag } from '@/components/StatusTag';
import type { DomainEntry, Scene } from '@/services/typings';
import { useRef, useState } from 'react';

export default function ScenePage() {
  const tableRef = useRef<any>();
  const refresh = () => tableRef.current?.reload();
  const [editing, setEditing] = useState<Scene | null>(null);

  return (
    <ProTable<Scene>
      actionRef={tableRef}
      rowKey="id"
      headerTitle="场景管理"
      search={false}
      toolBarRender={() => [
        <ModalForm
          key="create"
          title="新建场景"
          trigger={<Button type="primary" icon={<PlusOutlined />}>新建场景</Button>}
          modalProps={{ destroyOnClose: true }}
          onFinish={async (values) => {
            try {
              await scene.create(values as any);
              message.success('创建成功');
              refresh();
              return true;
            } catch (e) {
              message.error((e as DomainError).message);
              return false;
            }
          }}
        >
          <ProFormDigit name="scene_id" label="场景编号" min={1} max={4294967295} rules={[{ required: true }]} />
          <ProFormText name="name" label="场景名称" rules={[{ required: true, max: 255 }]} />
          <DomainSelect />
        </ModalForm>,
      ]}
      request={async () => {
        try {
          const data = await scene.list();
          return { data, success: true };
        } catch (e) {
          message.error((e as DomainError).message);
          return { data: [], success: false };
        }
      }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '场景编号', dataIndex: 'scene_id' },
        { title: '名称', dataIndex: 'name' },
        { title: '域名ID', dataIndex: 'domain_entry_id' },
        { title: '状态', dataIndex: 'status', width: 90, render: (_, r) => <ActiveStatusTag status={r.status} /> },
        {
          title: '操作', width: 100, valueType: 'option',
          render: (_, row) => [<a key="edit" onClick={() => setEditing(row)}>配置</a>],
        },
      ]}
    >
      <ModalForm
        open={!!editing}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        title="场景配置"
        modalProps={{ destroyOnClose: true }}
        initialValues={editing ?? undefined}
        onFinish={async (values) => {
          if (!editing) return false;
          try {
            await scene.configure(editing.scene_id, values as any);
            message.success('配置已更新');
            refresh();
            return true;
          } catch (e) {
            message.error((e as DomainError).message);
            return false;
          }
        }}
      >
        <ProForm.Group>
          <ProFormText name="scene_id" label="场景编号" disabled tooltip="场景编号创建后不可修改" />
          <ProFormText name="name" label="场景名称" rules={[{ max: 255 }]} />
        </ProForm.Group>
        <ProForm.Group>
          <DomainSelect />
          <ProFormSelect
            name="status"
            label="状态"
            options={[{ label: '启用', value: 1 }, { label: '停用', value: 2 }]}
          />
        </ProForm.Group>
        <Alert
          type="info"
          showIcon
          message="停用场景不影响已有短链的解析跳转，仅阻止在该场景下创建新短链。"
          style={{ marginBottom: 16 }}
        />
      </ModalForm>
    </ProTable>
  );
}

/** 域名选择器：仅列出已投产域名 */
function DomainSelect() {
  return (
    <ProFormSelect
      name="domain_entry_id"
      label="绑定域名"
      request={async () => {
        const list = await domainEntry.list();
        return list
          .filter((d: DomainEntry) => d.status === 2)
          .map((d) => ({ label: d.domain, value: d.id }));
      }}
      rules={[{ required: true }]}
    />
  );
}
