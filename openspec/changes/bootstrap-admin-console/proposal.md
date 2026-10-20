## Why

Linklet 后端（独立 `linklet` 仓库，OpenResty/Lua）已具备 Core + Admin API + Gateway 三模块，v0.2 重构正在收敛七表领域模型。后端 Admin API（`/api/v1/admin/*`、`/api/v1/shorten/*`）目前仅面向程序化 AK/SK HMAC 调用，缺少面向平台运营人员的可视化管理界面。本仓库 `linklet-admin` 作为独立前端，需从零搭建一套基于 Ant Design Pro + ProComponents 的管理控制台，让运营人员以表单/表格方式管理六大领域资源，并固化为可被 Codex 批量复用的开发规范。

现在做的原因：后端 v0.2 领域模型已收敛（七表 + Tenant 授权集合），Admin API 路由面已稳定，前端有了稳定的契约基础；若再推迟，运营仍只能手搓 curl 调 AK/SK 签名接口，效率低且易错。

## What Changes

- 新建 Ant Design Pro（React 18 + TypeScript + UmiJS + Vite）工程脚手架：目录结构、布局、路由、ESLint/Prettier、TypeScript 严格类型。
- 建立请求层与 API Client：按后端统一响应 `{code,message,data}` 封装；映射全部 Admin API 路由到类型化客户端方法。
- 建立 **BFF 签名代理层**：Node/Umi 中间件在服务端用 AK/SK 对后端请求签名代理，SK 不出服务端；浏览器侧以 Mock/旁路方式先行，为后续登录会话 change 预留接口。**本次不含登录与会话**（显式排除）。
- 实现六大资源 CRUD 页面（ProTable + ProForm）：DomainEntry、Scene、SceneConfig、Tenant、TenantCredential、ShortLink，覆盖列表/表单/详情/状态操作。
- 在 UI 层呈现并约束领域不变量：ShortLink `target_url` 不可编辑、`code` 永不复用、停用不可逆；DomainEntry 状态单向流转且有 Scene 绑定时禁止下线；Scene `scene_id` 不可改、可改绑域名；TenantCredential AK 不复用、停用不可逆；Tenant `scene_ids` 授权集合编辑。
- 编写 `linklet-admin` Agent Skill：固化上述领域约束与项目开发规范（表格/表单/API Client/路由约定），供 Codex 批量生成符合领域规则的页面。

## Capabilities

### New Capabilities
- `admin-scaffold`: Ant Design Pro 工程初始化、布局与路由、请求层与统一响应封装、TypeScript 类型定义、ESLint/Prettier 规范、Mock 数据基线。
- `resource-management`: 六大资源（DomainEntry/Scene/SceneConfig/Tenant/TenantCredential/ShortLink）的列表、表单、详情与状态操作页面，及其领域不变量的 UI 呈现与约束。
- `bff-proxy`: 服务端 AK/SK HMAC 签名代理层，SK 不进浏览器；为后续登录会话 change 预留认证注入点（本次不实现登录）。
- `domain-constraints-skill`: linklet-admin Agent Skill，固化领域规则与项目开发规范，供 Codex 稳定复用。

### Modified Capabilities
<!-- 本仓库为全新前端，openspec/specs/ 当前为空，无既有 capability 需修改。 -->

## Impact

- **新增代码**：`linklet-admin` 全部前端工程（src/、config/、mock/、.umirc.ts、package.json 等）。
- **依赖后端契约**：消费 `linklet` 仓库的 Admin API 与短链业务 API（见 `linklet/docs/api.md`、`linklet/lib/linklet/admin/routes.lua`）。前端不直连 PostgreSQL。
- **依赖关系**：本仓库与 `linklet` 后端为两个独立仓库，通过 HTTP API 耦合；后端 v0.2 重构（`linklet/openspec/changes/refactor-backend-v02`）进行中的路由面变更需在 API Client 中同步跟踪。
- **认证**：BFF 代理为目标架构；登录与会话作为独立后续 change，本次仅搭建代理骨架与 Mock，不暴露真实 AK/SK 到浏览器。
- **领域约束 Skill**：作为 `.claude/skills/` 或项目级 Skill 纳入，影响后续所有 Codex 生成的页面行为。
