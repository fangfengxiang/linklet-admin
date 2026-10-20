# Tasks — independently verifiable

## 1. Scaffolding and tooling

- [x] 1.1 Initialize Ant Design Pro project (React 18 + TS + UmiJS + Vite) via `npm create ant-design-pro` or manual scaffold; commit base structure.
- [x] 1.2 Configure `tsconfig.json` with `strict: true`; add domain `typings.d.ts`.
- [x] 1.3 Add ESLint + Prettier configs consistent with Ant Design Pro; add `npm run lint`, `npm run tsc` scripts.
- [x] 1.4 Verify `npm install && npm run dev` starts at `localhost:8000` and `npm run build` succeeds.

## 2. Types and API client

- [x] 2.1 Define TypeScript interfaces for all 7 domain entities (DomainEntry, Scene, SceneConfig, Tenant, TenantCredential, ShortLink, IDSequence) in `src/services/typings.d.ts`, reflecting field constraints (status enums, immutability markers).
- [x] 2.2 Define request/response types for every Admin API route per the design mapping table.
- [x] 2.3 Implement `src/services/{shortLink,tenant,credential,domainEntry,scene,sceneConfig}.ts` API client methods matching all 20 backend routes; no inline fetch/axios in pages.

## 3. Request layer and BFF proxy

- [x] 3.1 Implement `src/request.ts` unified response wrapper: unwrap `{code,message,data}`, throw structured error on `code!==0` with numeric code accessible to callers.
- [x] 3.2 Implement BFF signing middleware in `config/proxy.ts`: compute `{METHOD}\n{REQUEST_URI}\n{TIMESTAMP}\n{BODY}` HMAC-SHA1, attach `X-Access-Key`/`X-Signature`/`X-Timestamp`; read AK/SK from server env only.
- [x] 3.3 Verify no signing material appears in client bundle (grep build output).
- [x] 3.4 Add `authMiddleware` injection point (placeholder allow-all identity) for future login change.

## 4. Mock data

- [x] 4.1 Implement `mock/shared.ts` unified response wrapper + in-memory state machine honoring domain invariants (disable irreversible, offline guard).
- [x] 4.2 Implement mock for each resource (`mock/{domain,scene,sceneConfig,tenant,credential,shortLink}.ts`) returning representative rows for all 20 routes.
- [x] 4.3 Add env switch (MOCK vs real backend via BFF) and verify pages render non-empty with mocks.

## 5. Layout and routes

- [x] 5.1 Implement ProLayout shell with collapsable sider grouping six resources + dashboard.
- [x] 5.2 Configure `config/routes.ts` as single source so menu and routes stay in sync.
- [x] 5.3 Implement `src/app.tsx` runtime config (layout title, logo, request interceptor wiring).

## 6. DomainEntry page

- [x] 6.1 ProTable list with status tag (新增/投产/下线) and row actions.
- [x] 6.2 Create form (domain, tag, description) with validation (max 255/100/4096).
- [x] 6.3 Deploy action (新增→投产 only); disable action gated by bound-Scene check with confirmation; surface backend 409 reason.
- [x] 6.4 Verify no reverse-state action appears; only forward transitions offered.

## 7. Scene page

- [x] 7.1 ProTable list (by tenant_id filter or all); show bound domain and status.
- [x] 7.2 Create form (scene_id 1..4294967295, name, domain_entry_id).
- [x] 7.3 Configure form with `scene_id` read-only; editable name/domain_entry_id/status; rebind domain notice.
- [x] 7.4 Disable notice that existing short links continue to resolve.

## 8. SceneConfig page

- [x] 8.1 List scoped to a Scene (scene_id selector); set/delete actions.
- [x] 8.2 Set form (config_key max 128, config_value max 65536, description max 255); reject duplicate key per scene.

## 9. Tenant page

- [x] 9.1 ProTable list with status and authorized scene count.
- [x] 9.2 Create form (name).
- [x] 9.3 Grant form: multi-select transfer for scene_ids (dedup, validate existence); show shared-scene indication.
- [x] 9.4 Status toggle (1/2) with notice that existing links continue to resolve.

## 10. TenantCredential page

- [x] 10.1 ProTable list scoped to tenant; status; access_key masked.
- [x] 10.2 Create action returning plaintext SK in a copyable, dismissable modal; SK NOT retained in client state/localStorage after dismiss.
- [x] 10.3 Rotation guidance (create new, then disable old); disable action terminal (no re-enable).

## 11. ShortLink page

- [x] 11.1 ProTable list (code, target_url, scene_id, status, expires_at); filter by scene/code/status.
- [x] 11.2 Create form (target_url max 2048, scene_id, optional expires_at); empty expires_at = 永不过期.
- [x] 11.3 Gen variant returning short_url.
- [x] 11.4 Detail view with `target_url` read-only; disable action irreversible; code marked non-reusable.

## 12. linklet-admin domain Skill

- [x] 12.1 Create `.claude/skills/linklet-admin/` (or project skill location) with domain invariants list (six resources).
- [x] 12.2 Add dev conventions (ProTable/ProForm patterns, request layer, API client naming/location, route single-source, strict TS).
- [x] 12.3 Add generation constraints (no inline fetch, no target_url edit control, forward-state-only actions).

## 13. Docs and verification

- [x] 13.1 Write `AGENTS.md` summarizing project structure, domain rules, and conventions for Codex.
- [x] 13.2 Write `README.md` with setup/run/mock/env instructions.
- [x] 13.3 Audit API client against `linklet/lib/linklet/admin/routes.lua` for full route coverage.
- [x] 13.4 Verify all six resource pages render with mock data; lint and type-check pass; build succeeds.
- [x] 13.5 Confirm SK never in client bundle; confirm login/session intentionally absent (deferred change noted).
