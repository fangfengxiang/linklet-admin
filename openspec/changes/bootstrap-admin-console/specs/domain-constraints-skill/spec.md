## ADDED Requirements

### Requirement: Skill encapsulates domain invariants for generation
The system SHALL provide a `linklet-admin` Agent Skill that encodes the domain invariants so Codex-generated pages conform to domain rules rather than producing generic CRUD. The Skill SHALL document at minimum: ShortLink `target_url` immutable and `code` non-reusable and disable irreversible; DomainEntry status flow irreversible and offline blocked when Scene bound; Scene `scene_id` immutable and rebind allowed; TenantCredential SK shown once and rotation via new credential; Tenant `scene_ids` as authorization set.

#### Scenario: Generated ShortLink form omits target_url edit
- **GIVEN** the Skill is installed and active
- **WHEN** Codex generates a ShortLink detail view
- **THEN** the generated code SHALL render `target_url` as read-only
- **AND** SHALL NOT include an edit action for `target_url`

#### Scenario: Generated DomainEntry page enforces flow
- **GIVEN** the Skill is installed and active
- **WHEN** Codex generates a DomainEntry page
- **THEN** the generated row actions SHALL only offer forward state transitions
- **AND** SHALL surface a bound-Scene guard on the offline action

### Requirement: Skill encapsulates project conventions
The Skill SHALL document the project's development conventions so generated code is consistent: ProTable/ProForm usage patterns, the unified response request layer, API client method naming and location, route/menu single-source configuration, and TypeScript strict typing for domain models.

#### Scenario: Generated page uses the request layer
- **GIVEN** the Skill is installed and active
- **WHEN** Codex generates a resource list page
- **THEN** the generated code SHALL use the project's typed API client and unified response layer
- **AND** SHALL NOT inline raw `fetch`/`axios` calls

#### Scenario: Generated route appears in menu
- **GIVEN** the Skill is installed and active
- **WHEN** Codex adds a new resource page
- **THEN** the generated code SHALL register the route in the single-source route config
- **AND** the menu SHALL reflect the new entry
