// 带 search 筛选的 ProTable 示例（测试专用 fixture，不改生产页面）
// 用于演示 ProTable 搜索表单的筛选点击交互测试。
import { ProTable } from '@ant-design/pro-components';
import { domainEntry } from '@/services';
import type { DomainEntry } from '@/services/typings';

export default function DomainSearchTable() {
  return (
    <ProTable<DomainEntry>
      rowKey="id"
      headerTitle="域名筛选示例"
      search={{ labelWidth: 'auto' }}
      request={async (params) => {
        // 真实项目由后端按 params 过滤；此处前端演示，便于测“筛选点击 → 表格更新”
        const data = await domainEntry.list();
        let result = data;
        const kw = params.domain as string | undefined;
        if (kw) result = result.filter((d) => d.domain.includes(kw));
        if (params.status) result = result.filter((d) => d.status === Number(params.status));
        return { data: result, success: true };
      }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 60, search: false },
        {
          title: '域名',
          dataIndex: 'domain',
          fieldProps: { placeholder: '请输入域名' },
        },
        { title: '标签', dataIndex: 'tag', search: false },
        {
          title: '状态',
          dataIndex: 'status',
          valueType: 'select',
          valueEnum: {
            1: { text: '新增' },
            2: { text: '投产' },
            3: { text: '下线' },
          },
        },
      ]}
    />
  );
}
