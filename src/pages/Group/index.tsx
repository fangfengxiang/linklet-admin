// 分组管理 —— 业务编号不可改；已有短链后冻结域名绑定。
import { ModalForm, ProForm, ProFormDigit, ProFormSelect, ProFormText, ProTable, type ActionType } from '@ant-design/pro-components';
import { Button, message, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { domainEntry, group } from '@/services';
import { DomainError } from '@/services/typings';
import { ActiveStatusTag } from '@/components/StatusTag';
import type { ConfigureGroupBody, CreateGroupBody, DomainEntry, Group } from '@/services/typings';
import { useRef, useState } from 'react';

type GroupRow = Group & { domain?: string };

export default function GroupPage() {
  const tableRef = useRef<ActionType>();
  const [listError, setListError] = useState<string>();
  const refresh = () => tableRef.current?.reload();
  const [editing, setEditing] = useState<Group | null>(null);

  return (
    <>
      {listError && <Alert type="error" showIcon message={listError} style={{ marginBottom: 16 }} />}
      <ProTable<GroupRow>
        actionRef={tableRef}
        rowKey="id"
        headerTitle="分组管理（最多100条）"
        pagination={false}
        search={false}
        toolBarRender={() => [
          <ModalForm
            key="create"
            title="新建分组"
            trigger={<Button type="primary" icon={<PlusOutlined />}>新建分组</Button>}
            modalProps={{ destroyOnHidden: true }}
            onFinish={async (values) => {
              try {
                await group.create(values as CreateGroupBody);
                message.success('创建成功');
                refresh();
                return true;
              } catch (e) {
                message.error((e as DomainError).message);
                return false;
              }
            }}
          >
            <ProFormDigit name="group_id" label="分组编号" min={1} max={4294967295} rules={[{ required: true }]} />
            <ProFormText name="name" label="分组名称" rules={[{ required: true, max: 255 }]} />
            <DomainSelect />
          </ModalForm>,
        ]}
        request={async () => {
          setListError(undefined);
          try {
            const [groups, domains] = await Promise.all([group.list(), domainEntry.list()]);
            const domainsById = new Map(domains.map((domain) => [domain.id, domain.domain]));
            const data = groups.map((item) => ({ ...item, domain: domainsById.get(item.domain_entry_id) }));
            return { data, success: true };
          } catch (e) {
            message.error((e as DomainError).message);
            setListError((e as DomainError).message);
            return { data: [], success: false };
          }
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '分组编号', dataIndex: 'group_id' },
          { title: '名称', dataIndex: 'name' },
          { title: '绑定域名', dataIndex: 'domain', ellipsis: true, render: (_, row) => row.domain || '域名不可用' },
          { title: '状态', dataIndex: 'status', width: 90, render: (_, r) => <ActiveStatusTag status={r.status} /> },
          {
            title: '操作', width: 100, valueType: 'option',
            render: (_, row) => [<a key="edit" onClick={() => setEditing(row)}>配置</a>],
          },
        ]}
      />
      {/* 配置弹窗：作为 ProTable 的兄弟节点，确保受控 open 状态能正确驱动 Modal 渲染。
          此前作为 ProTable 子节点时，受控 open 不会透传到 antd Modal，弹窗无法打开。 */}
      <ModalForm
        title="分组配置"
        open={!!editing}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        modalProps={{ destroyOnHidden: true }}
        initialValues={editing ?? undefined}
        onFinish={async (values) => {
          if (!editing) return false;
          try {
            const body: ConfigureGroupBody = { domain_entry_id: values.domain_entry_id, status: values.status };
            await group.configure(editing.group_id, body);
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
          <ProFormText name="group_id" label="分组编号" disabled tooltip="分组编号创建后不可修改" />
          <ProFormText name="name" label="分组名称" disabled tooltip="当前接口不支持修改分组名称" />
        </ProForm.Group>
        <ProForm.Group>
          <DomainSelect disabled={editing?.has_links === true} />
          <ProFormSelect
            name="status"
            label="状态"
            options={[{ label: '启用', value: 1 }, { label: '停用', value: 2 }]}
          />
        </ProForm.Group>
        <Alert
          type="info"
          showIcon
          message={editing?.has_links
            ? '本分组已创建短链，域名绑定已冻结；停用或过期的短链也会保留绑定。'
            : '仅无短链的分组可改绑域名。停用分组只阻止创建，不影响已有短链跳转。'}
          style={{ marginBottom: 16 }}
        />
      </ModalForm>
    </>
  );
}

/** 域名选择器：仅列出已投产域名 */
function DomainSelect({ disabled = false }: { disabled?: boolean }) {
  return (
    <ProFormSelect
      name="domain_entry_id"
      label="绑定域名"
      disabled={disabled}
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
