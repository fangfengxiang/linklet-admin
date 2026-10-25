// 凭证管理 —— SK 仅创建时返回明文一次；停用不可逆；AK 不复用；轮换=新建
import { ModalForm, ProFormText, ProTable, type ActionType } from '@ant-design/pro-components';
import { Alert, Button, InputNumber, message, Modal, Popconfirm, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { credential } from '@/services';
import { DomainError } from '@/services/typings';
import { ActiveStatusTag } from '@/components/StatusTag';
import type { TenantCredential } from '@/services/typings';
import { useRef, useState } from 'react';

const { Paragraph, Text } = Typography;

export default function CredentialPage() {
  const tableRef = useRef<ActionType>();
  const refresh = () => tableRef.current?.reload();
  const [tenantFilter, setTenantFilter] = useState<number>();
  const [skModal, setSkModal] = useState<{ accessKey: string; secretKey?: string } | null>(null);

  const handleDisable = async (row: TenantCredential) => {
    try {
      await credential.disable(row.access_key);
      message.success('凭证已停用');
      refresh();
    } catch (e) {
      message.error((e as DomainError).message);
    }
  };

  return (
    <>
      <ProTable<TenantCredential>
        actionRef={tableRef}
        rowKey="id"
        headerTitle="凭证管理"
        search={false}
        toolBarRender={() => [
          // ProFormDigit 需 Form 上下文，toolBarRender 无之致 label 关联失效；
          // 改用 InputNumber + aria-label，可访问且 getByLabel 可定位
          <InputNumber
            key="filter"
            aria-label="租户ID"
            value={tenantFilter}
            onChange={(v) => setTenantFilter(v ?? undefined)}
            min={1}
            placeholder="租户ID"
          />,
          <Button key="reload" onClick={refresh}>刷新</Button>,
          <ModalForm
            key="create"
            title="新建凭证"
            trigger={<Button type="primary" icon={<PlusOutlined />} disabled={!tenantFilter}>新建凭证</Button>}
            modalProps={{ destroyOnHidden: true }}
            onFinish={async (values) => {
              if (!tenantFilter) return false;
              try {
                const res = await credential.create({ ...values, tenant_id: tenantFilter });
                // 明文 SK 仅此一次展示
                setSkModal({ accessKey: res.access_key, secretKey: res.secret_key });
                refresh();
                return true;
              } catch (e) {
                message.error((e as DomainError).message);
                return false;
              }
            }}
          >
            <ProFormText name="description" label="说明" rules={[{ max: 255 }]} />
            <Alert
              type="warning"
              showIcon
              message="Secret Key 仅在创建时显示一次，请立即保存。轮换请创建新凭证再停用旧凭证。"
              style={{ marginBottom: 16 }}
            />
          </ModalForm>,
        ]}
        request={async () => {
          if (!tenantFilter) return { data: [], success: true };
          try {
            const data = await credential.list(tenantFilter);
            return { data, success: true };
          } catch (e) {
            message.error((e as DomainError).message);
            return { data: [], success: false };
          }
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: 'AccessKey', dataIndex: 'access_key' },
          { title: '说明', dataIndex: 'description', ellipsis: true },
          { title: '状态', dataIndex: 'status', width: 90, render: (_, r) => <ActiveStatusTag status={r.status} /> },
          { title: '停用时间', dataIndex: 'disabled_at' },
          {
            title: '操作', width: 100, valueType: 'option',
            render: (_, row) =>
              row.status === 1 ? (
                <Popconfirm key="disable" title="停用凭证？此操作不可逆。" onConfirm={() => handleDisable(row)}>
                  <a style={{ color: '#ff4d4f' }}>停用</a>
                </Popconfirm>
              ) : (
                <span style={{ color: '#999' }}>已停用</span>
              ),
          },
        ]}
      />

      {/* 明文 SK 一次性展示弹窗 —— 关闭后不入本地状态；作为 ProTable 兄弟节点确保受控 open 生效 */}
      <Modal
        open={!!skModal}
        onOk={() => setSkModal(null)}
        onCancel={() => setSkModal(null)}
        okText="我已保存"
        cancelText="关闭"
        closable={false}
        maskClosable={false}
      >
        <Alert type="success" showIcon message="凭证创建成功" style={{ marginBottom: 16 }} />
        <Paragraph>
          <Text strong>AccessKey: </Text>
          <Text copyable>{skModal?.accessKey}</Text>
        </Paragraph>
        <Paragraph>
          <Text strong>SecretKey: </Text>
          <Text copyable type="danger">{skModal?.secretKey}</Text>
        </Paragraph>
        <Alert type="warning" showIcon message="Secret Key 仅显示一次，关闭后无法再次获取。" />
      </Modal>
    </>
  );
}
