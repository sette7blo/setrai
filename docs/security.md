# Setrai Security Model

## 1. Purpose

This document defines the security boundaries and security expectations for Setrai.

Setrai is a self-hosted fitness application with optional integrations that may handle highly sensitive credentials, including:

- Nostr private keys;
- Monero wallet seeds;
- AI provider API keys;
- authentication credentials;
- external-service tokens.

The primary security objective is simple:

> Secrets stay on the server and are never exposed to the browser.

This document describes how secrets, external integrations, logs, backups, and privileged operations must be handled.

---

## 2. Trust model

Setrai assumes that the operator controls the server on which Setrai runs.

The trusted environment includes:

```text
Setrai server process
SQLite database
server-side environment variables
configured local files
operator-controlled host
```

The browser is not considered trusted with long-term secrets.

The browser may receive:

- application data required for rendering;
- safe capability information;
- public profile information;
- wallet balance;
- wallet receive address;
- transaction history;
- transaction status;
- public Nostr identity.

The browser must not receive:

- Nostr private keys;
- Monero wallet seeds;
- AI provider secrets;
- application authentication secrets;
- raw server environment configuration.

---

## 3. Core security boundary

The primary boundary is:

```text
Browser
   ↓
HTTP API
   ↓
Setrai server
   ↓
Secrets / SQLite / integrations
```

The browser requests actions.

The server performs privileged work.

Examples:

```text
Browser requests Nostr publish
        ↓
Server creates and signs event
        ↓
Server publishes to relays
```

```text
Browser requests Monero payment
        ↓
Server validates request
        ↓
Server creates transaction
        ↓
User confirms
        ↓
Server broadcasts transaction
```

The browser should never need direct possession of the underlying private credential.

---

## 4. Environment configuration

Deployment-level secrets are stored through environment configuration.

Typical `.env` values may include:

```env
NOSTR_NSEC=
MONERO_SEED=
AI_API_KEY=
SETRAI_AUTH_PASSWORD=
```

The real `.env` file must never be committed to Git.

`.gitignore` must include:

```text
.env
.env.*
```

while allowing:

```text
.env.example
```

if required by the repository setup.

---

## 5. `.env.example`

`.env.example` must contain only placeholder values.

Allowed:

```env
NOSTR_NSEC=
MONERO_SEED=
AI_API_KEY=
```

Not allowed:

```env
NOSTR_NSEC=nsec1realprivatekey...
MONERO_SEED=actual wallet words...
AI_API_KEY=actual-secret-key
```

Comments should clearly indicate when a field is sensitive.

---

## 6. Environment lifecycle

Setrai loads deployment configuration at startup.

Changes to security-sensitive deployment configuration may require a restart.

This is intentional.

A restart boundary simplifies:

- secret loading;
- integration initialization;
- relay lifecycle;
- wallet lifecycle;
- capability evaluation.

Setrai does not need to dynamically reload every secret at runtime.

---

## 7. Nostr private-key security

Nostr integration is optional.

The private key is configured server-side.

Example:

```env
NOSTR_ENABLED=true
NOSTR_NSEC=nsec1...
```

The Nostr private key must:

- remain server-side;
- never be returned by an API;
- never be included in browser JavaScript;
- never be written to logs;
- never appear in error messages;
- never be included in telemetry;
- never be embedded in generated HTML.

The server derives the public identity from the private key.

The browser may receive:

```text
npub
hex pubkey where required
display name
avatar
profile metadata
```

The browser must never receive the private key.

---

## 8. Nostr signing

Nostr events must be signed server-side.

Preferred flow:

```text
client requests publish
      ↓
server loads canonical Setrai data
      ↓
server constructs event
      ↓
server signs using configured nsec
      ↓
server publishes to configured relays
      ↓
server returns safe publication result
```

The client should not sign events with the server's private key.

---

## 9. Nostr input validation

When Nostr is enabled, Setrai should validate the configured private key during initialization.

Invalid configuration should produce a safe startup or capability error.

The error may say:

```text
Nostr private key is invalid
```

It must not echo the configured secret.

---

## 10. Nostr relay security

Setrai may connect to public relays.

Public relays are external infrastructure and must be treated as untrusted.

Do not assume:

- availability;
- persistence;
- privacy;
- honest content;
- correct metadata;
- permanent retention.

All remote events should be treated as untrusted input.

Where signatures are expected, they must be verified before use.

Remote data should be validated before importing into canonical Setrai storage.

---

## 11. Nostr publication boundary

Publishing data to Nostr is public unless the selected event format explicitly provides privacy.

Users should not assume published training content is private.

Setrai should avoid unintentionally publishing sensitive local data.

Only the content required by the defined publication format should be sent.

Local canonical data remains independent of publication.

---

## 12. Monero wallet security

Setrai may contain an optional Monero hot wallet.

The wallet seed is one of the most sensitive values in the application.

Example:

```env
MONERO_WALLET_ENABLED=true
MONERO_SEED=
```

The seed must:

- remain server-side;
- never be sent to the browser;
- never be logged;
- never appear in an API response;
- never be shown in debug output;
- never be embedded in generated frontend assets;
- never appear in an exception returned to the client.

---

## 13. Hot-wallet model

The Setrai Monero wallet is explicitly a hot wallet.

It is intended for operational payments.

It is not intended to replace cold storage or a primary savings wallet.

Operators should use:

```text
a dedicated Setrai wallet
+
limited funds
```

rather than importing a primary long-term wallet.

This is a product security expectation, not merely documentation advice.

---

## 14. Wallet initialization

The wallet should be initialized only when:

```env
MONERO_WALLET_ENABLED=true
```

If disabled:

- the seed is not required;
- wallet libraries should not initialize unnecessarily;
- no node connection should be created;
- wallet API routes should be unavailable or return a capability-disabled response.

---

## 15. Monero node trust

Setrai may connect to public or private Monero nodes.

A remote node is not trusted with wallet secrets.

The wallet must never send:

- seed phrase;
- private spend key;
- other private wallet material

to the remote node.

The configured node should be treated as an external service that may:

- be unavailable;
- be slow;
- provide incomplete information;
- observe network-level wallet activity.

Users who want stronger privacy may configure their own node.

---

## 16. Monero receive operations

Receiving XMR may safely expose the public receive address to the browser.

Allowed browser data includes:

```text
wallet address
payment URI
QR payload
balance
transaction confirmations
```

Private wallet material remains server-side.

---

## 17. Monero send operations

Sending funds is a privileged operation.

A normal send flow must require an explicit user action.

The UI should display:

- destination;
- amount;
- fee where available;
- final confirmation.

The server must not automatically broadcast a payment simply because a destination was discovered.

---

## 18. Payment confirmation

Before broadcasting a Monero transaction, Setrai should require a clear confirmation step.

Conceptually:

```text
enter payment
     ↓
review
     ↓
confirm
     ↓
broadcast
```

The confirmation should clearly identify:

```text
destination
amount
fee
total where available
```

Background automatic spending is outside the default product model.

---

## 19. Payment API validation

Monero payment endpoints must validate:

- destination format;
- amount;
- enabled wallet capability;
- wallet readiness;
- available balance;
- required confirmation state.

Invalid requests must fail without exposing wallet secrets or internal exception details.

---

## 20. Transaction errors

Errors returned to the browser should be safe.

Allowed:

```text
Insufficient balance
Invalid address
Wallet unavailable
Node unavailable
Transaction failed
```

Avoid exposing:

```text
raw seed
private keys
raw wallet file contents
environment variables
internal stack traces containing secrets
```

---

## 21. AI provider secrets

AI providers may require API keys.

These remain server-side.

The browser may send:

```text
prompt intent
requested operation
user-visible input
```

The server communicates with the AI provider.

The browser must not receive provider credentials.

---

## 22. Local AI

Self-hosted providers such as Ollama may not require API secrets.

They should still be treated as external service boundaries.

Setrai should not assume an AI endpoint is trustworthy simply because it is on the local network.

Only required data should be sent to the provider.

---

## 23. AI data minimization

AI requests should contain only the training context needed for the requested task.

Avoid sending the entire Setrai database for ordinary requests.

For example, a request to analyze the most recent workout should normally use:

```text
recent session
relevant exercise metadata
relevant history
```

rather than:

```text
all sessions
all profile data
all body-weight history
all settings
```

This improves:

- privacy;
- performance;
- token usage;
- maintainability.

---

## 24. AI output trust

AI output is not canonical application data until the user or application explicitly accepts it.

AI-generated content should be treated as a suggestion.

Examples:

```text
generated program
exercise recommendation
training analysis
progression suggestion
```

Generated output should be validated before being persisted as structured Setrai data.

---

## 25. Browser security boundary

Everything shipped to the browser should be considered visible to the user.

Never place secrets in:

```text
HTML
JavaScript bundles
CSS
public JSON
PWA manifest
service worker
source maps
public assets
client configuration
```

The client should receive only safe application data.

---

## 26. Public directory

Everything under:

```text
public/
```

must be considered publicly accessible.

Never store:

- `.env`;
- seeds;
- private keys;
- API keys;
- wallet files;
- server configuration containing secrets

inside `public/`.

---

## 27. API responses

API responses should use explicit response shapes.

Avoid returning raw internal objects that may accidentally include sensitive fields.

Preferred:

```ts
return {
  enabled: true,
  pubkey,
  profile
}
```

Avoid:

```ts
return config.nostr
```

if the configuration object also contains:

```text
nsec
```

---

## 28. Secret redaction

Logging and error utilities should support secret redaction where practical.

Sensitive keys should be treated as forbidden log fields.

Examples:

```text
nsec
seed
privateKey
apiKey
token
password
```

When configuration is logged for diagnostics, sensitive values must be omitted or masked.

Allowed:

```text
Nostr enabled: true
Monero wallet enabled: true
AI provider: ollama
```

Not allowed:

```text
NOSTR_NSEC=nsec1...
MONERO_SEED=...
```

---

## 29. Logging

Production logs should contain enough information to diagnose problems without exposing secrets.

Safe examples:

```text
Connected to Nostr relay
Nostr publish failed
Monero node unavailable
AI provider timeout
Database migration completed
```

Unsafe examples:

```text
Signing using nsec1...
Wallet seed: ...
Authorization: Bearer ...
```

---

## 30. Stack traces

Internal stack traces may be useful for server logs during development.

They should not be sent directly to the browser in production.

Production responses should use safe error messages.

---

## 31. Authentication

If Setrai is exposed beyond a trusted local network, application authentication should be supported.

Authentication is separate from:

- Nostr identity;
- Monero identity;
- local training profile.

A Nostr private key should not automatically become the application login credential.

If authentication is implemented, it belongs in a dedicated auth module.

---

## 32. Network exposure

Self-hosting does not automatically make an application safe to expose publicly.

Recommended deployment options include:

```text
trusted LAN
VPN / mesh network
HTTPS reverse proxy
authenticated private access
```

If Setrai is exposed to the public internet, HTTPS and authentication should be strongly recommended.

---

## 33. HTTPS

Any public or remotely accessible Setrai deployment should use HTTPS.

HTTPS protects:

- authentication credentials;
- training data;
- wallet requests;
- Nostr publication requests;
- AI prompts;
- session cookies or tokens.

---

## 34. CSRF and state-changing actions

State-changing endpoints should be designed so that an unrelated website cannot silently trigger them.

This is especially important for:

```text
Monero send
Nostr publish
program deletion
backup restore
settings changes
```

The final authentication/session implementation should include appropriate CSRF protections where required by the chosen architecture.

---

## 35. Request validation

All external input must be validated.

This includes:

- API request bodies;
- query parameters;
- uploaded files;
- Nostr events;
- AI-generated structured output;
- Monero destinations;
- imported programs;
- imported exercises.

Validation should occur before canonical persistence.

---

## 36. Remote content

Data received from public services must be treated as untrusted.

Examples:

```text
Nostr event content
Nostr profile metadata
remote images
AI responses
Monero node responses
```

Do not assume external content is safe for direct HTML insertion.

UI rendering must avoid unsafe HTML injection.

---

## 37. Imported Nostr content

Before importing Nostr-discovered data into SQLite:

1. verify required signatures where applicable;
2. validate event structure;
3. validate expected event kind;
4. validate supported fields;
5. sanitize user-facing text where needed;
6. reject malformed objects.

Imported content becomes local only after validation.

---

## 38. AI-generated structured data

AI-generated programs or workouts must not be inserted blindly.

Validate:

- exercise references;
- set counts;
- rep ranges;
- weights where applicable;
- rest durations;
- supported equipment;
- required fields.

AI output should be converted into Setrai's internal types before persistence.

---

## 39. Backup security

Backups may contain sensitive personal training data.

Backups should be treated as private.

A normal Setrai backup may include:

```text
SQLite database
exercise media
application-owned local data
```

Secrets should not automatically be included unless explicitly designed.

---

## 40. `.env` backups

The `.env` file may contain:

```text
Nostr nsec
Monero seed
AI keys
passwords
```

Therefore `.env` must be treated as highly sensitive.

If operators back it up, the backup should be protected appropriately.

Setrai should not casually package `.env` into normal downloadable backups.

---

## 41. Database backups

SQLite backups contain private fitness information.

This may include:

- workout history;
- body-weight history;
- programs;
- notes;
- personal preferences.

Backup downloads should only be available to authorized users.

---

## 42. Restore security

Restore operations are privileged.

Restoring a database may overwrite current application state.

The UI should require explicit confirmation before restore.

Uploaded backup files should be validated before use.

Unexpected files must not be allowed to overwrite arbitrary server paths.

---

## 43. File uploads

If Setrai accepts images or backup files:

- validate file type;
- validate size;
- generate safe filenames;
- avoid trusting client-provided paths;
- prevent directory traversal;
- store uploads outside executable source directories where practical.

---

## 44. Docker secrets and volumes

Container deployments should keep persistent data in explicit volumes or bind mounts.

Examples:

```text
/data
/images
.env
```

The image itself should not contain the operator's real secrets.

Secrets should be provided at deployment time.

---

## 45. Container permissions

Where practical, the Setrai container should avoid running with unnecessary host privileges.

Do not require:

```text
privileged: true
```

unless a future feature explicitly justifies it.

Do not mount unrelated host directories into the container.

---

## 46. Dependency security

Keep dependencies limited and purposeful.

Avoid adding large libraries for trivial behavior.

Dependencies handling:

- cryptography;
- Nostr signing;
- Monero wallets;
- HTTP parsing;
- database access

should be reviewed carefully because vulnerabilities in these areas can have larger impact.

---

## 47. Optional capability isolation

A disabled integration should reduce attack surface.

When:

```env
NOSTR_ENABLED=false
```

Nostr routes and services should not perform privileged Nostr operations.

When:

```env
MONERO_WALLET_ENABLED=false
```

wallet routes should not initialize a wallet or permit spending.

Capability checks must exist server-side.

Hiding a button in the client is not sufficient security.

---

## 48. Client capability checks

Client capability checks exist for UX.

Example:

```text
moneroWallet=false
→ hide Wallet
```

But the server must independently enforce the same capability.

A malicious client must not be able to bypass disabled features by calling the API directly.

---

## 49. Least privilege

Features should only receive the privileges they require.

Examples:

The statistics module does not need:

```text
Nostr private key
Monero wallet access
```

The exercises module does not need:

```text
Monero seed
```

The client does not need:

```text
server environment
```

Module boundaries should reinforce least privilege.

---

## 50. Secret ownership

Secrets should have one clear owning module.

Examples:

```text
NOSTR_NSEC
→ server/config
→ nostr module
```

```text
MONERO_SEED
→ server/config
→ monero module
```

```text
AI_API_KEY
→ server/config
→ ai provider adapter
```

Avoid copying secrets into unrelated global objects.

---

## 51. Secret lifetime

Secrets should remain in memory only as needed for normal application operation.

Do not write secrets into:

```text
temporary files
cache files
debug dumps
database rows
client storage
```

unless an explicit future security design requires it.

---

## 52. Local browser storage

Browser storage should contain only data that is safe for the client to possess.

Do not store server secrets in:

```text
localStorage
sessionStorage
IndexedDB
cookies readable by JavaScript
service-worker caches
```

---

## 53. Monero wallet state

If the Monero wallet library requires persistent wallet files, those files must live in server-controlled persistent storage.

They should not be placed in:

```text
public/
src/client/
browser storage
```

Wallet files should be treated as sensitive even if encrypted.

---

## 54. Nostr profile data

Nostr profile data is public remote metadata.

It may be cached locally if useful.

Cached public profile metadata must remain distinct from:

```text
Nostr private key
```

Public profile caching must never result in private-key persistence outside the approved secret path.

---

## 55. External images

Remote images may create privacy or availability issues.

Where Setrai supports externally hosted exercise or profile images, the implementation should avoid trusting arbitrary content types or executing remote content.

Images should be rendered as media, not treated as HTML.

---

## 56. Security-sensitive operations

The following should be treated as privileged actions:

- sending Monero;
- publishing to Nostr;
- replacing configuration secrets;
- restoring backups;
- deleting large amounts of training history;
- changing authentication settings.

These operations should require explicit user intent.

---

## 57. No silent spending

Setrai must never silently spend Monero as a side effect of another action.

For example:

```text
import program
```

must never cause:

```text
automatic creator tip
```

without explicit user confirmation.

---

## 58. No silent publishing

Setrai must not publish private training content to Nostr merely because Nostr is enabled.

Publishing remains an explicit action unless a future product specification clearly introduces an opt-in automatic publishing mode.

---

## 59. Security and AI agents

Coding agents working on security-sensitive modules must read:

```text
AGENTS.md
docs/security.md
docs/architecture.md
relevant docs/modules.md entry
```

before making changes.

Security-sensitive modules include:

```text
src/server/nostr/
src/server/monero/
src/server/auth/
src/server/config/
backup/restore
```

---

## 60. Testing security boundaries

Tests should verify at minimum:

- secrets are not returned by configuration APIs;
- disabled capabilities reject privileged API actions;
- invalid Nostr keys fail safely;
- invalid Monero destinations are rejected;
- Monero sends require explicit confirmation;
- Nostr publishing does not alter local persistence on failure;
- malformed imported content is rejected;
- logs do not deliberately include secrets.

---

## 61. Test credentials

Tests must never depend on real production secrets.

Use:

```text
dummy keys
test fixtures
mock wallets
mock providers
local relay mocks
```

where practical.

Do not place real seeds or private keys in test fixtures.

---

## 62. CI security

CI must not require production secrets for ordinary tests.

Tests involving external systems should be mocked or explicitly separated.

Pull-request checks must not publish real Nostr events or send real Monero transactions.

---

## 63. Production versus development behavior

Development may expose additional diagnostics.

Production should avoid:

- raw stack traces to clients;
- verbose secret-adjacent configuration dumps;
- development-only endpoints;
- unsafe test functionality.

Production behavior should fail safely.

---

## 64. Security changes

Security boundaries should not be weakened casually.

If a feature requires changing:

- secret exposure;
- trust boundaries;
- browser/server responsibility;
- wallet confirmation behavior;
- Nostr signing responsibility;

the change must also update:

```text
docs/security.md
docs/architecture.md
docs/modules.md
```

and, where appropriate, add a decision record.

---

## 65. Security priorities

When tradeoffs arise, prioritize:

1. protecting private keys and wallet seeds;
2. preventing unauthorized spending;
3. preventing accidental public publishing;
4. protecting private training data;
5. maintaining clear server/browser boundaries;
6. minimizing unnecessary secret exposure;
7. preserving recoverability and backups.

---

## 66. Primary security rule

The simplest rule for Setrai is:

```text
The browser asks.
The server acts.
Secrets stay on the server.
```

Any feature design that requires violating this rule should receive explicit architectural review before implementation.
