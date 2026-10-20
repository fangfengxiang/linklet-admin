# Linklet Admin 技术栈方案

> 决策状态：**已确认**（2026-10-21）
> 后续后台设计与实现均以本方案为基准，不再比较 Vue 方案。

---

## 1. 最终技术栈

| 层次 | 技术选型 |
| --- | --- |
| 管理后台 | Ant Design Pro v6 |
| 前端语言 | React 19 + TypeScript |
| 应用框架 | Umi Max 4 |
| UI 组件库 | Ant Design 6 |
| 高级组件 | ProComponents（ProTable、ProForm 等） |
| API 通信 | 独立 API Client，连接 Linklet Admin API |
| 后端 | OpenResty + Lua |
| 数据库 | PostgreSQL |
| AI 开发 | Codex + React Skills + Ant Design Skills |

> Ant Design Pro v6 已采用 React 19、Ant Design 6 和 Umi Max 4，并提供内置 AI Skills。

---

## 2. Skills 组合（四层能力）

为保证后台实现的规范性、可复用性与性能，AI 辅助开发采用四层 Skill 能力：

1. **Ant Design 官方 Skill** —— 查询组件 API、示例与版本兼容性。
2. **Vercel React Best Practices** —— 规范 React 组件实现、性能与状态管理。
3. **Vercel Composition Patterns** —— 规范组件复用与组合方式。
4. （通用）项目内 OpenSpec —— 用 spec-driven 方式管理提案、规格与任务。

---

## 3. 选型依据

- **Ant Design Pro v6 一站式到位**：v6 已整合 React 19 + Ant Design 6 + Umi Max 4，避免自行拼装版本矩阵带来的兼容性风险。
- **中后台最佳实践**：ProTable / ProForm / ProLayout 面向管理后台典型场景（列表筛选、表单编辑、布局），减少样板代码。
- **生态成熟、AI 友好**：官方组件文档与示例丰富，配合 Ant Design 官方 Skill 可直接查询 API 与用法，提升 AI 生成代码的准确率。
- **独立 API Client**：前端通过独立 API Client 对接 Linklet Admin API，不与框架强耦合，便于测试与替换。

---

## 4. 与后端的关系

- 后端为独立仓库 `linklet`（OpenResty + Lua），数据库为 PostgreSQL。
- Admin API 路径前缀：`/api/v1/admin/*` 与 `/api/v1/shorten/*`。
- 统一后端响应结构：`{ code: 0|<errorCode>, message: string, data: object|null }`。
- 鉴权（目标）：BFF 代理模式 —— Node/Umi 中间件持有 HttpOnly 会话 Cookie，在服务端用 AK/SK 签名后端请求，SK 不暴露至浏览器。
  > Login/session 暂不在当前范围，由后续 change 处理。

---

## 5. 前端 AI 开发约束

- 一切组件实现遵循 Vercel React Best Practices；组合复用遵循 Vercel Composition Patterns。
- 组件 API、props、示例以 Ant Design 官方 Skill 查询结果为准，避免凭记忆编写过期 API。
- 功能开发遵循 OpenSpec 提案 → 规格 → 设计 → 任务流程。
