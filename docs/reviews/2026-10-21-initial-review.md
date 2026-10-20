# linklet-admin 首次提交整体 Review 报告

- 日期：2026-10-21
- 范围：首次提交前全量源码审查（排除 `src/.umi*` 生成物）
- 方式：code-reviewer subagent + `@rules:review` 判据 + 领域不变量（SKILL.md）逐条核对
- 编译状态：`tsc --noEmit` 0 错误；`eslint` 0 错误 / 12 warning（均为 `no-explicit-any`）；`npm run lint` 退出码 0

## 一、Blocker（功能性闭环缺失 / 领域不变量违规）

### B1. 短链列表永远为空——缺 `shortLink.list()`
- 事实：`src/services/shortLink.ts` 仅有 `create/gen/disable/get`，无 `list()`。
- `src/pages/ShortLink/index.tsx:80-87` 的 `request` 调 `shortLink.get({})`（单条查询接口）。
- `mock/shortLink.ts:5-9` 的 `GET /api/v1/shorten/get` 按 `code` 查找，空 code 返回 4006，`fetchAPI` 抛 `DomainError`，页面 `catch`（`:84`）吞掉返回 `[]`。
- 结论：6 大资源 CRUD 之一的列表能力缺失，违反"功能完善性/逻辑闭环"。
- 修复：新增 `shortLink.list()` service + `GET /api/v1/shorten/list` Mock 端点；页面 `request` 改调 `list()`；顺带补 `message.error`（见 M4）。

### B2. 停用态租户仍可"授权"——违反"停用阻止管理 API"
- 事实：`src/pages/Tenant/index.tsx:74-85` 操作列对停用态（status=2）仍渲染"授权"入口（`:75` 无状态守卫）。
- 定性：SKILL/AGENTS 中 **Tenant 未列入"停用不可逆"清单**（不可逆仅 ShortLink/TenantCredential），故"启用"切换本身合法；违规点在于停用态仍开放管理 API（`grant`）。
- 修复：停用态隐藏/禁用"授权"入口并提示"租户已停用，管理 API 不可用"；保留"启用"切换。

## 二、Major

- **M1 Dashboard 硬编码魔数**：`src/pages/Dashboard/index.tsx:9-25` 四个 Statistic 值写死（3/2/3/2），不调任何 API。建议接各资源 `list()` 取 count。
- **M2 app.tsx 死代码**：`src/app.tsx:10-14` 重复定义 `UnifiedResponse`（已在 `services/typings.ts:11-15` 定义且本文件未用）。删除即可。
- **M3 ProFormDigit 当筛选器**：`Credential/index.tsx:36-39`、`SceneConfig/index.tsx:32-35` 把表单字段组件放进 `toolBarRender`，语义/布局异常。改 `InputNumber` 或启用 ProTable `search`。
- **M4 ShortLink catch 吞错**：`ShortLink/index.tsx:84` 不调 `message.error`，用户见空表无反馈。（B1 重写时一并修。）
- **M5 DomainEntry 下线前无前端 Scene 绑定预检**：`DomainEntry/index.tsx:90-99` 仅 Popconfirm 文字提示，不实查绑定。SKILL 要求"UI 在下线前检查/提示"；后端 409 兜底已具备，前端预检属增强。
- **M6 页面层 `as any`**：Tenant/DomainEntry/Scene/SceneConfig 的 `ModalForm onFinish values` 直接 `as any` 传 service（即 12 个 lint warning 来源）。SKILL 允许"API client 层 as any 过渡非核心类型"，但页面层应具名断言。

## 三、Minor / Nit（择期）

- m1 各页 `useRef<any>()` → `useRef<ActionType>()`。
- m2 `access.ts:9` `Boolean(currentUser) || true` 恒真，表达式误导。
- m3 ShortLink/Tenant 表 scene_id 只显数字，建议映射名称或 `valueEnum`。
- m4 DomainEntry 缺"下线时间"列。
- m5 Scene configure `initialValues` 传整对象含无关字段。
- m6 ShortLink create Mock 不校验 scene 存在（gen 校验了，不一致）。
- m7 Scene configure Mock 不校验 domain 投产状态。
- m8 Credential Mock 不校验 AK 唯一性。
- m9 ShortLink 单字段套 `ProForm.Group`。
- m10 ShortLink `Field` 用 `React.ReactNode` 全局命名空间，建议 `import type { ReactNode }`。
- m11 `.umirc.ts:57-59` 签名读 `req.body` 在 `MOCK=0` 时可能未解析（body-parser 顺序）。Mock 模式不触发，真实后端对接时再校准。
- n1 多处硬编码 `#ff4d4f`/`#999`，应用 antd design token。
- n2-n4 详见 reviewer 原文，均为打磨项。

## 四、领域不变量核对

| 不变量 | 状态 | 备注 |
|---|---|---|
| ShortLink target_url 不可改 | ✅ | 详情只读，无编辑控件 |
| ShortLink code 不复用 | ✅ | 停用标记 status=2 |
| ShortLink 停用不可逆 | ✅ | 停用态无"启用" |
| ShortLink expires_at 空=永不过期 | ✅ | 表单留空，`|| null` |
| DomainEntry 状态单向 | ✅ | 仅前进动作 |
| DomainEntry 有 Scene 绑定禁下线 | ⚠️ | 后端 409 OK，前端无预检（M5） |
| DomainEntry 投产后 domain 不可改 | ✅ | 无编辑表单 |
| Scene scene_id 不可改 | ✅ | 配置表单 disabled |
| Scene list 按 tenant_id 过滤 | ✅ | service+mock 支持 |
| Scene 停用不影响解析 | ✅ | Alert 提示 |
| SceneConfig (scene_id,config_key) 唯一 | ✅ | Mock upsert |
| SceneConfig 长度限制 | ✅ | rules max 128/65536/255 |
| Tenant scene_ids 前端去重 | ⚠️ | 依赖后端/Mock 去重，前端未显式去重 |
| Tenant 停用阻管理 | ❌ | 停用态仍可授权（B2） |
| Credential SK 仅创建时返回 | ✅ | 一次性 Modal |
| Credential SK 不入 localStorage | ✅ | 关闭即清 |
| Credential 轮换=新建+停用旧 | ✅ | 无原地改 |
| Credential 停用不可逆 | ✅ | 停用态无启用 |
| Credential AK 不复用 | ⚠️ | Mock 未校验唯一性（m8） |

## 五、推荐修复范围（提交前，待用户确认）

**必修（闭环 + 不变量 + 安全）**
1. B1：`shortLink.list()` service + Mock `/shorten/list` + 页面改调 `list()` + 补 `message.error`（含 M4）
2. B2：停用态租户阻断"授权"入口（保留启用切换）
3. M2：删 `app.tsx` 重复 `UnifiedResponse`
4. `.gitignore`：补 `.env` / `.env.*`（预防真实 AK/SK 误提交）

**建议同批（快、价值高）**
5. M1：Dashboard 接各 `list()` 取 count

**作 follow-up 迭代（择期，不阻提交）**
- M3、M5、M6、m1-m11、n1-n4

## 六、总体结论

**需修复后提交**。必修项 1-4 解决一个功能闭环缺失（B1）、一个领域不变量违规（B2）、一处死代码（M2）与一处提交安全（.gitignore），均低风险。修完重跑 `lint`/`build` 验收后即可首次 commit + push。
