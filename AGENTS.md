# AGENTS.md — linklet-admin 项目级 AI 协作约束

> 面向 Codex/AI 助手的项目约束。详细领域规则见 `.claude/skills/linklet-admin/SKILL.md`。

## 项目定位

`linklet-admin` 是 Linklet 短链平台的独立 React 管理控制台，面向平台运营人员。后端为独立 `linklet` 仓库（OpenResty/Lua），通过 HTTP API 耦合，前端不直连数据库。

## 技术栈

- React 18 + TypeScript（strict）+ UmiJS Max + Vite
- Ant Design Pro + ProComponents（ProTable/ProForm/ProDescriptions）
- 默认 Mock 数据开发，可切换真实后端（BFF 签名代理）

## 关键约束（速查）

1. **请求层**：页面禁止 inline fetch/axios，必须用 `src/services/` 类型化客户端。
2. **领域不变量**：见 `.claude/skills/linklet-admin/SKILL.md` 第一节。生成页面时严格遵守负面清单。
3. **路由单源**：`config/routes.ts`，菜单与路由同步。
4. **SK 安全**：SecretKey 仅创建时展示一次，不持久化到前端。
5. **状态不可逆**：ShortLink/TenantCredential 停用不可逆；DomainEntry 状态单向流转。

## 常用命令

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器（默认 Mock）
npm run dev:real  # 构建真实SPA并在127.0.0.1启动BFF（.env.runtime.local）
npm run build      # 生产构建
npm run lint       # ESLint + 类型检查
```

## 环境变量

- `LINKLET_BACKEND`：后端地址（默认 http://127.0.0.1:8080）
- `LINKLET_ACCESS_KEY` / `LINKLET_SECRET_KEY`：BFF 签名用（仅服务端，不进客户端 bundle）
- `MOCK`：`0` 关闭 Mock 连接真实后端

## 认证说明（重要）

BFF 代理在服务端用 AK/SK 签名，SK 永不进浏览器。**登录与会话为独立后续 change，本期不实现**，当前 BFF 以配置 AK/SK + allow-all 身份运行，仅限本地/预置后端。使用 `dev:real` 的 loopback BFF，禁止将无会话模式开放到公网。

## 真实接口集成约定

- Group有任意历史短链后禁止改绑域名；group_id/name在现有configure接口中只读。
- 短链字段为target_url；expires_at提交RFC3339或null；列表与详情都用真实业务API。
- `LINKLET_BACKEND`是Node服务端origin配置，浏览器固定同源/api；禁止前端签名或持有BFF配置SK。
- 新签发凭证允许一次临时展示SK，关闭/卸载立即销毁，禁止浏览器持久化。
- 所有列表最多100条，不宣称为全库总数。空列表与group_ids必须是数组。
- 修改接口需跑lint、组件测试、BFF测试以及`E2E_REAL=1`真实后端浏览器验收。
