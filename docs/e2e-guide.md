# E2E 自动化测试指南

> 用真浏览器模拟点击整个 linklet-admin 控制台，验证页面交互与数据对齐。
> 技术栈：`tester-army/e2e` + `@e2e-dev/web`（底层 Playwright）+ in-app mock。

---

真实后端验收使用 `E2E_REAL=1` 的独立套件，见 [真实联调与验收](real-integration.md)。以下默认套件验证 Mock 演示，不能替代真实接口验收。

## 1. 概述

linklet-admin 的 E2E 测试通过真实浏览器（headless Chromium）逐页面点击：
打开页面 → 填表单 → 提交 → 断言列表/message/弹窗状态，覆盖 CRUD 全流程。
Mock 数据复用 `src/mock/` 的 in-app store，无需独立 mock server，也无需后端。

**覆盖范围（8 文件 / 25 用例，全部通过）**

| 页面 | 测试文件 | 用例数 | 覆盖点 |
| --- | --- | --- | --- |
| Dashboard | `dashboard.e2e.ts` | 2 | 四项资源统计渲染、计数与种子数据对齐 |
| 短链管理 | `short-link.e2e.ts` | 5 | 列表、创建、生成含URL、详情抽屉、停用不可逆 |
| 域名资源 | `domain-entry.e2e.ts` | 4 | 上下线状态流转、搜索过滤 |
| 分组管理 | `group.e2e.ts` | 3 | 列表、创建（含 Select 选域名）、配置项 |
| 分组配置 | `group-config.e2e.ts` | 3 | 按 group_id 查询、设置配置、删除配置 |
| 租户管理 | `tenant.e2e.ts` | 4 | 列表、新建、停用/启用、分组授权 |
| 凭证管理 | `credential.e2e.ts` | 3 | 按租户过滤、新建(SK 一次性弹窗)、停用 |
| 冒烟 | `example.e2e.ts` | 1 | 控制台可打开 |

> `agent-demo.e2e.ts` 带 `agent` tag，默认 `--exclude-tag agent` 排除（AI 驱动演示，非回归套件）。

---

## 2. 快速启动

### 2.1 前置

```bash
npm install        # 首次安装依赖（含 e2e、@e2e-dev/web、chromium）
```

Node ≥ 22.22.3。chromium 由 `@e2e-dev/web` 自动下载。

### 2.2 启动 dev server（Mock 模式）

E2E 默认复用已运行的 dev server（`reuseExisting: true`）：

```bash
npm run dev        # 默认 Mock 模式，监听 http://localhost:8000
```

> 无需 `MOCK=0`。E2E 跑在 mock 上，不连真实后端。
> dev server 保持运行即可，E2E 会自动复用，不重复拉起。

### 2.3 运行测试

```bash
# 全部 E2E（排除 agent tag），约 6~10 秒
npm run test:e2e

# 只跑某文件（e2e CLI 接受路径模式）
npx e2e run tests/e2e/group-config.e2e.ts

# 带头调试（非 headless），观察点击过程
npx e2e run --headed

# 指定单个用例标题
npx e2e run -g "sets a new config item"
```

### 2.4 查看报告

```bash
.e2e/report.json                 # 全量运行结果（JSON）
.e2e/results/<用例>/trace.md      # 每个用例的步骤回放 + 失败截图
.e2e/results/<用例>/attempt-1/screenshots/   # 失败时自动截图
.e2e/logs/app.log                # dev server 日志（CI 拉起模式）
```

失败时先看对应用例的 `trace.md`——含每步 DOM 变化、console 日志、最终 screen 快照，定位最快。

---

## 3. 配置说明

`e2e.config.ts`：

```ts
const APP_URL = process.env.APP_URL ?? 'http://localhost:8000';

export default {
  targets: [{
    engine: web(),
    app: {
      url: APP_URL,                       // 被测地址
      command: {
        executable: 'npm',
        args: ['run', 'e2e:serve'],       // CI 无 dev server 时拉起 max build + max preview
        startupTimeout: 240_000,           // 首次 build 较慢，给 4 分钟
        reuseExisting: true,              // 本地复用已起 dev server（11ms 确认）
        log: '.e2e/logs/app.log',
      },
    },
  }],
} satisfies E2EConfig;
```

- **本地开发**：先 `npm run dev`，再 `npm run test:e2e`，`reuseExisting` 秒级复用。
- **CI**：不预起 dev server，`e2e:serve`（`max build && max preview`）构建预编译产物后拉起，避免 dev 按需编译未完成测试就跑。
- **APP_URL**：可通过环境变量改地址（如部署到预发环境跑 e2e）。

`package.json` 脚本：

```json
"test:e2e": "e2e run --exclude-tag agent",
"e2e:serve": "max build && max preview"
```

---

## 4. 编写新 E2E 用例

### 4.1 文件约定

- 路径：`tests/e2e/<模块>.e2e.ts`
- 命名：`describe('模块', { tags: ['模块'], serial: true }, ...)`
  - `serial: true`：同文件用例顺序执行，共享 mock db 状态（创建→删除链路）
  - `tags`：用于 `--exclude-tag` 过滤（如 `agent`）
- 用例用 `RUN = String(Date.now())` 生成唯一标识，避免跨运行数据残留冲突

### 4.2 基本骨架

```ts
import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { pickAntdSelect } from './helpers';

const RUN = process.env.CI ? 'ci' : String(Date.now());

describe('group', { tags: ['group'], serial: true }, () => {
  test('creates a group', async ({ app, screen, browser }) => {
    await app.open('/group');
    await screen.getByRole('button', { name: /新建分组/ }).tap();
    const dialog = screen.getByRole('dialog', '新建分组');
    await dialog.getByRole('textbox').fill(`e2e_${RUN.slice(-5)}`);
    await pickAntdSelect(browser, '.ant-modal-body', '主站');
    await screen.getByRole('button', /确\s?定/).tap();
    await expect(screen.getByText('创建成功')).toBeVisible();
  });
});
```

### 4.3 fixtures：`{ app, screen, browser }`

| fixture | 用途 |
| --- | --- |
| `app` | `app.open('/path')` 导航；封装页面级操作 |
| `screen` | Playwright locator 包装：`getByRole/getByText/getByLabel`，带自动等待 |
| `browser` | 原始 Playwright page，用 `browser.locator(css)` 做精细 CSS 定位（antd 组件必需） |

---

## 5. antd 自动化实战经验（核心踩坑）

antd 不是原生 HTML，很多组件的 accessibility tree 与直觉不符。以下是跑通 25 用例积累的可靠模式。

### 5.1 antd Select 下拉：必须用 CSS locator

**问题**：
- `screen.getByLabel('绑定域名')` 命中的是 `<label>` 文本节点，点击它**打不开** antd Select 下拉
- `screen.getByRole('option')` 每次重新查询会触发 Select 的 `onBlur`，下拉**闪关**

**可靠模式**（封装在 `tests/e2e/helpers.ts` 的 `pickAntdSelect`）：

```ts
// 1. 点 .ant-select-selector 打开下拉
await browser.locator(`${scope} .ant-select-selector`).first().click();
// 2. 在可见的下拉面板里按 title 选 option（不重新查询触发 onBlur）
await browser
  .locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${optionTitle}"]`)
  .first()
  .click();
```

多选 Select（如分组授权）用 `openAntdMultiSelect` + `pickAntdMultiOption`（不关闭下拉逐个勾选）。

### 5.2 getByLabel 对 ProForm 失效：改用 textbox 顺序

**问题**：`ProFormText` 的 `label` 不产生标准 `<label for>` 关联，`dialog.getByLabel('分组编号')` 定位不到 input（accessible name 退化为 placeholder）。

**可靠模式**：在 dialog 作用域内按 `getByRole('textbox')` 顺序定位：

```ts
const dialog = screen.getByRole('dialog', '设置配置项');
const inputs = dialog.getByRole('textbox');
await inputs.nth(0).fill('1001');       // group_id
await inputs.nth(1).fill('e2e_key_xx'); // config_key
await inputs.nth(2).fill('e2e_value'); // config_value
```

> 这是 antd ProForm 的 a11y 缺陷（label 未关联 input）。生产代码可加 `fieldProps={{ id }}` 修复，但测试用 nth 更快且当前稳定。

### 5.3 getByText 精确匹配 vs 正则

**问题**：antd `Typography.Text` 渲染 `"SecretKey:"`（带冒号），`getByText("SecretKey")` 精确匹配 0 结果。

**可靠模式**：用正则做子串匹配：

```ts
await expect(screen.getByText(/SecretKey/)).toBeVisible();   // ✓ 子串匹配
// await expect(screen.getByText('SecretKey')).toBeVisible(); // ✗ 精确匹配落空
```

### 5.4 两字中文按钮间距：正则容错

antd 给两字按钮自动加空格：`确定` → `确 定`。匹配用正则 `/确\s?定/`：

```ts
await screen.getByRole('button', /确\s?定/).tap();
await screen.getByRole('button', /查\s?询/).tap();
await screen.getByRole('button', /重\s?置/).tap();
```

### 5.5 弹窗定位：用 dialog role + 标题

**问题**：`getByText('分组配置')` 可能匹配侧边栏菜单项，不是弹窗标题。

**可靠模式**：`getByRole('dialog', '弹窗标题')` 精确锁定弹窗作用域：

```ts
const dialog = screen.getByRole('dialog', '设置配置项');
await dialog.getByRole('textbox')...
```

### 5.6 异步渲染等待：Statistical 计数轮询

Dashboard 的 Statistic 数值由异步请求填充，`evaluate` 可能在渲染前执行返回 null。用轮询直到所有计数就绪：

```ts
await browser.evaluate(async () => {
  const tick = () => new Promise<void>((resolve) => setTimeout(() => resolve(), 120));
  for (;;) {
    const texts = [...document.querySelectorAll('.ant-statistic-content-value')].map(e => e.textContent);
    if (texts.length >= 4 && texts.every(t => t && t.trim() !== '')) return;
    await tick();
  }
});
```

---

## 6. 修复的结构性 Bug（重要经验）

### 6.1 受控 ModalForm/Drawer 作为 ProTable 子节点不渲染

**现象**：点击行内 `<a onClick={() => setEditing(row)}>`，state 确实更新（`__e2e_editing` 探针确认），但 `open={!!editing}` 的 ModalForm **始终不渲染**。

**根因**：ProTable 的 `tableRender` / `children` 渲染上下文对受控子组件的 state 更新传播不可靠。受控弹窗作为 ProTable 子节点时，父组件 setState 后子节点不重新渲染。

**修复**：把受控 ModalForm/Modal/Drawer **移出 ProTable，作为兄弟节点**：

```tsx
// ✗ 错误：作为 ProTable 子节点，受控 open 不生效
<ProTable ...>
  <ModalForm open={!!editing} onOpenChange={...} />
</ProTable>

// ✓ 正确：作为 ProTable 兄弟节点
<>
  <ProTable ... />
  <ModalForm open={!!editing} onOpenChange={...} />
</>
```

此 bug 在 Group / ShortLink / Credential / Tenant 四个页面都存在，已全部修复。判断特征：弹窗用 `open={!!state}` 受控、且位于 ProTable 内。

### 6.2 `destroyOnClose` 弃用 → `destroyOnHidden`

antd 5 已弃用 `destroyOnClose`，改用 `destroyOnHidden`。全部 ModalForm 的 `modalProps` 已更新：

```tsx
<ModalForm modalProps={{ destroyOnHidden: true }} ... />
```

### 6.3 mock 数据类型不一致导致 CRUD 失配

**现象**：`group-config` 的"设置配置项"提交返回"已保存"，但随后 list 查询查不到新创建的记录。

**根因**：表单提交的 `group_id` 是字符串 `"1001"`，mock handler 用 `group_id as number`（仅 TS 类型断言，运行时不转换）直接 push。而 list handler 用 `Number(q.group_id)` 转数字后 `===` 严格比较，`"1001" === 1001` 为 false，新记录被 filter 掉。种子数据是数字 `1001` 所以种子能匹配。

**修复**：mock handler 入口统一 `Number(group_id)` 转换，保证与种子数据类型一致：

```ts
'PUT .../set': (_q, body) => {
  const { group_id, ... } = fields(body);
  const gid = Number(group_id);           // ← 统一转数字
  const row = db.groupConfigs.find(c => c.group_id === gid && ...);
  ...
  db.groupConfigs.push({ group_id: gid, ... });
}
```

**经验**：mock handler 涉及 `===` 严格比较的字段（id 类），入口必须显式 `Number()` 转换，不能依赖 `as number` 类型断言。表单值一律是字符串。

---

## 7. CI 接入

```yaml
# GitHub Actions 片段
- run: npm ci
- run: npm run lint
- run: npm run test           # Vitest 组件测试
- run: npm run test:e2e       # E2E（自动 build + preview 拉起）
  env:
    APP_URL: http://localhost:8000
```

CI 无预起 dev server，`e2e.config.ts` 的 `command: npm run e2e:serve` 会 `max build && max preview` 拉起预编译服务。`startupTimeout: 240_000` 容纳首次 build。

> 本地开发始终用 `npm run dev` + `reuseExisting`，秒级复用；CI 用 `e2e:serve` 预编译，避免按需编译竞态。

---

## 8. 故障排查速查

| 现象 | 排查方向 |
| --- | --- |
| `target "web" command reused` 后立刻失败 | dev server 没起或端口不对，确认 `curl localhost:8000` 返回 200 |
| `getByRole('option')` 闪关 | 改用 `browser.locator` CSS 连续点击（见 5.1） |
| `getByLabel` 定位不到 ProForm 字段 | 改用 `dialog.getByRole('textbox').nth(n)`（见 5.2） |
| `getByText` 精确匹配 0 结果 | 文本带冒号/前缀，改用正则子串（见 5.3） |
| 受控弹窗点击后不渲染 | 移出 ProTable 作为兄弟节点（见 6.1） |
| 创建成功但 list 查不到 | mock handler id 字段类型不一致，加 `Number()`（见 6.3） |
| 两字按钮 `确定` 找不到 | 用 `/确\s?定/` 正则（见 5.4） |
| 异步数值断言为 null | 轮询等待渲染（见 5.6） |

---

## 9. 相关文件索引

```
e2e.config.ts                     # E2E 配置（地址、dev server 拉起策略）
tests/e2e/helpers.ts              # antd Select 自动化 helper
tests/e2e/<模块>.e2e.ts           # 各模块用例
src/mock/store.ts                 # mock 内存 db（种子数据，单例）
src/mock/dispatch.ts              # mock 路由分发
src/mock/handlers/                # 各领域 handler（遵守不变量）
docs/testing.md                   # 测试体系总览（分层策略）
```
