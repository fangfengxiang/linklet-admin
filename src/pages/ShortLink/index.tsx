import { DateTime, DATE_TIME_FORMAT } from '@/components/DateTime';
// Short-link operations use tenant-signed APIs through the server BFF.
import { ModalForm, ProFormDateTimePicker, ProFormSelect, ProFormText, ProTable, type ActionType } from '@ant-design/pro-components';
import { Alert, Button, Drawer, message, Popconfirm, Space, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { group, shortLink } from '@/services';
import { DomainError } from '@/services/typings';
import { ActiveStatusTag } from '@/components/StatusTag';
import type { ShortLink } from '@/services/typings';
import { useRef, useState } from 'react';

interface ShortLinkFormValues {
  target_url: string;
  group_id: number;
  expires_at?: string | null;
}

export function normalizeExpiry(value?: string | null): string | null {
  if (!value) return null;
  const parsed = dayjs(value);
  if (!parsed.isValid()) throw new DomainError(4007, '过期时间无效');
  return parsed.toISOString();
}

export default function ShortLinkPage() {
  const tableRef = useRef<ActionType>();
  const refresh = () => tableRef.current?.reload();
  const [listError, setListError] = useState<string>();
  const [detail, setDetail] = useState<ShortLink | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const detailRequest = useRef(0);

  async function openDetail(code: string) {
    const requestId = ++detailRequest.current;
    setDetailOpen(true);
    setDetail(null);
    setDetailError(undefined);
    setDetailLoading(true);
    try {
      const result = await shortLink.get({ code });
      if (requestId === detailRequest.current) setDetail(result);
    } catch (error) {
      if (requestId === detailRequest.current) setDetailError((error as DomainError).message);
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false);
    }
  }

  const handleDisable = async (row: ShortLink) => {
    try {
      await shortLink.disable(row.code);
      message.success('已停用');
      refresh();
    } catch (error) {
      message.error((error as DomainError).message);
    }
  };

  async function submit(values: ShortLinkFormValues, fullUrl: boolean) {
    try {
      const body = { target_url: values.target_url, group_id: values.group_id,
        expires_at: normalizeExpiry(values.expires_at) };
      const result = fullUrl ? await shortLink.gen(body) : await shortLink.create(body);
      message.success(fullUrl ? `生成成功，short_url: ${result.short_url}` : `创建成功，code: ${result.code}`);
      refresh();
      return true;
    } catch (error) {
      message.error((error as DomainError).message);
      return false;
    }
  }

  return (
    <>
      <Alert type="info" showIcon message="仅展示当前业务凭证已授权分组的短链，最多100条。停用后不可恢复，code永久保留。" style={{ marginBottom: 16 }} />
      {listError && <Alert type="error" showIcon message={listError} style={{ marginBottom: 16 }} />}
      <ProTable<ShortLink>
        actionRef={tableRef}
        rowKey="id"
        headerTitle="短链管理（最多100条）"
        pagination={false}
        search={false}
        tableLayout="fixed"
        scroll={{ x: 1100 }}
        toolBarRender={() => [
          <Space key="create" wrap>
            <ModalForm<ShortLinkFormValues>
              title="创建短链"
              trigger={<Button type="primary" icon={<PlusOutlined />}>创建短链</Button>}
              modalProps={{ destroyOnHidden: true }}
              onFinish={(values) => submit(values, false)}
            ><ShortLinkForm /></ModalForm>
            <ModalForm<ShortLinkFormValues>
              title="生成短链（含完整URL）"
              trigger={<Button icon={<PlusOutlined />}>生成短链</Button>}
              modalProps={{ destroyOnHidden: true }}
              onFinish={(values) => submit(values, true)}
            ><ShortLinkForm /></ModalForm>
          </Space>,
        ]}
        request={async () => {
          setListError(undefined);
          try {
            const data = await shortLink.list();
            return { data, success: true };
          } catch (error) {
            setListError((error as DomainError).message);
            return { data: [], success: false };
          }
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80, ellipsis: true },
          { title: 'Code', dataIndex: 'code', width: 112, ellipsis: true },
          { title: '目标URL', dataIndex: 'target_url', ellipsis: true },
          { title: '分组', dataIndex: 'group_id', width: 112 },
          { title: '状态', dataIndex: 'status', width: 90, render: (_, row) => <ActiveStatusTag status={row.status} /> },
          { title: '过期时间', dataIndex: 'expires_at', width: 200,
            render: (_, row) => row.expires_at
              ? <DateTime value={row.expires_at} />
              : <Tag color="blue">永不过期</Tag> },
          { title: '操作', width: 128, fixed: 'right', valueType: 'option', render: (_, row) => [
            <a key="detail" onClick={() => { void openDetail(row.code); }}>详情</a>,
            row.status === 1 && <Popconfirm key="disable" title="停用短链？此操作不可逆，code永不复用。" onConfirm={() => handleDisable(row)}>
              <a style={{ color: '#ff4d4f' }}>停用</a>
            </Popconfirm>,
          ].filter(Boolean) },
        ]}
      />
      <Drawer open={detailOpen} title="短链详情" width={520}
        onClose={() => { detailRequest.current += 1; setDetailOpen(false); setDetail(null); }}>
        {detailLoading && <Alert type="info" message="正在加载短链详情…" />}
        {detailError && <Alert type="error" showIcon message={detailError} />}
        {detail && <Space direction="vertical" style={{ width: '100%' }}>
          <Alert type="info" showIcon message="目标URL不可修改；停用后code永久不复用。" />
          <Field label="ID">{detail.id}</Field>
          <Field label="Code"><Tag>{detail.code}</Tag></Field>
          <Field label="目标URL"><Typography.Paragraph copyable style={{ marginBottom: 0 }}>{detail.target_url}</Typography.Paragraph></Field>
          <Field label="分组ID">{detail.group_id}</Field>
          <Field label="状态"><ActiveStatusTag status={detail.status} /></Field>
          <Field label="创建时间"><DateTime value={detail.created_at} /></Field>
          <Field label="过期时间"><DateTime value={detail.expires_at} empty="永不过期" /></Field>
          <Field label="停用时间"><DateTime value={detail.disabled_at} /></Field>
        </Space>}
      </Drawer>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><strong style={{ display: 'inline-block', width: 80 }}>{label}：</strong>{children}</div>;
}

function ShortLinkForm() {
  return <>
    <ProFormText name="target_url" label="目标URL" placeholder="https://example.com/page"
      rules={[{ required: true, max: 2048, type: 'url' }]} />
    <ProFormSelect name="group_id" label="分组" rules={[{ required: true }]}
      request={async () => (await group.list()).filter((item) => item.status === 1)
        .map((item) => ({ label: `${item.group_id} ${item.name}`, value: item.group_id }))} />
    <ProFormDateTimePicker name="expires_at" label="过期时间（可选）" fieldProps={{ format: DATE_TIME_FORMAT }} />
    <Alert type="info" showIcon message="留空表示永不过期。目标URL创建后不可修改；创建仍需当前业务凭证的分组授权。" style={{ marginBottom: 16 }} />
  </>;
}
