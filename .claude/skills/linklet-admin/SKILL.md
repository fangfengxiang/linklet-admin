# linklet-admin Skill

> 项目级领域约束与开发规范，供 AI 稳定生成符合领域规则的页面。

## 适用范围

本 Skill 适用于 `linklet-admin` 仓库（React + Ant Design Pro + ProComponents 管理控制台）。它只负责项目特定约束，不负责通用 React 知识。

## 一、领域不变量（UI 必须呈现，后端为最终校验）

### ShortLink 短链
- `target_url`（后端字段 `dest_url`）**创建后不可修改**。详情/编辑视图必须只读，禁止生成编辑控件。
- `code` 永不复用。停用后 code 标记为永久不可用。
- 停用 **不可逆**。停用态不显示"启用"动作。
- `expires_at` 为空 = **永不过期**。表单必须支持留空。
- 创建用 `shortLink.create()`（返回 code），生成完整 URL 用 `shortLink.gen()`（返回 code + short_url）。

### DomainEntry 域名资源
- 状态流 `新增(1) → 投产(2) → 下线(3)` **不可逆**。仅显示前进动作，禁止回退动作。
- **有 Scene 绑定时禁止下线**：UI 在下线前检查/提示，后端 409 时展示后端原因。
- 投产后 `domain` 不可修改。

### Scene 场景
- `scene_id` **创建后不可修改**。配置表单中 scene_id 字段必须 disabled。
- 可改绑域名（`domain_entry_id`）。
- 停用场景 **不影响已有短链解析**，仅阻止创建新短链。需有提示。
- Scene 列表 `scene.list(tenant_id?)` 按 tenant_id 过滤。

### SceneConfig 场景配置
- `(scene_id, config_key)` **唯一**。重复 key 必须拒绝。
- `config_key` max 128，`config_value` max 65536，`description` max 255。
- 支持新增/修改/删除。

### Tenant 租户
- `scene_ids` 是 **授权集合（非所有权）**。同一场景可授权多个租户共同管理。
- 授权编辑用多选，提交前 **去重** 并校验 scene 存在性。
- 停用阻止管理 API，**不影响已有短链解析**。需有提示。

### TenantCredential 凭证
- `access_key` 不复用。
- `secret_key` **仅创建时返回明文一次**，关闭后不入本地状态/localStorage。
- 轮换 = **新建凭证** 再停用旧凭证，不原地改 SK。
- 停用 **不可逆**，停用态不显示启用动作。

## 二、开发规范

### 请求层
- 所有 API 调用必须走 `src/services/` 下类型化客户端，**禁止在页面 inline fetch/axios**。
- 客户端经 `src/services/request.ts` 解包后端统一响应 `{code,message,data}`：`code===0` 返回 data，否则抛 `DomainError(code, message)`。
- 页面按 `err.code` 分支（如 409 资源约束冲突）。

### API Client 命名
- 按资源分文件：`src/services/{shortLink,tenant,credential,domainEntry,scene,sceneConfig}.ts`。
- 方法名与后端动作对齐（create/gen/disable/list/grant/setStatus/deploy/configure/set/delete）。
- 完整路由映射见 `openspec/changes/bootstrap-admin-console/design.md`。

### 路由与菜单
- 路由 **单源** 于 `config/routes.ts`，菜单与路由必须同步。
- 新增资源页：在 `config/routes.ts` 加路由项，菜单自动反映。

### 组件使用
- 列表用 `ProTable`，表单用 `ModalForm`/`ProForm`，详情用 `Drawer`。
- 状态展示用 `src/components/StatusTag.tsx`（`DomainStatusTag` / `ActiveStatusTag`）。
- 不可逆/危险动作用 `Popconfirm` 二次确认。

### TypeScript
- `strict: true`。领域类型定义在 `src/services/typings.d.ts`。
- 禁止 `any` 用于领域模型（API client 可用 `as any` 过渡非核心类型）。

## 三、生成约束（负面清单）

生成页面时 **禁止**：
- 为 ShortLink 生成 target_url 编辑控件。
- 为 DomainEntry 生成回退状态动作。
- 为停用态资源生成"启用"动作（凭证/短链停用不可逆）。
- 把 SecretKey 持久化到前端 state/localStorage。
- 在页面内 inline fetch/axios 调用。
- 绕过 `config/routes.ts` 单独注册路由。

## 四、后端契约参考

- 统一响应：`{ code: 0|<errorCode>, message: string, data: object|null }`
- 认证：AK/SK HMAC-SHA1（`X-Access-Key`/`X-Signature`/`X-Timestamp`），签名串 `{METHOD}\n{REQUEST_URI}\n{TIMESTAMP}\n{BODY}`
- 后端仓库：`linklet`（OpenResty/Lua），路由定义见 `linklet/lib/linklet/admin/routes.lua`
