## ADDED Requirements

### Requirement: Project scaffolding and build tooling
The system SHALL bootstrap an Ant Design Pro project (React 18 + TypeScript + UmiJS + Vite) with a conventional directory structure separating `src/pages`, `src/services`, `src/components`, `src/locales`, and `mock/`. The project SHALL start with `npm install && npm run dev` and build with `npm run build` without manual patching.

#### Scenario: Developer runs the project
- **GIVEN** a clone of the `linklet-admin` repository
- **WHEN** the developer runs `npm install && npm run dev`
- **THEN** the dev server SHALL start and serve the admin layout at `http://localhost:8000`
- **AND** the build command `npm run build` SHALL produce a production bundle without errors

#### Scenario: TypeScript strict mode
- **GIVEN** the project configuration
- **WHEN** type checking runs (`tsc --noEmit` or the Umi type-check step)
- **THEN** the project SHALL pass with `strict: true` and no `any` types in domain model definitions

### Requirement: Routing and layout
The system SHALL provide a ProLayout-based shell with a collapsible sider menu grouping the six resource modules (DomainEntry, Scene, SceneConfig, Tenant, TenantCredential, ShortLink) plus a dashboard. Routes SHALL be configured in a single source so menu items and routes stay in sync.

#### Scenario: Menu reflects routes
- **GIVEN** the route configuration
- **WHEN** an operator opens the console
- **THEN** the sider menu SHALL list all six resource modules and dashboard
- **AND** each menu item SHALL navigate to its corresponding list page

### Requirement: Unified response request layer
The system SHALL provide a typed HTTP client that unwraps the backend unified response `{ code: 0|<errorCode>, message: string, data: object|null }`. The client SHALL throw/normalize a structured error when `code !== 0` and return `data` on success so pages consume plain domain objects.

#### Scenario: Successful response unwraps data
- **GIVEN** a backend response `{ "code": 0, "message": "success", "data": { "id": 1 } }`
- **WHEN** an API client method is called
- **THEN** the client SHALL return the `data` object to the caller

#### Scenario: Error response surfaces code and message
- **GIVEN** a backend response `{ "code": 409, "message": "resource constraint rejected the change", "data": null }`
- **WHEN** the API client method is called
- **THEN** the client SHALL surface an error containing both `code` and `message`
- **AND** the calling page SHALL be able to branch on the numeric `code`

### Requirement: API client mapping
The system SHALL provide a typed API client module that maps every backend Admin API and short-link business route to a named method. The mapping SHALL cover: short link create/gen/disable/get; tenant create/list/grant/status; credential create/disable; domain create/list/deploy/disable; scene create/list/configure; scene_config set/list/delete.

#### Scenario: Every route has a client method
- **GIVEN** the backend routes defined in `linklet/lib/linklet/admin/routes.lua`
- **WHEN** an audit of the API client module runs
- **THEN** each route SHALL have a corresponding typed client method
- **AND** request/response types SHALL be defined in TypeScript interfaces

### Requirement: Mock data baseline
The system SHALL include a mock layer that returns representative domain objects for every API client method, so pages render and can be developed before the backend is connected. Mocks SHALL honor domain invariants (e.g., a disabled ShortLink cannot be re-enabled in mock state).

#### Scenario: Pages render with mock data
- **GIVEN** the backend is not connected and the mock layer is enabled
- **WHEN** an operator navigates to any resource list page
- **THEN** the page SHALL render with non-empty mock rows

### Requirement: Code quality tooling
The system SHALL include ESLint and Prettier configurations consistent with Ant Design Pro conventions, enforced via lint scripts and (where applicable) pre-commit hooks.

#### Scenario: Lint passes on committed code
- **GIVEN** the project source
- **WHEN** `npm run lint` runs
- **THEN** there SHALL be zero errors
