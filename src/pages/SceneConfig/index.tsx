// 场景配置 —— (scene_id, config_key) 唯一；key max128 value max65536
import { ModalForm, ProFormDigit, ProFormText, ProFormTextArea, ProTable } from '@ant-design/pro-components';
import { Button, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { sceneConfig } from '@/services';
import { DomainError } from '@/services/typings';
import type { SceneConfigItem } from '@/services/typings';
import { useRef, useState } from 'react';

export default function SceneConfigPage() {
  const tableRef = useRef<any>();
  const refresh = () => tableRef.current?.reload();
  const [sceneId, setSceneId] = useState<number>();

  const handleDelete = async (row: SceneConfigItem) => {
    try {
      await sceneConfig.delete(row.scene_id, row.config_key);
      message.success('已删除');
      refresh();
    } catch (e) {
      message.error((e as DomainError).message);
    }
  };

  return (
    <ProTable<SceneConfigItem>
      actionRef={tableRef}
      rowKey="id"
      headerTitle="场景配置"
      search={false}
      toolBarRender={() => [
        <ProFormDigit
          key="filter"
          fieldProps={{ value: sceneId, onChange: (v) => setSceneId(v ?? undefined) }}
          label="场景编号"
        />,
        <Button key="reload" onClick={refresh}>刷新</Button>,
        <ModalForm
          key="set"
          title="设置配置项"
          trigger={<Button type="primary" icon={<PlusOutlined />} disabled={!sceneId}>设置配置</Button>}
          modalProps={{ destroyOnClose: true }}
          onFinish={async (values) => {
            if (!sceneId) return false;
            try {
              await sceneConfig.set({ ...values, scene_id: sceneId } as any);
              message.success('已保存');
              refresh();
              return true;
            } catch (e) {
              message.error((e as DomainError).message);
              return false;
            }
          }}
        >
          <ProFormText name="config_key" label="配置键" rules={[{ required: true, max: 128 }]} />
          <ProFormTextArea name="config_value" label="配置值" rules={[{ required: true, max: 65536 }]} />
          <ProFormText name="description" label="说明" rules={[{ max: 255 }]} />
        </ModalForm>,
      ]}
      request={async () => {
        if (!sceneId) return { data: [], success: true };
        try {
          const data = await sceneConfig.list(sceneId);
          return { data, success: true };
        } catch (e) {
          message.error((e as DomainError).message);
          return { data: [], success: false };
        }
      }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '场景编号', dataIndex: 'scene_id' },
        { title: '配置键', dataIndex: 'config_key' },
        { title: '配置值', dataIndex: 'config_value', ellipsis: true },
        { title: '说明', dataIndex: 'description', ellipsis: true },
        {
          title: '操作', width: 100, valueType: 'option',
          render: (_, row) => [
            <Popconfirm key="del" title="删除该配置项？" onConfirm={() => handleDelete(row)}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>,
          ],
        },
      ]}
    />
  );
}
