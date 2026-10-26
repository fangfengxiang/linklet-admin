// 分组配置 —— (group_id, config_key) 唯一；key max128 value max65536
// 地道写法：ProTable search 模式做查询过滤（group_id 为必填搜索项），
// 设置配置走独立 ModalForm（自带 group_id 字段，不依赖查询表单）。
import { ModalForm, ProFormText, ProFormTextArea, ProTable, type ActionType } from '@ant-design/pro-components';
import { Alert, Button, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { groupConfig } from '@/services';
import { DomainError } from '@/services/typings';
import type { GroupConfigItem, SetGroupConfigBody } from '@/services/typings';
import { useRef, useState } from 'react';

export default function GroupConfigPage() {
  const tableRef = useRef<ActionType>();
  const [listError, setListError] = useState<string>();
  const refresh = () => tableRef.current?.reload();

  const handleDelete = async (row: GroupConfigItem) => {
    try {
      await groupConfig.delete(row.group_id, row.config_key);
      message.success('已删除');
      refresh();
    } catch (e) {
      message.error((e as DomainError).message);
    }
  };

  return (
    <>
      {listError && <Alert type="error" showIcon message={listError} style={{ marginBottom: 16 }} />}
    <ProTable<GroupConfigItem>
      actionRef={tableRef}
      rowKey="id"
      headerTitle="分组配置（最多100条）"
        pagination={false}
      search={{ labelWidth: 'auto' }}
      options={{ fullScreen: true }}
      toolBarRender={() => [
        <ModalForm
          key="set"
          title="设置配置项"
          trigger={<Button type="primary" icon={<PlusOutlined />}>设置配置</Button>}
          modalProps={{ destroyOnHidden: true }}
          onFinish={async (values) => {
            try {
              await groupConfig.set({ ...values, group_id: Number(values.group_id), config_value: values.config_value ?? '' } as SetGroupConfigBody);
              message.success('已保存');
              refresh();
              return true;
            } catch (e) {
              message.error((e as DomainError).message);
              return false;
            }
          }}
        >
          <ProFormText name="group_id" label="分组编号" rules={[{ required: true }]} />
          <ProFormText name="config_key" label="配置键" rules={[{ required: true, max: 128 }]} />
          <ProFormTextArea name="config_value" label="配置值" rules={[{ max: 65536 }]} />
          <ProFormText name="description" label="说明" rules={[{ max: 255 }]} />
        </ModalForm>,
      ]}
      request={async (params) => {
        setListError(undefined);
        const gid = Number(params.group_id);
        if (!gid) return { data: [], success: true };
        try {
          const data = await groupConfig.list(gid);
          return { data, success: true };
        } catch (e) {
          message.error((e as DomainError).message);
          setListError((e as DomainError).message);
            return { data: [], success: false };
        }
      }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 60, hideInSearch: true },
        { title: '分组编号', dataIndex: 'group_id' },
        { title: '配置键', dataIndex: 'config_key', hideInSearch: true },
        { title: '配置值', dataIndex: 'config_value', ellipsis: true, hideInSearch: true },
        { title: '说明', dataIndex: 'description', ellipsis: true, hideInSearch: true },
        {
          title: '操作', width: 100, valueType: 'option', hideInSearch: true,
          render: (_, row) => [
            <Popconfirm key="del" title="删除该配置项？" onConfirm={() => handleDelete(row)}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>,
          ],
        },
      ]}
    />
    </>
  );
}
