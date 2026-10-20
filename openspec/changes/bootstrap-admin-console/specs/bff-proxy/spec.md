## ADDED Requirements

### Requirement: Server-side AK/SK signing proxy
The system SHALL provide a BFF proxy layer (Node/Umi middleware) that signs outgoing requests to the backend with the AK/SK HMAC-SHA1 scheme. The proxy SHALL compute the signature string `{METHOD}\n{REQUEST_URI}\n{TIMESTAMP}\n{BODY}` and attach `X-Access-Key`, `X-Signature`, `X-Timestamp` headers. The signing key (decrypted SK or the encryption key) SHALL reside only in server-side environment/config.

#### Scenario: Proxy signs a backend request
- **GIVEN** a browser-side API call to a resource endpoint
- **WHEN** the request transits the BFF proxy
- **THEN** the proxy SHALL attach valid `X-Access-Key`, `X-Signature`, `X-Timestamp` headers
- **AND** the backend SHALL accept the signed request as authenticated

### Requirement: SK isolation from the browser
The system SHALL NOT expose the SecretKey, the encryption key, or any signing secret to the browser bundle, localStorage, or any client-accessible state. Only the BFF proxy on the server side SHALL hold signing material.

#### Scenario: No secret in client bundle
- **GIVEN** the production build output
- **WHEN** the client bundle is inspected
- **THEN** no SecretKey value, encryption key, or signing material SHALL be present in any client asset

### Requirement: Auth injection point for future login
The BFF proxy SHALL expose an injection point (middleware hook) where a future login/session change can attach the operator's identity and select the appropriate AK/SK for signing. In this change, the proxy SHALL operate with a configured AK/SK and a placeholder/allow-all identity so pages work against Mock or a pre-provisioned backend; login/session is explicitly deferred to a follow-up change.

#### Scenario: Future session change is additive
- **GIVEN** the BFF proxy with the auth injection point
- **WHEN** a follow-up change adds operator login
- **THEN** the change SHALL be implementable by plugging into the injection point
- **AND** SHALL NOT require rewriting the signing or client layers

### Requirement: Backend addressability and unified response passthrough
The BFF proxy SHALL forward the backend unified response `{ code, message, data }` unchanged to the client (or let the client request layer unwrap it). The proxy SHALL NOT invent its own response envelope.

#### Scenario: Backend response passes through
- **GIVEN** a backend response `{ "code": 0, "message": "success", "data": {...} }`
- **WHEN** the proxy forwards it to the browser
- **THEN** the browser client SHALL receive the identical `code`, `message`, and `data`
