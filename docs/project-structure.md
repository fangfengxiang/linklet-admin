# 项目目录结构

> linklet-admin 目录与文件用途速查。配合 `docs/tech-stack.md`（技术选型）、`docs/testing.md`（测试体系）阅读。

## 目录树

```
linklet-admin/
├── config/          路由与构建配置
├── deploy/          部署配置
├── docs/            项目文档
├── mock/            Umi mock 目录（约定空壳，实际 mock 在 src/mock/）
├── src/             源码主体
├── tests/           组件单元测试（Vitest）
├── .umirc.ts        Umi Max 构建配置（构建入口）
├── tsconfig.json    TypeScript 配置
├── vitest.config.ts 单测配置
├── package.json     依赖与脚本
├── AGENTS.md        AI 协作约束
└── README.md        项目说明
```

## 逐项说明

### config/
路由单源。`routes.ts` 定义全部页面路由与菜单结构，菜单与路由同步（改路由即改菜单）。

### deploy/
部署配置。`nginx.conf.example` 提供 SPA 部署的 nginx 示例，含两种模式：
- 根部署（`location /` + try_files 回退）
- 子路径部署（`location /admin/` + root 拼接，配合 `DEPLOY_BASE=/admin npm run build`）

### docs/
项目文档。
- `tech-stack.md` — 技术选型与决策依据
- `testing.md` — 测试体系（组件测试已实现 + E2E 评估）
- `project-structure.md` — 本文件，目录速查
- `reviews/` — 代码评审记录

### mock/
Umi 约定的 mock 目录（当前为空壳）。实际 in-app mock 实现在 `src/mock/`（store 种子数据 + dispatch 路由 + handlers 领域不变量逻辑），dev / 演示 / E2E 共用同一数据源。

### src/
源码主体。
- `app.tsx` — Umi 运行时配置入口（`getInitialState` 布局设置 + `layout` 配置）
- `access.ts` — 权限占位（access 插件，当前 allow-all，预留后续登录/session change 注入操作员身份与权限矩阵）
- `pages/` — 业务页面，按领域分目录：
  - `Dashboard/` 仪表盘
  - `Group/` 分组管理
  - `GroupConfig/` 分组配置（ProTable search 模式，group_id 必填搜索项）
  - `ShortLink/` 短链管理
  - `Tenant/` 租户管理
  - `DomainEntry/` 域名入口管理
  - `Credential/` 租户凭证管理（SecretKey 仅创建时展示一次）
  - `404.tsx` 未找到页
- `services/` — 类型化 API 客户端。**页面禁止 inline fetch/axios，必须走此层**（AGENTS.md 关键约束 1）
- `components/` — 公共组件
- `mock/` — in-app mock 实现（`db` 种子数据 + `dispatch` 路由 + `handlers/` 领域不变量逻辑：停用不可逆、下线守卫等）

### tests/
组件单元测试（Vitest + Testing Library）。
- `setup.ts` — jest-dom 断言 + matchMedia/ResizeObserver 桩
- `test-utils.tsx` — `renderWithProviders`（注入 antd zhCN locale）
- `fixtures/` — 测试专用 fixture（不改生产代码，如带 search 的 ProTable）
- `*.test.tsx` — 测试用例

### .umirc.ts
Umi Max 构建配置：`publicPath`/`base`（部署基路径）、`proxy`（BFF 签名代理，AK/SK 服务端持有不进 bundle）、`routes`、插件（antd/access/model/initialState/request/layout）。**源码层面的构建入口**。

### tsconfig.json
TypeScript strict 配置，`@` → `src` 路径别名。

### vitest.config.ts
单测配置：happy-dom 环境、`@` 别名对齐 tsconfig、全局 jest-dom 断言、setup。

### package.json
依赖与 npm 脚本：`dev`/`build`/`lint`/`test`/`test:watch`/`test:coverage`。

### AGENTS.md
AI 协作约束：项目定位、技术栈、关键约束速查（请求层、领域不变量、路由单源、SK 安全、状态不可逆）、常用命令、环境变量。

## 不入库的目录（见 .gitignore）

| 目录/文件 | 性质 | 说明 |
| --- | --- | --- |
| `node_modules/` | 依赖 | npm install 产物 |
| `dist/` | 构建产物 | `npm run build` 产物，部署时拷贝 |
| `.umi/` `.umi-production/` | Umi 临时产物 | 开发/构建中间产物 |
| `openspec/` | 工作流产物 | spec-driven 提案/spec/任务（开发过程，不入库） |
| `coverage/` `playwright-report/` | 测试产物 | 覆盖率报告、E2E 报告 |
| `.env*` | 环境变量 | 含 AK/SK，严禁入库（保留 `.env.example` 模板） |
| `.idea/` `.vscode/` | IDE 配置 | 个人开发环境（`.vscode/extensions.json` 可共享） |
