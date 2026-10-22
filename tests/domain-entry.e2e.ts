// DomainEntry 页面 E2E —— 状态流转与领域不变量
// 状态 new(1)→deployed(2)→offline(3) 不可逆；有 active Group 绑定不可下线
// 传统断言为主，CI 零 LLM 依赖；末尾 agent.act 为可选尝鲜（需 model gateway）
//
// 定位说明（基于实际 DOM 实证）：
// - "新建域名"按钮 accessible name 为 "plus 新建域名"（图标名前缀），用 exact:false 子串匹配
// - ModalForm/Popconfirm 确定按钮文本为 "确 定"（Antd 对双中文字符自动加空格），精确匹配
// - 操作列 <a onClick> 无 href，可访问性 role 不是 link，用 getByText 定位文本
// - 状态标签文本：status 1→"新增"、2→"投产"、3→"下线"
import { describe, beforeEach, test } from '@e2e-dev/web';
import { expect } from 'e2e';

// 每次运行唯一前缀，避免本地重复跑时 domain 冲突（mock create 防重复）
const RUN = process.env.CI ? 'ci' : String(Date.now());

describe('domain entry', { tags: ['domain'], serial: true }, () => {
  beforeEach(async ({ app }) => {
    await app.open('/domain-entry');
  });

  test('loads the list with seeded domains', async ({ screen }) => {
    // 不验证 ProTable 标题"域名资源"——与侧边菜单同名项冲突(AMBIGUOUS)；以种子数据证明页面加载
    await expect(screen.getByText('s.example.com')).toBeVisible();
    await expect(screen.getByText('go.example.com')).toBeVisible();
    await expect(screen.getByText('dev.example.com')).toBeVisible();
  });

  test('creates a new domain entry', async ({ screen }) => {
    const domain = `e2e-${RUN}-create.example.com`;
    await screen.getByRole('button', '新建域名', { exact: false }).tap();
    await screen.getByPlaceholder('s.example.com').fill(domain);
    await screen.getByPlaceholder('分类标签').fill('E2E');
    await screen.getByRole('button', '确 定').tap();
    await expect(screen.getByText('创建成功')).toBeVisible();
    await expect(screen.getByText(domain)).toBeVisible();
  });

  test('deploys a new domain (new → deployed)', async ({ screen }) => {
    const domain = `e2e-${RUN}-deploy.example.com`;
    // 先新建一个 new 状态域名（独立可复现，不依赖初始数据）
    await screen.getByRole('button', '新建域名', { exact: false }).tap();
    await screen.getByPlaceholder('s.example.com').fill(domain);
    await screen.getByRole('button', '确 定').tap();
    await expect(screen.getByText('创建成功')).toBeVisible();

    const row = screen.getByRole('row').filter({ hasText: domain });
    // 初始 new 状态：操作列为"投产"（状态标签为"新增"，row 内"投产"唯一）
    await expect(row.getByText('投产')).toBeVisible();
    await row.getByText('投产').tap();
    await expect(screen.getByText('已投产')).toBeVisible();
    // 状态流转后：操作列变"下线"（状态标签变"投产"，row 内"下线"唯一）
    await expect(row.getByText('下线')).toBeVisible();
  });

  test('refuses to offline a domain bound to active groups', async ({ screen }) => {
    // s.example.com 有 active group 绑定（mock db.groups domain_entry_id=1 status=1）
    const row = screen.getByRole('row').filter({ hasText: 's.example.com' });
    await row.getByText('下线').tap();
    await screen.getByRole('button', '确 定').tap();
    // 后端 409：领域不变量——有 active group 绑定不可下线
    await expect(screen.getByText('domain is still bound to active groups')).toBeVisible();
    // 状态保持 deployed，下线操作仍在
    await expect(row.getByText('下线')).toBeVisible();
  });
});
