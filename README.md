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
- 后端对接：Admin API（`/api/v1/admin/*`）无鉴权中间件，生产走 nginx IP 白名单；业务 API（`/api/v1/shorten/*`）需租户 AK/SK 签名，仅 dev BFF 代签
- Mock 数据：开发期与演示站默认 Mock，遵守领域不变量；in-app mock 层使生产构建亦可独立演示

## 快速开始

```bash
npm install
npm run dev      # http://localhost:8000 （默认 Mock）
```

## 连接真实后端（dev）

```bash
export LINKLET_BACKEND=http://127.0.0.1:8080
export LINKLET_ACCESS_KEY=your_ak
export LINKLET_SECRET_KEY=your_sk
MOCK=0 npm run dev
```

> 登录与会话为独立后续 change，本期不实现。BFF 当前以配置 AK/SK + allow-all 身份运行，仅限本地。

## 生产部署（SPA 模式，零 Node 运行时）

`npm run build` 产出纯静态文件（HTML/CSS/JS），nginx 直接发文件即可，**无需 Node 运行时**。

**两种部署模式**：

1. **Mock 模式（演示站）**：`npm run build` → 拷贝 `dist/` 到 nginx web root。数据走 in-app mock，零后端依赖。
2. **真实后端模式**：`MOCK=0 npm run build` → nginx 同域名反代 `/api` 到后端。Admin API 无鉴权，靠 nginx IP 白名单防护。

**nginx 配置示例**见 [deploy/nginx.conf.example](./deploy/nginx.conf.example)：

```nginx
location / { try_files $uri $uri/ /index.html; }           # SPA history 路由回退
location /api/ { proxy_pass http://linklet-backend:8080; } # 反代后端（同源，无 CORS）
# 内部站：allow 10.0.0.0/8; deny all;                       # IP 白名单（可选）
```

> 短链 CRUD 走业务 API（需租户 AK/SK 签名），管理控制台不持有 SK，故 ShortLink 页面在真实模式下保留 Mock 演示，其余 5 资源全量对接真实后端。

## CI/CD

采用 GitHub Actions（参考前端业界做法 + 本仓库其他项目约定）：

- **CI**（[ci.yml](./.github/workflows/ci.yml)）：push/PR 触发 `eslint + tsc + 双构建`（默认与 gh-pages 子路径）验收，含 npm 缓存与并发取消。
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
mock/                # 领域不变量状态机 Mock + dispatch.ts（in-app 分发器）
deploy/              # nginx 配置示例
.github/workflows/   # CI + Deploy
docs/                # 设计与 review 文档
.claude/skills/linklet-admin/SKILL.md  # 领域约束 Skill
```

## 开发约束

见 [AGENTS.md](./AGENTS.md) 与 [.claude/skills/linklet-admin/SKILL.md](./.claude/skills/linklet-admin/SKILL.md)。

## 技术栈

React 18 · TypeScript · UmiJS Max · Vite · Ant Design Pro · ProComponents

## 关联仓库

后端：`linklet`（OpenResty/Lua），Admin API 见 `linklet/docs/api.md`。
