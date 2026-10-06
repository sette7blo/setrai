# Setrai Architecture

## 1. Purpose

This document defines the technical architecture of Setrai.

Setrai is a self-hosted fitness application designed around:

- a server-side application;
- SQLite as the canonical data store;
- a browser/PWA client;
- optional AI capabilities;
- optional Nostr integration;
- an optional Monero hot wallet;
- strict module boundaries so coding agents can work on small parts of the repository without loading unrelated code.

This document defines how the system is organized and which parts of the code are allowed to depend on which other parts.

`docs/instruction.md` defines product behavior.

`docs/modules.md` defines ownership and file locations.

This document defines the architectural boundaries that implementations must follow.

---

## 2. Core architectural principles

### 2.1 Self-hosted first

Setrai is designed to run as a self-hosted application.

The default deployment model is:

```text
Browser / PWA
      ↓
Setrai server
      ↓
SQLite
```

Setrai must not require:

- a Setrai-operated cloud account;
- a Setrai-operated relay;
- a Setrai-operated Monero node;
- a third-party identity provider;
- an external application backend.

Optional integrations may use public infrastructure configured by the operator.

### 2.2 Server is authoritative

The Setrai server is the canonical application backend.

SQLite is the source of truth for application data such as:

- exercises;
- programs;
- program exercises;
- workout sessions;
- logged sets;
- statistics inputs;
- body-weight history;
- settings and application state.

The browser must not become an independent source of truth for core application data.

Client-side caching may be used for performance or offline behavior later, but it must not replace the canonical server data model unless explicitly specified.

### 2.3 Core training features must not depend on optional integrations

The following must work when all optional integrations are disabled:

- exercise library;
- program creation and editing;
- workout sessions;
- set logging;
- rest timers;
- statistics;
- recovery calculations;
- body-weight tracking;
- local profile/preferences;
- backup and restore;
- normal self-hosted operation.

The core application must not require:

- Nostr;
- Monero;
- AI.

Optional capabilities must enhance Setrai rather than define its basic operation.

### 2.4 Optional capabilities are enabled by configuration

Optional modules are controlled through environment configuration.

Examples:

```env
AI_ENABLED=true
NOSTR_ENABLED=false
MONERO_WALLET_ENABLED=false
```

Capabilities are evaluated when Setrai starts.

Changing deployment configuration may require restarting Setrai.

The browser should not inspect environment variables directly.

Instead, the server exposes safe capability information to the client.

Example:

```json
{
  "ai": true,
  "nostr": false,
  "moneroWallet": false
}
```

### 2.5 Secrets remain server-side

The browser must never receive server secrets.

This includes, but is not limited to:

- Nostr private keys;
- Monero wallet seeds;
- API keys;
- backend authentication secrets;
- internal signing material.

Secrets must never be exposed through:

- API responses;
- browser JavaScript;
- logs;
- errors;
- debug output;
- telemetry;
- generated client bundles.

---

## 3. Repository structure

The expected high-level structure is:

```text
setrai/
├── .github/
│   └── workflows/
│
├── docs/
│   ├── instruction.md
│   ├── architecture.md
│   ├── modules.md
│   ├── security.md
│   ├── configuration.md
│   └── decisions/
│
├── src/
│   ├── server/
│   │   ├── config/
│   │   ├── db/
│   │   ├── exercises/
│   │   ├── programs/
│   │   ├── sessions/
│   │   ├── statistics/
│   │   ├── recovery/
│   │   ├── ai/
│   │   ├── nostr/
│   │   └── monero/
│   │
│   └── client/
│       ├── app/
│       ├── exercises/
│       ├── workouts/
│       ├── statistics/
│       ├── recovery/
│       ├── profile/
│       ├── quick-workout/
│       ├── discover/
│       └── shared/
│
├── scripts/
│   └── check-architecture.mjs
│
├── tests/
├── public/
│
├── .env.example
├── .gitignore
├── AGENTS.md
├── CHANGELOG.md
├── README.md
├── package.json
├── Dockerfile
└── compose.yaml
```

The exact implementation may evolve, but new structure must preserve the ownership and dependency rules in this document.

---

## 4. Server architecture

The server is divided into feature modules.

Each feature should own its own business logic.

Example:

```text
src/server/exercises/
src/server/programs/
src/server/sessions/
src/server/statistics/
```

Feature modules should normally contain small focused files such as:

```text
routes.ts
service.ts
types.ts
```

Additional files should be named after the specific behavior they own.

Avoid generic files that accumulate unrelated logic.

Bad:

```text
utils.ts
helpers.ts
misc.ts
common.ts
manager.ts
```

Preferred:

```text
exercise-filter.ts
session-summary.ts
program-validator.ts
relay-publisher.ts
wallet-send.ts
```

---

## 5. Database architecture

### 5.1 SQLite is canonical

SQLite is the canonical persistent store for Setrai.

The database layer lives under:

```text
src/server/db/
```

Recommended structure:

```text
src/server/db/
├── connection.ts
├── schema.ts
├── migrations.ts
└── repositories/
    ├── exercises.ts
    ├── programs.ts
    ├── sessions.ts
    ├── body.ts
    └── settings.ts
```

### 5.2 Database access through repositories

Feature modules must not execute arbitrary SQL directly.

Database access must go through repository modules.

Example:

```ts
exerciseRepository.getById(id)
programRepository.getById(id)
sessionRepository.getRecent(limit)
```

This keeps SQL ownership centralized and prevents database details from spreading through the application.

### 5.3 Repositories contain persistence logic, not product behavior

Repositories should contain:

- queries;
- inserts;
- updates;
- deletes;
- persistence mapping.

Repositories should not contain:

- UI logic;
- Nostr event construction;
- Monero logic;
- AI prompts;
- business rules unrelated to persistence.

Business behavior belongs in feature services.

---

## 6. Feature service boundaries

Each feature should expose a small service contract.

For example:

```ts
exerciseService.getExercise(id)
exerciseService.searchExercises(query)
exerciseService.getPublishableExercise(id)
```

```ts
programService.getProgram(id)
programService.createProgram(input)
programService.getPublishableProgram(id)
```

```ts
sessionService.startSession(programId)
sessionService.logSet(input)
sessionService.finishSession(sessionId)
```

Other features should use these contracts instead of importing internal implementation files.

---

## 7. Cross-feature dependency rules

Features must not freely import from each other's internals.

For example, the Nostr module may need program data.

Allowed:

```text
nostr
  ↓
program service contract
  ↓
program repository
```

Not allowed:

```text
nostr
  ↓
program internal SQL
```

Likewise, AI may need session history.

Allowed:

```text
ai
  ↓
session service
  ↓
session repository
```

Not allowed:

```text
ai
  ↓
session repository internal implementation
```

Cross-feature access should happen through explicit service contracts.

---

## 8. Client architecture

The browser client is organized by feature.

Expected structure:

```text
src/client/
├── app/
├── exercises/
├── workouts/
├── statistics/
├── recovery/
├── profile/
├── quick-workout/
├── discover/
└── shared/
```

Feature-specific UI and logic must remain in the owning feature.

For example:

```text
src/client/exercises/
```

owns:

- exercise library UI;
- exercise cards;
- exercise filters;
- favorites UI;
- exercise detail views.

It should not own:

- workout runner logic;
- Monero wallet behavior;
- Nostr relay logic.

---

## 9. Client/server boundary

The client communicates with the server through HTTP APIs.

The server owns:

- persistence;
- secrets;
- external integration credentials;
- Nostr signing;
- Monero wallet operations;
- AI provider credentials;
- privileged business logic.

The client owns:

- rendering;
- user interaction;
- local view state;
- navigation;
- presentation formatting.

The client must not need direct access to secrets or low-level integration libraries.

---

## 10. Capability system

Optional integrations are exposed to the client as capabilities.

The client should consume a safe endpoint such as:

```text
GET /api/capabilities
```

Example response:

```json
{
  "ai": true,
  "nostr": true,
  "moneroWallet": false
}
```

The client uses capabilities to decide which UI surfaces to render.

Example:

```text
nostr = false
→ hide Discover
→ hide Publish
→ hide Nostr profile identity
```

```text
nostr = true
→ show Discover
→ show Publish
→ show Nostr profile identity
```

The client must not infer capabilities from unrelated conditions.

---

## 11. AI architecture

AI is an optional server-side capability.

Expected location:

```text
src/server/ai/
```

Recommended structure:

```text
provider.ts
ollama.ts
coach.ts
prompts.ts
routes.ts
```

The AI module must not own canonical training data.

It should request training information through service contracts.

Example:

```text
AI coach
   ↓
session service
program service
exercise service
recovery service
```

AI providers must be isolated behind a provider interface.

Example:

```ts
interface AiProvider {
  generateText(request: AiRequest): Promise<AiResponse>
}
```

This allows different backends such as:

```text
Ollama
other local providers
optional remote providers
```

without changing the rest of Setrai.

AI must remain optional.

Setrai must continue to function when:

```env
AI_ENABLED=false
```

---

## 12. Nostr architecture

Nostr is an optional integration.

Expected location:

```text
src/server/nostr/
```

Recommended structure:

```text
config.ts
signer.ts
relays.ts
profile.ts
discover.ts
publish.ts
```

Nostr is controlled by:

```env
NOSTR_ENABLED=false
```

When disabled:

- no Nostr private key is required;
- no relay pool is initialized;
- no profile lookup occurs;
- Nostr discovery is unavailable;
- publishing controls are unavailable.

When enabled:

- Setrai validates the configured private key;
- derives the public identity;
- initializes configured relays;
- loads profile metadata as needed;
- enables discovery and publishing.

The Nostr private key remains server-side.

The browser must never receive the Nostr private key.

### 12.1 Nostr is an integration, not the data layer

Setrai data remains ordinary SQLite data.

Nostr publication is an optional export/publication action.

A program or exercise must remain usable locally even if:

- Nostr is disabled;
- relays are unavailable;
- publication fails.

Nostr metadata may be stored alongside local entities when needed.

Examples:

```text
nostr_event_id
nostr_pubkey
nostr_address
nostr_published_at
```

These fields do not make Nostr authoritative.

---

## 13. Monero architecture

Monero is an optional hot-wallet capability.

Expected location:

```text
src/server/monero/
```

Recommended structure:

```text
config.ts
wallet.ts
node.ts
balance.ts
receive.ts
send.ts
transactions.ts
routes.ts
```

Controlled by:

```env
MONERO_WALLET_ENABLED=false
```

When disabled:

- no wallet is initialized;
- no seed is required;
- wallet UI is hidden;
- no node connection is created.

When enabled:

- the wallet is initialized server-side;
- the configured seed remains server-side;
- Setrai connects to the configured public or self-hosted Monero node;
- wallet features become available.

Expected wallet capabilities may include:

- balance;
- receive address;
- QR receive flow;
- send payment;
- transaction history;
- Nostr creator tipping.

### 13.1 Hot-wallet boundary

The Monero wallet is explicitly a hot wallet.

Operators should use a dedicated Setrai wallet rather than a primary savings wallet.

The seed must never:

- be returned by an API;
- be embedded in browser code;
- be logged;
- appear in error messages.

The client asks the server to perform wallet actions through defined APIs.

---

## 14. Nostr and Monero interaction

Nostr and Monero are separate features.

Neither feature may directly import the other's internal implementation.

If Nostr discovery exposes a creator payment address, the client or orchestration layer may request a payment through a public wallet contract.

Example:

```text
Nostr creator profile
        ↓
payment target
        ↓
Monero wallet service
        ↓
send()
```

The Nostr module must not reach into Monero wallet internals.

The Monero module must not understand Nostr events.

---

## 15. Recovery architecture

Recovery is a core training feature.

Expected location:

```text
src/server/recovery/
```

Recovery calculations should consume training history through session services or documented data contracts.

Recovery should not depend on AI.

AI may consume recovery output, but recovery logic must remain deterministic and available when AI is disabled.

Example:

```text
sessions
   ↓
recovery calculation
   ↓
recovery state
   ↓
AI coach optional
```

---

## 16. Statistics architecture

Statistics are derived from canonical workout data.

Expected location:

```text
src/server/statistics/
```

Statistics should consume documented data from:

- sessions;
- logged sets;
- exercises;
- body-weight history.

Statistics should not modify training data.

The statistics module is read-oriented.

---

## 17. Module size policy

Setrai is intentionally optimized for maintenance by AI coding agents.

Source modules should remain small enough that an agent can understand the owning feature without loading large unrelated files.

### Preferred size

Prefer:

```text
100–300 lines
```

for handwritten source files.

### Normal maximum

The normal maximum is:

```text
400 lines
```

for handwritten source files.

### Existing oversized files

If an existing file exceeds the normal maximum:

- it may shrink;
- it may remain stable temporarily;
- it must not grow without an explicit architectural reason.

When an oversized file is materially changed, splitting it should be considered part of the work.

### Exemptions

Reasonable exemptions include:

- generated files;
- generated schemas;
- fixtures;
- vendored code;
- compiled assets;
- data files.

Exemptions must not be used to hide ordinary application logic.

---

## 18. Import discipline

Modules should have small dependency surfaces.

A feature should normally be understandable by reading:

1. its own directory;
2. documented shared contracts;
3. explicitly listed dependencies in `docs/modules.md`.

Avoid broad dependency graphs.

A feature should not require scanning the entire repository to understand its behavior.

---

## 19. Shared code

Shared code lives under:

```text
src/client/shared/
```

and, if needed:

```text
src/server/shared/
```

Shared modules must contain genuinely cross-cutting behavior.

Do not move code into `shared` merely because two files use it.

A shared abstraction should normally have:

- at least two real consumers;
- a stable responsibility;
- a specific name.

Avoid shared junk drawers.

---

## 20. Routing

Server route handlers should remain thin.

A route should generally:

1. validate the request;
2. call the owning service;
3. serialize the response;
4. map expected errors to HTTP responses.

Business logic should not live directly inside route handlers.

Example:

```text
HTTP request
    ↓
route
    ↓
service
    ↓
repository / integration
```

---

## 21. Error handling

Errors should be classified at feature boundaries.

Internal secrets must never be included in errors returned to clients.

Errors should be useful without exposing:

- private keys;
- seeds;
- API tokens;
- provider credentials;
- raw environment configuration.

Integration failures should not corrupt core Setrai data.

For example:

```text
program saved locally
↓
Nostr publish fails
↓
program remains saved
↓
publish operation reports failure
```

---

## 22. External services

External services must be isolated behind adapters.

Examples include:

- AI providers;
- Nostr relays;
- Monero nodes;
- image hosts;
- future integrations.

Core modules should not depend directly on third-party SDK details when an internal interface can isolate them.

This makes providers replaceable and reduces agent context requirements.

---

## 23. Startup lifecycle

Setrai should perform startup in a predictable order.

Conceptually:

```text
1. load environment
2. validate core configuration
3. open SQLite
4. run migrations
5. initialize core services
6. evaluate capabilities
7. initialize enabled optional integrations
8. start HTTP server
```

Optional integration failure should be handled deliberately.

Where safe, Setrai may start with the affected capability unavailable rather than making the entire core application unusable.

Security-sensitive configuration errors may require startup failure.

---

## 24. Shutdown lifecycle

Setrai should cleanly close:

- HTTP server;
- SQLite connection;
- Nostr relay connections;
- Monero wallet resources;
- AI/provider resources when applicable.

Feature modules that allocate persistent resources should expose explicit lifecycle methods where appropriate.

---

## 25. Configuration ownership

Environment parsing belongs under:

```text
src/server/config/
```

Feature modules should receive validated configuration rather than parsing raw environment variables throughout the codebase.

Preferred:

```ts
const config = loadConfig()
```

Then:

```ts
config.nostr.enabled
config.monero.enabled
config.ai.provider
```

Avoid widespread direct access such as:

```ts
process.env.NOSTR_ENABLED
```

inside unrelated modules.

---

## 26. Tests

Tests should mirror module ownership.

Example:

```text
tests/
├── exercises/
├── programs/
├── sessions/
├── statistics/
├── recovery/
├── ai/
├── nostr/
└── monero/
```

Core business logic should be testable without starting the entire application.

Optional integrations should use mocks/fakes where practical.

Tests must not accidentally:

- publish real Nostr events;
- send Monero;
- call paid AI APIs;
- modify production data.

---

## 27. Architecture enforcement

Setrai should include:

```text
scripts/check-architecture.mjs
```

The checker should gradually enforce architectural rules such as:

- normal source file size limits;
- forbidden cross-feature imports;
- forbidden generic junk-drawer filenames;
- documented module ownership;
- allowed dependency directions;
- no client imports from server code.

The checker should be part of:

```bash
npm run check
```

Example:

```json
{
  "scripts": {
    "arch": "node scripts/check-architecture.mjs",
    "test": "…",
    "build": "…",
    "check": "npm run arch && npm test && npm run build"
  }
}
```

The exact implementation may evolve, but architectural checks must remain part of normal development.

---

## 28. Documentation ownership

Documentation has distinct responsibilities.

### `docs/instruction.md`

Authoritative product behavior.

Answers:

- What does Setrai do?
- What should users see?
- How should features behave?

### `docs/architecture.md`

Technical boundaries.

Answers:

- Where should logic live?
- Which modules may depend on which?
- What is client-side versus server-side?

### `docs/modules.md`

Repository navigation and ownership.

Answers:

- Which files own this behavior?
- Which dependencies are relevant?
- What should an agent read?

### `docs/security.md`

Security model.

Answers:

- How are secrets handled?
- What can reach the browser?
- What are the trust boundaries?

### `docs/configuration.md`

Environment configuration.

Answers:

- Which `.env` variables exist?
- What do they enable?
- Which require restart?

### `docs/decisions/`

Durable architectural rationale.

Use these for important decisions that future maintainers may otherwise reverse accidentally.

---

## 29. Architecture change rule

Do not silently violate an architectural boundary because doing so is convenient for one feature.

If a requested feature genuinely requires changing the architecture:

1. identify the affected boundary;
2. update this document;
3. update `docs/modules.md`;
4. add or update a decision record when appropriate;
5. update architecture checks if enforcement changes;
6. implement the feature.

Architecture should evolve deliberately rather than through accidental coupling.

---

## 30. Primary design goal

A coding agent working on a normal Setrai task should not need to load the entire repository.

A well-scoped task should usually require:

```text
AGENTS.md
+
relevant instruction.md section
+
relevant modules.md entry
+
owning feature directory
+
explicit dependency contracts
```

If routine tasks consistently require reading large unrelated areas of the repository, the architecture should be treated as degraded and refactored.