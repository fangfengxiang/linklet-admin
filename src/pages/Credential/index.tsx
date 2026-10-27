// 凭证管理 —— SK 仅创建时返回明文一次；停用不可逆；AK 不复用；轮换=新建
import { ModalForm, ProFormSelect, ProTable, type ActionType } from '@ant-design/pro-components';
import { Alert, Button, Select, message, Modal, Popconfirm, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { credential, tenant } from '@/services';
import { DomainError } from '@/services/typings';
import { ActiveStatusTag } from '@/components/StatusTag';
import type { Tenant, TenantCredential } from '@/services/typings';
import { useEffect, useRef, useState } from 'react';

const { Paragraph, Text } = Typography;

export default function CredentialPage() {
  const tableRef = useRef<ActionType>();
  const [listError, setListError] = useState<string>();
  const refresh = () => tableRef.current?.reload();
  const [tenantFilter, setTenantFilter] = useState<number>();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState<string>();
  useEffect(() => {
    let active = true;
    tenant.list().then((list) => {
      if (!active) return;
      setTenants(list);
      setTenantFilter((current) => current ?? list.find((item) => item.status === 1)?.id ?? list[0]?.id);
    }).catch((error: unknown) => {
      if (active) setTenantError(error instanceof Error ? error.message : '租户加载失败，请刷新页面');
    }).finally(() => { if (active) setTenantLoading(false); });
    return () => { active = false; };
  }, []);
  const tenantOptions = tenants.map((item) => ({ label: `${item.name}（ID：${item.id}）`, value: item.id }));
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
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
      {tenantError && <Alert type="error" showIcon message={tenantError} style={{ marginBottom: 16 }} />}
      {!tenantLoading && !tenantError && tenants.length === 0 && <Alert type="info" showIcon message="暂无租户，请先到租户管理创建租户，再为其签发凭证。" style={{ marginBottom: 16 }} />}
      {listError && <Alert type="error" showIcon message={listError} style={{ marginBottom: 16 }} />}
      <ProTable<TenantCredential>
        actionRef={tableRef}
        rowKey="id"
        headerTitle="凭证管理（最多100条）"
        pagination={false}
        search={false}
        params={{ tenant_id: tenantFilter }}
        toolBarRender={() => [
          <Select<number>
            key="filter"
            aria-label="租户"
            value={tenantFilter}
            onChange={setTenantFilter}
            options={tenantOptions}
            loading={tenantLoading}
            showSearch
            optionFilterProp="label"
            placeholder="选择租户"
            style={{ width: 240 }}
          />,
          <Button key="reload" onClick={refresh}>刷新</Button>,
          <ModalForm
            key={`create-${tenantFilter ?? 'none'}`}
            title="新建凭证"
            trigger={<Button type="primary" icon={<PlusOutlined />} loading={tenantLoading}>新建凭证</Button>}
            modalProps={{ destroyOnHidden: true }}
            initialValues={{ tenant_id: tenantFilter }}
            onFinish={async (values) => {
              const tenantId = Number(values.tenant_id);
              try {
                const res = await credential.create({ tenant_id: tenantId });
                if (!mounted.current) return true;
                // 明文 SK 仅此一次展示
                setSkModal({ accessKey: res.access_key, secretKey: res.secret_key });
                if (tenantFilter === tenantId) refresh();
                else setTenantFilter(tenantId);
                return true;
              } catch (e) {
                message.error((e as DomainError).message);
                return false;
              }
            }}
          >
            <ProFormSelect name="tenant_id" label="所属租户" options={tenantOptions} rules={[{ required: true, message: '请选择所属租户' }]} />
            <Alert
              type="warning"
              showIcon
              message="Secret Key 仅在创建时显示一次，请立即保存。轮换请创建新凭证再停用旧凭证。"
              style={{ marginBottom: 16 }}
            />
          </ModalForm>,
        ]}
        request={async () => {
          setListError(undefined);
          if (!tenantFilter) return { data: [], success: true };
          try {
            const data = await credential.list(tenantFilter);
            return { data, success: true };
          } catch (e) {
            message.error((e as DomainError).message);
            setListError((e as DomainError).message);
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
      {skModal && <Modal
        open
        destroyOnHidden
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
      </Modal>}
    </>
  );
}
