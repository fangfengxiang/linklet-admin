## Context

`linklet-admin` 是 `linklet` 短链平台的独立前端仓库，面向平台运营人员。后端（OpenResty/Lua）的 Admin API 与短链业务 API 已具备稳定路由面，认证采用 AK/SK HMAC-SHA1（`X-Access-Key` / `X-Signature` / `X-Timestamp`）。该签名方案适合程序调用，**绝不适合浏览器**：SecretKey 一旦进入前端 bundle 即等同于泄露。因此前端必须有一道服务端边界承担签名职责。本仓库当前为空，从零搭建。

后端 v0.2 重构（`linklet/openspec/changes/refactor-backend-v02`）正在收敛七表领域模型：DomainEntry、Scene、SceneConfig、Tenant、TenantCredential、ShortLink、IDSequence。Admin API 路由由 `linklet/lib/linklet/admin/routes.lua` 定义，资源处理器在 `resources.lua` 中按 `resource/action` 分发。

## Goals / Non-Goals

**Goals:**
- 基于 Ant Design Pro + ProComponents 搭建可 `npm run dev` 即跑的管理控制台。
- 覆盖六大资源的列表/表单/详情/状态操作页面。
- 在 UI 层呈现并约束领域不变量（target_url 不可改、停用不可逆、域名下线守卫等）。
- 建立 BFF 签名代理骨架，SK 不出服务端，为后续登录会话预留注入点。
- 产出 `linklet-admin` Agent Skill，固化领域规则与开发规范供 Codex 复用。

**Non-Goals:**
- 不实现管理员登录与会话（独立后续 change）。
- 不直连 PostgreSQL，不实现后端业务逻辑。
- 不做 i18n 完整覆盖（仅预留结构，默认中文）。
- 不引入额外状态管理框架（Redux/MobX），ProTable 自带请求即可覆盖 CRUD。
- 不做生产部署与 CI（本 change 仅本地可跑；部署为后续 change）。

## Decisions

### Decision 1: Ant Design Pro + ProComponents + UmiJS（Max 设计）
选定 Ant Design Pro（React 18 + TypeScript + UmiJS + Vite）+ ProComponents（ProTable/ProForm/ProDescriptions）。

**为何选它（而非 vue-pure-admin / Vue Vben / Soybean / shadcn）：**
- 后台业务以 CRUD、状态管理、配置管理、权限操作为主，正是 ProTable/ProForm 的主场，可显著减少样板代码。
- React 生态有更成熟的高热度 Agent Skills（Vercel react-best-practices / composition-patterns），配合项目级 Skill 形成双层约束。
- Ant Design Pro 开箱提供 ProLayout、菜单、路由约定、Mock、请求层（`useRequest`/`request`），脚手架成本最低。
- Element Plus（Vue）虽组件生态强，但缺少同等知名度的专属官方 Skill，需手写更多项目约束。

**取舍：** Ant Design Pro 较重，但相比 shadcn/ui（需自行拼装表格/权限/CRUD）省去大量基础工作；相比 Soybean Admin 组件生态更全。

### Decision 2: BFF 签名代理（服务端持有 SK）
采用 UmiJS 的 mock/中间件层作为 BFF 代理：浏览器请求打到同源 `/api/*`，由 Umi dev/prod 中间层在服务端用 AK/SK 对后端签名后转发。

**为何必须 BFF（而非浏览器签名/后端加 session）：**
- 浏览器签名要求 SK 进前端 bundle → 等同泄露，**不可接受**。
- 后端新增 session/login 与 `refactor-backend-v02` design.md §8 明确的"会话认证是独立后续变更、本次不动后端认证契约"冲突。
- BFF 把签名职责收敛到服务端，浏览器只持会话（未来），SK 永不离开服务端。这是前后端分离 + 安全的标配模式，对标 Ant Design Pro 官方 request 拦截器 + 后端代理思路。

**实现要点：**
- 签名串：`{METHOD}\n{REQUEST_URI}\n{TIMESTAMP}\n{BODY}`，HMAC-SHA1，base64 编码，与后端 `docs/api.md` 完全一致。
- 签名材料（AK/SK 或加密密钥）从服务端环境变量读取，绝不进客户端配置。
- 预留 `authMiddleware` 注入点：本次以配置的 AK/SK + allow-all 身份运行（仅 Mock/预置后端），后续登录 change 在此注入操作员身份并选择对应 AK/SK。

### Decision 3: 统一响应请求层
封装一个 `request` 包装器，统一处理后端 `{ code, message, data }`：
- `code === 0` → 返回 `data`。
- `code !== 0` → 抛出带 `code`/`message` 的结构化错误，ProTable/ProForm 的 `errorHandler` 统一展示 message，页面可按 `code` 分支（如 409 资源约束冲突）。

不引入自定义响应信封，BFF 透传后端统一响应原样。

### Decision 4: API Client 方法映射（单源真相）
在 `src/services/` 下按资源分文件，每个后端路由对应一个类型化方法。完整映射表：

| 后端路由 | Method | API Client 方法 | 说明 |
|---|---|---|---|
| `/api/v1/shorten/create` | POST | `shortLink.create(body)` | 创建短链，返回 code |
| `/api/v1/shorten/gen` | POST | `shortLink.gen(body)` | 创建并返回 short_url |
| `/api/v1/shorten/disable` | PUT | `shortLink.disable(code)` | 停用，不可逆 |
| `/api/v1/shorten/get` | GET | `shortLink.get(params)` | 查询短链 |
| `/api/v1/admin/tenant/create` | POST | `tenant.create(body)` | 新建租户 |
| `/api/v1/admin/tenant/list` | GET | `tenant.list(params)` | 租户列表 |
| `/api/v1/admin/tenant/grant` | PUT | `tenant.grant(id, scene_ids)` | 授权场景集合 |
| `/api/v1/admin/tenant/status` | PUT | `tenant.setStatus(id, status)` | 启停租户 |
| `/api/v1/admin/credential/create` | POST | `credential.create(body)` | 新建凭证，返回明文 SK 一次 |
| `/api/v1/admin/credential/disable` | PUT | `credential.disable(access_key)` | 停用凭证，不可逆 |
| `/api/v1/admin/domain/create` | POST | `domainEntry.create(body)` | 新建域名 |
| `/api/v1/admin/domain/list` | GET | `domainEntry.list()` | 域名列表 |
| `/api/v1/admin/domain/deploy` | PUT | `domainEntry.deploy(id)` | 投产 |
| `/api/v1/admin/domain/disable` | PUT | `domainEntry.disable(id)` | 下线（有 Scene 绑定时后端 409） |
| `/api/v1/admin/scene/create` | POST | `scene.create(body)` | 新建场景 |
| `/api/v1/admin/scene/list` | GET | `scene.list(tenant_id)` | 场景列表（按租户） |
| `/api/v1/admin/scene/configure` | PUT | `scene.configure(scene_id, body)` | 改绑域名/状态 |
| `/api/v1/admin/scene_config/set` | PUT | `sceneConfig.set(body)` | 设置配置项 |
| `/api/v1/admin/scene_config/list` | GET | `sceneConfig.list(scene_id)` | 配置列表 |
| `/api/v1/admin/scene_config/delete` | DELETE | `sceneConfig.delete(scene_id, key)` | 删除配置项 |

### Decision 5: 领域约束双保险（UI 呈现 + 后端最终校验）
UI 层主动呈现领域不变量（禁用字段、隐藏非法动作、确认提示），但**绝不把 UI 当作唯一防线**——后端是最终校验方。例如 DomainEntry 下线：UI 在有 Scene 绑定时禁用按钮并提示，后端仍以事务+行锁拒绝；UI 收到 409 时展示后端原因。

### Decision 6: Mock 优先，后端可切换
所有 API Client 经由 Umi mock 层返回代表性数据，页面先行可用。通过环境变量切换 Mock/真实后端（BFF 代理）。Mock 数据遵守领域不变量（如停用态不可再启用）。

### Decision 7: Skill 结构
`linklet-admin` Skill 放 `.claude/skills/linklet-admin/`，含：
- 领域规则清单（六大资源不变量）。
- 开发规范（ProTable/ProForm 用法、请求层、API Client 命名与位置、路由单源、TS 严格类型）。
- 生成模板约束（禁止 inline fetch、禁止 target_url 编辑控件等）。

## Target Directory Tree

```text
linklet-admin/
├── config/
│   ├── config.ts            # Umi/Ant Design Pro 配置
│   ├── proxy.ts             # BFF 代理与签名中间件
│   └── routes.ts            # 路由单源（菜单+路由同步）
├── mock/
│   ├── domain.ts  scene.ts  sceneConfig.ts
│   ├── tenant.ts  credential.ts  shortLink.ts
│   └── shared.ts            # 统一响应包装 + 状态机辅助
├── src/
│   ├── services/            # API Client（按资源分文件）
│   │   ├── index.ts  shortLink.ts  tenant.ts  credential.ts
│   │   ├── domainEntry.ts  scene.ts  sceneConfig.ts
│   │   └── typings.d.ts     # 领域类型定义
│   ├── pages/
│   │   ├── DomainEntry/  Scene/  SceneConfig/
│   │   ├── Tenant/  Credential/  ShortLink/
│   │   └── Dashboard/
│   ├── components/          # 通用组件（状态标签、确认按钮等）
│   ├── request.ts           # 统一响应请求层
│   ├── access.ts            # 权限占位（为后续登录预留）
│   └── app.tsx              # Umi 运行时配置（布局、请求拦截）
├── .claude/skills/linklet-admin/   # 领域约束 Skill
├── .umirc.ts  package.json  tsconfig.json
├── .eslintrc.js  .prettierrc.js
├── openspec/                # 已存在
├── AGENTS.md                # 项目级 Codex 约束
└── README.md
```

## Risks / Trade-offs

- **[后端 v0.2 未完成] → API 路由面可能微调**：Mitigation — API Client 单源集中，路由变更只改 `services/`；Mock 层按当前 `routes.lua` 实现，后端落地后按实际响应校准。
- **[登录延后] → BFF 当前以配置 AK/SK + allow-all 运行**：Mitigation — 仅本地/预置后端可用，绝不部署到公网；注入点已预留，登录 change 接入即收口。
- **[ProComponents 较重] → 包体积偏大**：Trade-off — 换取 CRUD 开发效率与一致性，可接受。
- **[Mock 与真实行为漂移] → Mock 可能不覆盖全部领域约束**：Mitigation — Mock 状态机显式实现关键不变量（停用不可逆、下线守卫）。
- **[跨租户共享 Scene 的 UI 表达] → 列表/授权编辑可能复杂**：Mitigation — Scene 列表展示授权租户数；Tenant 授权编辑用多选穿梭框，后端去重。

## Open Questions

- **真实后端地址与预置 AK/SK**：开发期连接后端还是纯 Mock？需确认是否已有可用的预置 AK/SK 与后端实例（影响 BFF 代理默认配置）。
- **`scene/list` 按 tenant_id 过滤**：后端 `scene/list` 要求传 `tenant_id`。无租户上下文时如何列出全部 Scene？需后端确认是否提供无租户过滤的列表（影响 Scene 管理页取数方式）。
- **Skill 注册方式**：`linklet-admin` Skill 放 `.claude/skills/` 还是项目根独立目录？取决于 Codex/CodeBuddy 的 Skill 加载机制（实现时验证）。
