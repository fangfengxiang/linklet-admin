# Linklet Admin 测试体系方案

真实后端验收新增独立七页浏览器套件与Node BFF回归测试，见[真实联调与验收](real-integration.md)。以下历史Mock方案不能作为真实接口验收证据。

> 状态：组件测试骨架**已实现并跑通**；E2E **已落地**（8 文件 / 25 用例通过），详见 [e2e-guide.md](./e2e-guide.md)。

---

## 1. 测试分层总览

| 层级 | 工具 | 职责 | 状态 |
| --- | --- | --- | --- |
| 组件测试 | Vitest 2 + @testing-library/react 16 + happy-dom | ProTable/ProForm 交互、必填校验、状态渲染 | 已实现 |
| E2E 测试 | tester-army/e2e + @e2e-dev/web（底层 Playwright） | 真浏览器跨页面流程、点击/导航 | 已实现（25 用例通过） |
| Mock 数据 | in-app mock（`src/mock/` store+dispatch） | dev / E2E / 演示同源数据，遵守领域不变量 | 已实现（复用） |

---

## 2. 已实现：Vitest + Testing Library 组件测试骨架

### 2.1 依赖（devDependencies）
- `vitest@^2.1.9` + `@vitejs/plugin-react@^4.7.0`
- `@testing-library/react@^16.3.3` + `@testing-library/jest-dom@^6.9.1` + `@testing-library/user-event@^14.6.8`
- `happy-dom@^15.11.7`

### 2.2 文件清单
```
vitest.config.ts                    # happy-dom 环境、@→src 别名、全局断言、setup
tests/
  setup.ts                          # jest-dom 断言 + matchMedia/ResizeObserver 桩
  test-utils.tsx                    # renderWithProviders（注入 antd zhCN locale）
  fixtures/
    DomainSearchTable.tsx           # 带 search 筛选的 ProTable 测试 fixture
  ProTableSearch.test.tsx           # 筛选查询 + 重置（2 用例）
  DomainEntry.test.tsx              # ModalForm 提交 + 必填校验（2 用例）
```

### 2.3 测试策略
- **隔离数据层**：组件测试用 `vi.mock('@/services')` 拦截 service，返回固定 fixture 数据，不依赖 in-app mock 的 `db` 状态。这是 Testing Library 哲学——测组件行为，不测数据层。
- **ProTable 筛选示例**：用专用 fixture（`DomainSearchTable`，带 `search`），不改生产页面。验证输入关键字→查询→表格过滤、重置→恢复。
- **ProForm 提交示例**：基于真实 `DomainEntry` 页面（`ModalForm`）。验证打开→填写→确定→`create` 调用+列表刷新、必填校验→不提交。

### 2.4 运行
```bash
npm test              # 单次跑（CI 用）
npm run test:watch    # 监听模式（开发用）
npm run test:coverage # 覆盖率（需补装 @vitest/coverage-v8）
```

> 注：antd 两字中文按钮存在间距，匹配用正则 `/查\s?询/`、`/重\s?置/`、`/确\s?定/`。

---

## 3. E2E 方案选型与落地

> **已落地**：实际选用 `tester-army/e2e` + `@e2e-dev/web`（非裸 Playwright），因其 selector 自适应 + fixture 抽象对中后台 CRUD 够用。启动与编写见 [e2e-guide.md](./e2e-guide.md)。以下为选型时的方案对比记录。

### 3.1 方案对比

| 方案 | 定位 | 优势 | 劣势 / 风险 | 适配 Linklet Admin |
| --- | --- | --- | --- | --- |
| **Playwright** | 现代端到端框架 | 跨浏览器、自动等待、Trace Viewer、Codegen 录制、并发、全免费、微软持续投入 | 需自行配置（成本不高） | **首推** |
| agent-browser skill | CodeBuddy 内置 vercel-labs/agent-browser CLI | 即开即用、我（AI）可直接帮你点验证 | CLI 工具非测试框架，不入 CI 套件、不可重复回归 | 临时验证 |
| tester-army/e2e | Playwright + AI Agent 层 | 记录回放（首次 AI 驱动，后续回放不耗模型）、UI 变化自适应 | **未到 1.0**，API 可能变；中后台 CRUD 杀鸡用牛刀 | 暂不引入，1.0 后再评估 |
| node mock server | 独立进程提供 mock 接口 | E2E 与前端解耦、可独立控制生命周期 | 多一个进程；与 in-app mock 重复维护 | **不需要**（已有 in-app mock） |

### 3.2 推荐方案：Playwright + 复用 in-app mock

**E2E 用 Playwright，mock 直接复用项目已有的 `src/mock/`（in-app mock）。**

理由（取舍）：
- 项目已有完整的 in-app mock 机制（`store.ts` 的 `db` 种子数据 + `dispatch.ts` 路由 + `handlers/` 领域不变量逻辑），这正是"数据按后端接口约定模型存文件"的实现——数据就在 `store.ts` 里，遵守停用不可逆、下线守卫等不变量。
- E2E 时让 Umi 跑在 mock 模式（`MOCK !== '0'`，默认即启用），前端请求经 `fetchAPI` → `mockRequest` → `db` 命中。**无需再起独立 node mock server**——再起一个等于重复维护两套 mock 数据与不变量。
- Playwright 是现代 E2E 标准，对标业界 2024+ 主流；对中后台 CRUD 稳定够用，不需要 AI Agent 自适应（`tester-army/e2e` 的核心卖点在这里用不上）。
- agent-browser skill 适合我临时帮你把页面流程点一遍截图，但不是可入库的回归套件——定位为"AI 辅助临时验证"。

### 3.3 mock 策略分层（三态）

| 场景 | mock 来源 | 说明 |
| --- | --- | --- |
| 组件测试（Vitest） | `vi.mock` 固定 fixture | 隔离、最快、不碰 `db` |
| E2E 测试（Playwright） | in-app mock（`src/mock/`） | 起 `max dev`，请求走 `db`，遵守领域不变量 |
| 联调 / 集成 | 真实后端（`MOCK=0`） | 经 BFF 签名代理连 `linklet` 后端 |

> 单一数据源：dev / 构建 / 演示 / E2E 共用 `store.ts` 的 `db`，符合 `bootstrap-admin-console` design.md Decision 6「Mock 优先，后端可切换」。

### 3.4 何时再评估 tester-army/e2e
- 等 `tester-army/e2e` 发布 1.0 稳定版；
- 且出现「UI 频繁重构、selector 维护成本高」的真实痛点时，其 AI 自适应 + 记录回放才有 ROI。当前中后台 CRUD 用传统 selector 足够稳定。

### 3.5 Playwright 接入骨架（待实施时的起点）
```
devDependencies: @playwright/test
playwright.config.ts: baseURL=http://localhost:8000, webServer=max dev
e2e/ 目录: *.spec.ts 用例
package.json: "test:e2e": "playwright test"
```
E2E 用例起 `max dev`（mock 默认开），点真实浏览器流程，断言页面状态。需要精细控制 mock 状态时，给 `store.ts` 加 `resetDb()` 在用例间重置（仍用 in-app mock，不另起 server）。

---

## 4. 待优化项（非阻塞）
- ~~生产代码 `ModalForm` 用了 `destroyOnClose`~~ → 已全部改为 `destroyOnHidden`。
- `antd message` 静态调用建议包 `<App>` 组件以消费 context（antd 5 推荐）。
- 覆盖率按需补装 `@vitest/coverage-v8`。
