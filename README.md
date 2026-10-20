# linklet-admin

[![CI](https://github.com/fangfengxiang/linklet-admin/actions/workflows/ci.yml/badge.svg)](https://github.com/fangfengxiang/linklet-admin/actions/workflows/ci.yml)
[![Deploy](https://github.com/fangfengxiang/linklet-admin/actions/workflows/deploy.yml/badge.svg)](https://github.com/fangfengxiang/linklet-admin/actions/workflows/deploy.yml)
[![Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://fangfengxiang.github.io/linklet-admin/)

Linklet 短链平台的 React 管理控制台。基于 Ant Design Pro + ProComponents，面向平台运营人员管理域名、场景、场景配置、租户、凭证与短链。

## 在线演示

- **演示地址**：<https://fangfengxiang.github.io/linklet-admin/>
- 以 **Mock 模式**部署，演示数据在浏览器内 in-app mock 层生成（无后端依赖），可完整体验六大资源 CRUD 与领域约束交互。
- 首次访问需等待 GitHub Actions 部署完成（push main 后约 1-2 分钟）。需在仓库 Settings → Pages → Source 选择 **GitHub Actions**。

## 功能

- 六大资源 CRUD：DomainEntry / Scene / SceneConfig / Tenant / TenantCredential / ShortLink
- 领域不变量 UI 呈现与约束（target_url 不可改、停用不可逆、域名下线守卫、SK 仅创建时展示等）
- BFF 签名代理：服务端用 AK/SK 对后端 HMAC-SHA1 签名，SK 不进浏览器
- Mock 数据：开发期与演示站默认 Mock，遵守领域不变量；in-app mock 层使生产构建亦可独立演示

## 快速开始

```bash
npm install
npm run dev      # http://localhost:8000 （默认 Mock）
```

## 连接真实后端

```bash
export LINKLET_BACKEND=http://127.0.0.1:8080
export LINKLET_ACCESS_KEY=your_ak
export LINKLET_SECRET_KEY=your_sk
MOCK=0 npm run dev
```

> 登录与会话为独立后续 change，本期不实现。BFF 当前以配置 AK/SK + allow-all 身份运行，仅限本地。

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
