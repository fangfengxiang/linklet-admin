# linklet-admin

[![CI](https://github.com/fangfengxiang/linklet-admin/actions/workflows/ci.yml/badge.svg)](https://github.com/fangfengxiang/linklet-admin/actions/workflows/ci.yml)
[![Deploy](https://github.com/fangfengxiang/linklet-admin/actions/workflows/deploy.yml/badge.svg)](https://github.com/fangfengxiang/linklet-admin/actions/workflows/deploy.yml)
[![Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://fangfengxiang.github.io/linklet-admin/)

Linklet 短链平台的 React 管理控制台。基于 Ant Design Pro + ProComponents，面向平台运营人员管理域名、分组、分组配置、租户、凭证与短链。

## 在线演示

- **演示地址**：<https://fangfengxiang.github.io/linklet-admin/>
- 以 **Mock 模式**部署，演示数据在浏览器内 in-app mock 层生成（无后端依赖），可完整体验六大资源 CRUD 与领域约束交互。
- 首次访问需等待 GitHub Actions 部署完成（push main 后约 1-2 分钟）。需在仓库 Settings → Pages → Source 选择 **GitHub Actions**。

## 功能

- 六大资源 CRUD：DomainEntry / Group / GroupConfig / Tenant / TenantCredential / ShortLink
- 领域不变量 UI 呈现与约束（target_url 不可改、停用不可逆、域名下线守卫、SK 仅创建时展示等）
- 后端对接：Admin API（`/api/v1/admin/*`）无鉴权中间件，生产走 nginx IP 白名单；业务 API（`/api/v1/shorten/*`）需租户 AK/SK 签名，本机 BFF 代签
- Mock 数据：开发期与演示站默认 Mock，遵守领域不变量；in-app mock 层使生产构建亦可独立演示

## 快速开始

```bash
npm install
npm run dev      # http://localhost:8000 （默认 Mock）
```

## 本地 Docker + 真实接口联调

要求 Node.js >=22.22.3、Docker Compose v2；后端使用 Linklet v0.2（含 Group/凭证/短链查询接口）。后端地址在 **服务端** `LINKLET_BACKEND` 配置，浏览器始终请求同源 `/api`。没有跨域硬编码和前端 SK 环境变量。

```bash
cp .env.example .env.local
# .env.local 填写 LINKLET_SOURCE（相对于 deploy/），以及 openssl rand -hex 32 生成的本地加密密钥
# 默认同级仓库 ../../linklet；Docker 数据保存在独立项目的 pgdata，不使用生产数据库
docker compose -p linklet-admin-local --env-file .env.local -f deploy/linklet.compose.yml up --build -d --wait
npm run seed:local  # 仅本机：创建联调租户/凭证，写入权限600的.env.runtime.local；重复执行拒绝覆盖
npm run dev:real    # MOCK=0构建，然后 http://127.0.0.1:8000 同源 BFF + SPA
```

修改 `LINKLET_BACKEND`（如 `https://linklet.internal.example`）只需调整启动环境或 `.env.runtime.local` 并重启 BFF；无需重建前端。它只接受 HTTP(S) origin，不包含路径、凭证或 query。更换后端后必须配置对应的服务端 AK/SK。

初始化租户尚未授权 Group。先在页面创建并投产域名、创建分组，在租户页将分组授权给 `.env.runtime.local` 中的 `E2E_TENANT_ID`，即可在短链页创建/生成、读取及永久停用短链。凭证页通过租户 ID 查询和签发凭证，轮换使用“新建后停用旧凭证”。

- 七个页面均使用真实 API：仪表盘、域名、分组、分组配置、租户、凭证、短链。
- 列表为后端有界查询（最多100条），仪表盘显示返回记录数，短链仅限服务端业务凭证授权范围。
- BFF按原始请求体和 URI 签名，不把配置的租户 SK 发送到浏览器。新签发凭证只在创建弹窗临时展示一次；关闭即销毁，不写入浏览器存储。
- BFF只监听127.0.0.1并拒绝外来Origin/Host；Docker临时入口也仅发布在127.0.0.1:18080。默认后端Admin白名单保持。
- **本模式无登录/会话，仅供本机开发。生产管理员认证和凭证交付另行设计，不可直接作为公网管理入口。**

默认 `npm run dev` 和 `npm run build` 仍为 Mock 演示；真实模式必须显式 `MOCK=0` 构建。真实模式不回退 Mock。

## 构建与运行

```bash
npm run build                            # Mock SPA，可用于GitHub Pages
DEPLOY_BASE=gh-pages npm run build        # /linklet-admin/ 子路径演示
MOCK=0 npm run build                      # 根路径真实SPA
npm run serve:real                       # .env.runtime.local + Node BFF，不重新构建
npm run lint
npm test
npm run test:bff
```

纯静态站点只能提供 Mock 演示；真实短链操作需要服务端 BFF 签名，不能用静态 nginx 直接转发替代。`server/bff.mjs` 当前仅支持本机根路径联调。生产部署前须完成管理员会话、入口访问控制和审计，见 [真实联调与验收](docs/real-integration.md)。

## CI/CD

采用 GitHub Actions（参考前端业界做法 + 本仓库其他项目约定）：

- **CI**（[ci.yml](./.github/workflows/ci.yml)）：lint、类型检查、Mock双构建、组件与BFF单测。
- **真实集成**（[integration.yml](./.github/workflows/integration.yml)）：固定后端提交、隔离PostgreSQL/OpenResty、真实构建、七页浏览器E2E；不使用Mock。
- **Deploy**（[deploy.yml](./.github/workflows/deploy.yml)）：push `main` 以 Mock 模式构建并部署到 GitHub Pages，输出在线演示地址。
- **Dependabot**（[dependabot.yml](./.github/dependabot.yml)）：每周更新 GitHub Actions 与 npm 依赖。

本地校验部署构建（与 CI 一致）：

```bash
DEPLOY_BASE=gh-pages npm run build   # 产出 /linklet-admin/ 子路径构建
```

## 项目结构

```
src/
├── services/        # 类型化 API Client（请求层 + 6 资源客户端 + 类型定义）
├── pages/           # 六大资源页面 + Dashboard
├── components/      # 共享组件（StatusTag 等）
├── app.tsx          # Umi 运行时配置（布局、请求拦截）
└── access.ts        # 权限占位
config/
├── routes.ts        # 路由单源（菜单同步）
src/mock/            # 领域不变量状态机 Mock + dispatch.ts（in-app 分发器）
deploy/              # nginx 配置示例
.github/workflows/   # CI + Deploy
docs/                # 设计与 review 文档
.claude/skills/linklet-admin/SKILL.md  # 领域约束 Skill
```

## 开发约束

见 [AGENTS.md](./AGENTS.md)；本地 `.claude/` 规划资料不随发布检出。

## 技术栈

React 18 · TypeScript · UmiJS Max · Vite · Ant Design Pro · ProComponents

## 关联仓库

后端：`linklet`（OpenResty/Lua），Admin API 见 `linklet/docs/api.md`。
