// 短链管理 —— target_url/dest_url 不可改；code 不复用；停用不可逆；expires_at null=不过期
// 注意：短链 CRUD 走业务 API（/api/v1/shorten/*），需租户 AK/SK 签名；
// dev 由 BFF 代签，生产 SPA 需 BFF/nginx(OpenResty) 代签。后端无 admin list 端点。
import { ModalForm, ProForm, ProFormDateTimePicker, ProFormSelect, ProFormText, ProTable, type ActionType } from '@ant-design/pro-components';
import { Alert, Button, Drawer, message, Popconfirm, Space, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { group, shortLink } from '@/services';
import { DomainError } from '@/services/typings';
import { ActiveStatusTag } from '@/components/StatusTag';
import type { ShortLink } from '@/services/typings';
import { useRef, useState } from 'react';

export default function ShortLinkPage() {
  const tableRef = useRef<ActionType>();
  const refresh = () => tableRef.current?.reload();
  const [detail, setDetail] = useState<ShortLink | null>(null);

  const handleDisable = async (row: ShortLink) => {
    try {
      await shortLink.disable(row.code);
      message.success('已停用');
      refresh();
    } catch (e) {
      message.error((e as DomainError).message);
    }
  };

  return (
    <>
      <ProTable<ShortLink>
        actionRef={tableRef}
        rowKey="id"
        headerTitle="短链管理"
        search={false}
        tableLayout="fixed"
        scroll={{ x: 1100 }}
        toolBarRender={() => [
          <Space key="create" wrap>
            <ModalForm
              title="创建短链"
              trigger={<Button type="primary" icon={<PlusOutlined />}>创建短链</Button>}
              modalProps={{ destroyOnHidden: true }}
              onFinish={async (values) => {
                try {
                  const res = await shortLink.create({
                    target_url: values.target_url,
                    group_id: values.group_id,
                    expires_at: values.expires_at || null,
                  });
                  message.success(`创建成功，code: ${res.code}`);
                  refresh();
                  return true;
                } catch (e) {
                  message.error((e as DomainError).message);
                  return false;
                }
              }}
            >
              <ShortLinkForm />
            </ModalForm>
            <ModalForm
              title="生成短链（含完整URL）"
              trigger={<Button icon={<PlusOutlined />}>生成短链</Button>}
              modalProps={{ destroyOnHidden: true }}
              onFinish={async (values) => {
                try {
                  const res = await shortLink.gen({
                    target_url: values.target_url,
                    group_id: values.group_id,
                    expires_at: values.expires_at || null,
                  });
                  message.success(`生成成功，short_url: ${res.short_url}`);
                  refresh();
                  return true;
                } catch (e) {
                  message.error((e as DomainError).message);
                  return false;
                }
              }}
            >
              <ShortLinkForm />
            </ModalForm>
          </Space>,
        ]}
        request={async () => {
          try {
            const data = await shortLink.list();
            return { data, success: true };
          } catch (e) {
            message.error((e as DomainError).message);
            return { data: [], success: false };
          }
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80, ellipsis: true },
          { title: 'Code', dataIndex: 'code', width: 112, ellipsis: true },
          { title: '目标URL', dataIndex: 'dest_url', ellipsis: true },
          { title: '分组', dataIndex: 'group_id', width: 112 },
          { title: '状态', dataIndex: 'status', width: 90, render: (_, r) => <ActiveStatusTag status={r.status} /> },
          {
            title: '过期时间', dataIndex: 'expires_at', width: 200,
            render: (_, r) => r.expires_at
              ? <time dateTime={r.expires_at} title={r.expires_at} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                {dayjs(r.expires_at).format('YYYY-MM-DD HH:mm:ss')}
              </time>
              : <Tag color="blue">永不过期</Tag>,
          },
          {
            title: '操作', width: 128, fixed: 'right', valueType: 'option',
            render: (_, row) => [
              <a key="detail" onClick={() => setDetail(row)}>详情</a>,
              row.status === 1 && (
                <Popconfirm key="disable" title="停用短链？此操作不可逆，code 永不复用。" onConfirm={() => handleDisable(row)}>
                  <a style={{ color: '#ff4d4f' }}>停用</a>
                </Popconfirm>
              ),
            ].filter(Boolean),
          },
        ]}
      />

      {/* 详情抽屉 —— target_url 只读；作为 ProTable 兄弟节点，确保受控 open 驱动 Drawer 渲染 */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title="短链详情"
        width={520}
      >
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert type="info" showIcon message="目标 URL 不可修改；停用后 code 永久不复用。" />
            <Field label="ID">{detail.id}</Field>
            <Field label="Code"><Tag>{detail.code}</Tag></Field>
            <Field label="目标URL">
              <Typography.Paragraph copyable style={{ marginBottom: 0 }}>{detail.dest_url}</Typography.Paragraph>
            </Field>
            <Field label="分组ID">{detail.group_id}</Field>
            <Field label="状态"><ActiveStatusTag status={detail.status} /></Field>
            <Field label="创建时间">{detail.created_at}</Field>
            <Field label="过期时间">{detail.expires_at ?? '永不过期'}</Field>
            <Field label="停用时间">{detail.disabled_at ?? '—'}</Field>
          </Space>
        )}
      </Drawer>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <strong style={{ display: 'inline-block', width: 80 }}>{label}：</strong>
      {children}
    </div>
  );
}

function ShortLinkForm() {
  return (
    <>
      <ProFormText
        name="target_url"
        label="目标URL"
        placeholder="https://example.com/page"
        rules={[{ required: true, max: 2048, type: 'url' }]}
      />
      <ProFormSelect
        name="group_id"
        label="分组"
        request={async () => {
          const list = await group.list();
          return list.map((g) => ({ label: `${g.group_id} ${g.name}`, value: g.group_id }));
        }}
        rules={[{ required: true }]}
      />
      <ProForm.Group>
        <ProFormDateTimePicker name="expires_at" label="过期时间（可选）" />
      </ProForm.Group>
      <Alert
        type="info"
        showIcon
        message="留空表示永不过期。目标 URL 创建后不可修改。"
        style={{ marginBottom: 16 }}
      />
    </>
  );
}
