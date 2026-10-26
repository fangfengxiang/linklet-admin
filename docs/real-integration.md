# 本地真实接口联调

管理台复用现有类型化 services 与 tester-army/e2e 框架，真实模式请求 Node BFF，再访问独立 Docker 中的 PostgreSQL/OpenResty。Mock 演示和真实验收分开收集，真实失败不会回落 Mock。

## 配置和启动

完整命令见 [README](../README.md)。`LINKLET_BACKEND` 是服务端 HTTP(S) origin，默认本地 Docker 地址为 `http://127.0.0.1:18080`。修改该值后重启 BFF 即可，前端固定同源 `/api`。`.env.runtime.local` 的 AK/SK 只给 Node 使用，不写入 Umi define、浏览器状态或存储。初始化脚本只接受本机地址，先以 `wx/0600` 预留输出文件，再签发租户凭证；拒绝覆盖已有环境。

真实模式通过 `npm run dev:real` 构建并启动，或者 `MOCK=0 npm run build` 后 `npm run serve:real`。BFF只监听127.0.0.1，检查Host/Origin，按准确URI和原始body签名业务请求；Admin请求不携带租户凭证。上游中断关闭浏览器请求，连接失败返回JSON 502。

Docker项目使用独立数据卷，开发入口通过容器loopback访问原Admin白名单。禁止把此开发入口或无会话BFF开放为公网管理服务。生产登录、会话及审计不在本次实现范围内。

## 页面与接口

| 页面 | 真实能力 |
|---|---|
| 仪表盘 | 并行查询短链/Group/域名/租户；局部失败显示错误与“—” |
| 域名 | create/list/deploy/disable，已绑定域名禁止下线 |
| Group | create/list/configure，名称/编号只读，已有历史短链冻结绑定 |
| 分组配置 | set/list/delete，支持空配置值，键不可重复新增 |
| 租户 | create/list/grant/status，授权可清空、去重，共享Group |
| 凭证 | create/list/disable，新SK仅一次临时弹窗，关闭/卸载即销毁 |
| 短链 | create/gen/list/get/disable，经服务端签名；target_url只读，RFC3339到期，停用不可逆 |

查询最多100条，不提供全库总数或游标；仪表盘显示本次返回记录数。短链列表仅查询当前启用租户被授权的Group；Group和Tenant停用不阻止历史链接解析。平台资源和业务租户的身份边界保持分离。

## 测试

```bash
npm run lint
npm test
npm run test:bff
# 先按README启动真实Docker+BFF；不从测试进程向浏览器交付签名SK
E2E_REAL=1 E2E_TENANT_ID=<初始化租户ID> APP_URL=http://127.0.0.1:8000 npm run test:e2e:real -- --workers 1 --trace on
node --env-file=.env.runtime.local scripts/check-bundle.mjs
```

真实套件用浏览器触发写入并观察HTTP/envelope、列表读回，不拦截或伪造网络响应。每次使用独立名称；只有为服务端签名租户追加本轮Group授权使用Node fixture HTTP。测试须使用隔离、可重建的本地数据库，不能指向生产。列表上限意味着长期重复测试应改用新的隔离项目/数据卷。

默认 `npm run test:e2e` 仍验证Mock演示，不能替代上面的真实验收。`.github/workflows/integration.yml` 固定Linklet提交，并在CI创建隔离数据库和OpenResty，构建真实前端、验证密钥未进入产物，再运行七页E2E。浏览器报告和临时凭证环境均被Git忽略。

## Review修复

- Umi define自行序列化值，移除重复JSON.stringify，修复MOCK=0仍误用Mock的问题。
- 去掉依赖req.body的旧代理签名，改为Node读取并转发原始字节。
- 统一target_url、RFC3339和非2xx业务错误；移除后端不支持的重命名/凭证说明编辑。
- 修复空列表/授权数组、可撤销全部授权、旧查询端点缺失，以及失败时误显示为0的仪表盘。
- 修复上游响应中断挂起、重复seed写入孤立凭证、构建取消后继续启动等运行问题。

## 本地验收记录（2026-10-27）

- `npm run lint`：ESLint、TypeScript通过；E2E配置与测试另行strict tsc通过。
- `npm test`：11文件48项通过。
- `npm run test:bff`：7项通过，包括原始字节/query签名、Admin不带租户身份、缺凭证拒绝、跨域/Host限制、中断、初始化重复保护。
- 真实Docker+BFF七页E2E：7/7通过（27.68秒），包含全部页面真实HTTP写入与读回、SK一次展示、终态停用及409业务错误显示。
- Mock演示E2E：8文件25/25通过（15.67秒）。
- 默认Mock、真实模式构建通过；真实构建未包含服务端SK。
- 后端固定提交720744e：160单测、138单实例与3多实例断言通过，合并源码覆盖率95.32%，远程Documentation和Test均成功。

本地结果不替代推送后CI；远程结果以提交对应Actions为准。
