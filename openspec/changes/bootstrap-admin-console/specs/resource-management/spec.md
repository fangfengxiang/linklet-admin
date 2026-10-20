## ADDED Requirements

### Requirement: DomainEntry management page
The system SHALL provide a DomainEntry list page (ProTable) and forms for create/deploy/disable. The page SHALL reflect the irreversible status flow `新增(1) → 投产(2) → 下线(3)` and SHALL surface a guard when a DomainEntry has a bound Scene, preventing the offline action at the UI level (backend remains the final authority).

#### Scenario: Status flow is irreversible
- **GIVEN** a DomainEntry in status `投产(2)`
- **WHEN** the operator views the row actions
- **THEN** the UI SHALL NOT offer a "return to 新增" action
- **AND** the only forward state action SHALL be "下线"

#### Scenario: Offline blocked when Scene bound
- **GIVEN** a deployed DomainEntry that is currently bound by one or more Scenes
- **WHEN** the operator attempts the "下线" action
- **THEN** the UI SHALL warn that the domain is bound to Scenes and SHALL require confirmation
- **AND** if the backend rejects with code 409, the UI SHALL display the backend reason

#### Scenario: Deploy transitions new to deployed
- **GIVEN** a DomainEntry in status `新增(1)`
- **WHEN** the operator clicks "投产"
- **THEN** the status SHALL advance to `投产(2)` and `enabled_at` SHALL be set

### Requirement: Scene management page
The system SHALL provide a Scene list page and forms for create/configure. The page SHALL enforce that `scene_id` is immutable after creation and SHALL allow rebinding the bound DomainEntry. The page SHALL communicate that disabling a Scene does NOT affect existing short-link resolution.

#### Scenario: scene_id immutable
- **GIVEN** an existing Scene
- **WHEN** the operator opens the edit/configure form
- **THEN** the `scene_id` field SHALL be read-only/disabled
- **AND** only `name`, `domain_entry_id`, and `status` SHALL be editable

#### Scenario: Rebind domain
- **GIVEN** a Scene bound to DomainEntry A
- **WHEN** the operator changes the binding to DomainEntry B (deployed)
- **THEN** the change SHALL be submitted via the configure action
- **AND** the UI SHALL note that historical short links will resolve under the newly bound domain

#### Scenario: Disable does not affect existing links
- **GIVEN** a Scene with active short links
- **WHEN** the operator sets the Scene status to `停用(2)`
- **THEN** the UI SHALL display a notice that existing short links continue to resolve

### Requirement: SceneConfig management page
The system SHALL provide a SceneConfig list and set/delete interface scoped to a Scene. The page SHALL allow adding, editing, and deleting key-value config entries with `config_key` (max 128) and `config_value` (max 65536).

#### Scenario: Add config entry
- **GIVEN** a selected Scene
- **WHEN** the operator adds a new `(config_key, config_value)` pair
- **THEN** the entry SHALL be persisted via the scene_config set action
- **AND** a duplicate `config_key` for the same Scene SHALL be rejected

### Requirement: Tenant management page
The system SHALL provide a Tenant list page and forms for create/grant/status. The page SHALL model `scene_ids` as an authorization set (not ownership) and SHALL allow granting multiple Scenes to a Tenant. The page SHALL communicate that disabling a Tenant blocks management API but does NOT affect existing short-link resolution.

#### Scenario: Grant scene authorization set
- **GIVEN** a Tenant and a set of available Scenes
- **WHEN** the operator grants Scenes to the Tenant
- **THEN** the `scene_ids` array SHALL be deduplicated and submitted via the grant action
- **AND** the UI SHALL validate that granted scene_ids reference existing Scenes

#### Scenario: Shared scene across tenants
- **GIVEN** Tenant A and Tenant B both granted Scene 1001
- **WHEN** the operator views Scene 1001
- **THEN** the UI SHALL indicate that multiple tenants are authorized to manage links under it

#### Scenario: Disable tenant notice
- **GIVEN** a Tenant with active short links under its Scenes
- **WHEN** the operator sets the Tenant status to `停用(2)`
- **THEN** the UI SHALL display a notice that existing short links continue to resolve

### Requirement: TenantCredential management page
The system SHALL provide a TenantCredential list page and actions for create/disable. The page SHALL enforce that an AccessKey is never reused, a SecretKey is never edited in place, and rotation is performed by creating a new credential. The plaintext SecretKey SHALL be displayed exactly once at creation time and SHALL NOT be persistently stored in frontend state.

#### Scenario: SK shown only at creation
- **GIVEN** a credential create action that returns a plaintext `secret_key`
- **WHEN** the response is received
- **THEN** the UI SHALL display the `secret_key` once in a copyable, dismissable modal
- **AND** the `secret_key` SHALL NOT be retained in client state or local storage after dismissal

#### Scenario: Rotation via new credential
- **GIVEN** an existing credential
- **WHEN** the operator wants to rotate keys
- **THEN** the UI SHALL guide creating a new credential (not editing the existing SK)
- **AND** the old credential MAY then be disabled

#### Scenario: Disable is terminal
- **GIVEN** a credential in status `停用(2)`
- **WHEN** the operator views the row actions
- **THEN** the UI SHALL NOT offer a re-enable action
- **AND** the AccessKey SHALL be presented as permanently unusable

### Requirement: ShortLink management page
The system SHALL provide a ShortLink list page (ProTable) and create form, plus a disable action. The page SHALL enforce that `target_url` is immutable after creation, `code` is never reused, and disabling is irreversible. The create form SHALL support an optional `expires_at`; an empty `expires_at` SHALL mean the link never expires.

#### Scenario: target_url immutable
- **GIVEN** an existing ShortLink
- **WHEN** the operator opens the detail/edit view
- **THEN** the `target_url` field SHALL be read-only
- **AND** no edit action SHALL be offered for `target_url`

#### Scenario: Create with no expiration
- **GIVEN** the create form with `expires_at` left empty
- **WHEN** the operator submits
- **THEN** the request SHALL omit `expires_at` (or send null)
- **AND** the resulting link SHALL be presented as "永不过期"

#### Scenario: Disable is irreversible
- **GIVEN** an active ShortLink
- **WHEN** the operator disables it
- **THEN** the status SHALL transition to `停用(2)`
- **AND** the UI SHALL NOT offer a re-enable action
- **AND** the `code` SHALL be marked as permanently non-reusable

#### Scenario: Create returns code and optional short_url
- **GIVEN** a create request with `target_url` and `scene_id`
- **WHEN** the operator uses the create action
- **THEN** the response SHALL include the generated `code`
- **AND** when using the gen action, the response SHALL additionally include `short_url`
