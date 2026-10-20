// 域名资源管理 —— 状态 new(1)→deployed(2)→offline(3) 不可逆；有 Scene 绑定不可下线
import { ModalForm, ProFormTextArea, ProFormText, ProTable } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { domainEntry } from '@/services';
import { DomainError } from '@/services/typings';
import { DomainStatusTag } from '@/components/StatusTag';
import type { DomainEntry } from '@/services/typings';
import { useRef } from 'react';

export default function DomainEntryPage() {
  const tableRef = useRef<any>();

  const refresh = () => tableRef.current?.reload();

  const handleDeploy = async (row: DomainEntry) => {
    try {
      await domainEntry.deploy(row.id);
      message.success('已投产');
      refresh();
    } catch (e) {
      message.error((e as DomainError).message);
    }
  };

  const handleDisable = async (row: DomainEntry) => {
    try {
      await domainEntry.disable(row.id);
      message.success('已下线');
      refresh();
    } catch (e) {
      // 后端 409：domain is still bound to active scenes
      message.error((e as DomainError).message);
    }
  };

  return (
    <ProTable<DomainEntry>
      actionRef={tableRef}
      rowKey="id"
      headerTitle="域名资源"
      search={false}
      toolBarRender={() => [
        <ModalForm
          key="create"
          title="新建域名"
          trigger={<Button type="primary" icon={<PlusOutlined />}>新建域名</Button>}
          modalProps={{ destroyOnClose: true }}
          onFinish={async (values) => {
            try {
              await domainEntry.create(values as any);
              message.success('创建成功');
              refresh();
              return true;
            } catch (e) {
              message.error((e as DomainError).message);
              return false;
            }
          }}
        >
          <ProFormText name="domain" label="域名" placeholder="s.example.com" rules={[{ required: true, max: 255 }]} />
          <ProFormText name="tag" label="标签" placeholder="分类标签" rules={[{ max: 100 }]} />
          <ProFormTextArea name="description" label="说明" rules={[{ max: 4096 }]} />
        </ModalForm>,
      ]}
      request={async () => {
        try {
          const data = await domainEntry.list();
          return { data, success: true };
        } catch (e) {
          message.error((e as DomainError).message);
          return { data: [], success: false };
        }
      }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '域名', dataIndex: 'domain' },
        { title: '标签', dataIndex: 'tag' },
        { title: '说明', dataIndex: 'description', ellipsis: true },
        { title: '状态', dataIndex: 'status', width: 90, render: (_, r) => <DomainStatusTag status={r.status} /> },
        { title: '投产时间', dataIndex: 'enabled_at' },
        {
          title: '操作', width: 160, valueType: 'option',
          render: (_, row) => {
            // 状态不可逆：仅前进动作
            const acts = [
              row.status === 1 && (
                <a key="deploy" onClick={() => handleDeploy(row)}>投产</a>
              ),
              row.status === 2 && (
                <Popconfirm
                  key="disable"
                  title="下线域名"
                  description="若该域名仍被场景绑定，后端将拒绝。确认下线？"
                  onConfirm={() => handleDisable(row)}
                >
                  <a style={{ color: '#ff4d4f' }}>下线</a>
                </Popconfirm>
              ),
            ].filter(Boolean);
            return acts.length ? <Space>{acts}</Space> : <span style={{ color: '#999' }}>—</span>;
          },
        },
      ]}
    />
  );
}
