# Setrai Module Map

This document defines code ownership and dependency boundaries for Setrai.

Its purpose is to help maintainers and AI coding agents identify:

- which module owns a behavior;
- which files should normally be read for a task;
- which dependencies are allowed;
- which areas should not be loaded unless the task genuinely crosses module boundaries.

`docs/instruction.md` defines product behavior.

`docs/architecture.md` defines system-wide architectural rules.

This file defines repository ownership.

---

# 1. How to use this document

Before modifying code:

1. Identify the feature that owns the requested behavior.
2. Read that feature's entry below.
3. Read only the owning directory and documented dependencies.
4. Do not scan unrelated features unless the task explicitly requires it.
5. Update this file if ownership or dependency boundaries change.

A normal task should usually require:

```text
AGENTS.md
+
relevant section of docs/instruction.md
+
relevant section of docs/modules.md
+
owning feature directory
+
documented dependencies
```

If routine changes require reading large unrelated areas of the repository, module boundaries should be reconsidered.

---

# 2. High-level ownership

`src/server/index.js` owns server startup, route registration, and shutdown.
It is the composition entry point rather than a feature directory; feature
business logic must remain in the owning modules below.

Server modules:

```text
src/server/config/
src/server/db/
src/server/exercises/
src/server/programs/
src/server/sessions/
src/server/body/
src/server/profile/
src/server/statistics/
src/server/recovery/
src/server/quick-workout/
src/server/ai/
src/server/nostr/
src/server/monero/
```

Client modules:

```text
src/client/app/
src/client/exercises/
src/client/workouts/
src/client/statistics/
src/client/recovery/
src/client/profile/
src/client/quick-workout/
src/client/shared/
```

---

# 3. Server configuration

## Location

```text
src/server/config/
```

## Owns

- environment loading;
- environment validation;
- typed application configuration;
- feature capability evaluation;
- Workstr catalog relay defaults and secure overrides in `nostr-relays.js`;
- startup configuration errors.

## Typical files

```text
env.ts
config.ts
capabilities.ts
```

## May depend on

- standard runtime libraries;
- configuration validation helpers.

## Must not depend on

- exercises;
- programs;
- sessions;
- Nostr implementation;
- Monero implementation;
- AI implementation;
- client code.

## Notes

Feature modules should receive validated configuration rather than reading raw
environment variables throughout the codebase.

Avoid:

```ts
process.env.NOSTR_ENABLED
```

inside unrelated features.

Prefer:

```ts
config.nostr.enabled
```

---

# 4. Database core

## Location

```text
src/server/db/
```

## Owns

- SQLite connection;
- schema;
- migrations;
- transaction helpers;
- database lifecycle;
- repository construction.

## Typical files

```text
connection.ts
schema.ts
migrations.ts
```

## May depend on

- server configuration;
- SQLite library.

## Must not depend on

- client code;
- Nostr;
- Monero;
- AI;
- HTTP route handlers.

## Notes

The database core manages persistence infrastructure.

Business behavior does not belong here.

## Seed initialization

Seed initialization lives under:

```text
src/server/db/seed/
```

It owns built-in startup data such as the initial Exercise library, seed-data
validation, and idempotent insertion after migrations. Seed code may use the
Exercise repository as a database-initialization concern, but it must not own
normal Exercise CRUD behavior or overwrite existing records on restart.

Large files under `src/server/db/seed/exercises/` are pure built-in data and are
exempt from the normal handwritten logic line-size warning. Application logic in
`src/server/db/seed/seed.js` remains subject to normal size rules.

---

# 5. Exercise repository

## Location

```text
src/server/db/repositories/exercises.ts
```

## Owns

Persistence for:

- exercises;
- favorites;
- exercise metadata;
- exercise image references;
- equipment metadata;
- muscle metadata;
- optional publication metadata.

## May depend on

- database connection;
- database types.

## Must not depend on

- HTTP routes;
- client code;
- Nostr implementation;
- AI prompts;
- Monero.

## Public consumers

Normally:

```text
src/server/exercises/
```

Other features should prefer the exercise service rather than importing the
repository directly.

---

# 6. Program repository

## Location

```text
src/server/db/repositories/programs.ts
```

## Owns

Persistence for:

- programs;
- program metadata;
- ordered program exercises;
- sets;
- reps;
- rest targets;
- weight targets;
- notes;
- blocks;
- optional publication metadata.

## Public consumer

Normally:

```text
src/server/programs/
```

Other features should use the program service contract.

---

# 7. Session repository

## Location

```text
src/server/db/repositories/sessions.ts
```

## Owns

Persistence for:

- workout sessions;
- session state;
- session completion;
- logged sets;
- reps;
- weight;
- timing information;
- session history.

## Public consumer

Normally:

```text
src/server/sessions/
```

Statistics, recovery, and AI should consume session data through documented
service contracts where practical.

---

# 8. Body repository

## Location

```text
src/server/db/repositories/body.ts
```

## Owns

Persistence for:

- body-weight entries;
- body-related historical measurements added later.

## Public consumers

Potentially:

```text
src/server/statistics/
src/server/ai/
src/server/profile/
```

through an owning service or documented contract.

---

# 9. Settings repository

## Location

```text
src/server/db/repositories/settings.ts
```

## Owns

Application-level persisted settings that belong in SQLite.

It does not own deployment-level secrets.

Examples of deployment configuration that do not belong here:

```text
NOSTR_NSEC
MONERO_SEED
AI API keys
```

Those remain in environment configuration.

---

# 10. Exercises server feature

## Location

```text
src/server/exercises/
```

## Owns

- exercise library behavior;
- exercise search;
- filtering;
- favorites;
- exercise detail;
- exercise validation;
- canonical compound/isolation movement type persistence and migration from safe
  legacy tags (database migration 5);
- audited secondary-muscle repair for legacy Workstr events that repeated only the
  primary muscle (shared correction data plus database migration 6);
- exercise availability;
- exercise service contracts, including idempotent `importDiscoveredExercise`
  for validated server-side discovery data;
- publishable exercise representation when needed.
- reviewed `updateDiscoveredExercise` updates in `catalog-update.js`, preserving
  edited fields with a persisted import baseline (database migration 3).

## Typical files

```text
routes.ts
service.ts
types.ts
filter.ts
validator.ts
```

## May depend on

```text
src/server/db/repositories/exercises.ts
src/server/config/
```

## May expose contracts to

- programs;
- recovery;
- AI;
- Nostr.

## Must not depend on

- Nostr internals;
- Monero internals;
- client implementation;
- AI implementation.

## Important rule

Nostr may ask the exercise service for publishable exercise data.

The exercise module must not know how Nostr publishes it.

---

# 11. Programs server feature

## Location

```text
src/server/programs/
```

## Owns

- program creation;
- program editing;
- program validation;
- exercise ordering;
- prescriptions;
- duplication;
- program detail;
- program service contracts;
- publishable program representation.
- atomic discovered-program import through `discovery-import.js` and the program
  repository's `importWithExercises` transaction contract;
- read-only program update review and edit-preserving application in
  `catalog-update.js`, with persisted program baselines (database migration 4);
- bounded program metadata and prescription validation in `validation.js`.

## Typical files

```text
routes.ts
service.ts
types.ts
validator.ts
builder.ts
```

## May depend on

```text
program repository
exercise service
```

## May expose contracts to

- sessions;
- AI;
- Nostr;
- recovery where required.

## Must not depend on

- Nostr internals;
- Monero internals;
- client implementation.

---

# 12. Sessions server feature

## Location

```text
src/server/sessions/
```

## Owns

- workout session creation;
- live session state;
- set logging;
- session completion;
- historical session retrieval;
- session summaries;
- workout timing.
- snapshot plans and bounded live-state/set-location validation in `live-state.js`;
- additive session-plan, clock and timed-set persistence through migration 2 and
  the Session repository; `PATCH /api/sessions/:id` saves live state and `DELETE`
  discards active sessions only.

## Typical files

```text
routes.ts
service.ts
types.ts
summary.ts
validator.ts
```

## May depend on

```text
session repository
program service
exercise service
```

## May expose contracts to

- statistics;
- recovery;
- AI;
- Nostr session publishing.

## Must not depend on

- AI implementation;
- Nostr implementation;
- Monero implementation.

---

# 13. Body Weight server feature

## Location

```text
src/server/body/
```

## Owns

- body-weight entry validation;
- date normalization;
- kilogram-only canonical weight handling;
- body-weight service contracts;
- body-weight HTTP routes.

## Typical files

```text
routes.ts
service.ts
types.ts
validator.ts
```

## May depend on

```text
body repository
```

## May expose contracts to

- statistics;
- AI;
- profile where required.

## Must not depend on

- statistics;
- AI implementation;
- Nostr implementation;
- Monero implementation.

---

# 14. Profile server feature

## Location

```text
src/server/profile/
```

## Owns

- local profile behavior;
- user-managed application preferences;
- display name and avatar URL;
- canonical equipment preference;
- weight-unit display preference;
- training goal preference;
- profile service contracts;
- profile HTTP routes.

## Typical files

```text
routes.ts
service.ts
types.ts
validator.ts
```

## May depend on

```text
settings repository
```

## May expose contracts to

- statistics;
- recovery;
- Quick Workout;
- AI.

## Must not depend on

- deployment configuration secrets;
- Nostr internals;
- Monero internals;
- AI implementation;
- statistics internals.

## Important rule

Deployment configuration remains in `.env`. Local profile preferences live in
SQLite through the settings repository. Profile must not expose Nostr private
keys, Monero wallet secrets, AI provider settings, or raw server environment
configuration.

---

# 15. Statistics server feature

## Location

```text
src/server/statistics/
```

## Owns

Derived training statistics such as:

- training frequency;
- weekly volume;
- exercise volume;
- muscle distribution;
- estimated 1RM;
- personal records;
- training streak;
- body-weight trends.

## Typical files

```text
routes.ts
service.ts
volume.ts
records.ts
streak.ts
body-weight.ts
```

## May depend on

```text
session service
exercise service
body service
profile service where needed
```

## Must not depend on

- Nostr;
- Monero;
- AI.

## Important rule

Statistics are deterministic. They consume completed session history through the
Session service, exercise muscle metadata through the Exercise service, and
body-weight history through the Body service. Statistics must not query feature
repositories directly while service contracts exist.

AI may interpret statistics, but statistics must not require AI.

---

# 15. Recovery server feature

## Location

```text
src/server/recovery/
```

## Owns

- muscle recovery calculations;
- training load interpretation;
- deterministic readiness state;
- exercise suitability based on recovery;
- data used by Quick Workout.

## Typical files

```text
service.ts
calculator.ts
muscle-map.ts
types.ts
```

## May depend on

```text
session service
exercise service
```

## May expose contracts to

- AI;
- Quick Workout;
- client APIs.

## Must not depend on

- AI;
- Nostr;
- Monero.

## Important rule

Recovery is deterministic. It consumes completed session history through the
Session service and exercise muscle metadata through the Exercise service.
Recovery must not query feature repositories directly while service contracts
exist. The initial model uses a 7-day lookback and a simple stimulus-decay
calculation; AI may consume recovery state, but Recovery must never require AI
to function. Readiness becomes ready at 80%. The public `recoveryMuscleGroup`
and `workoutReadiness` exports in `service.js` (implemented by `readiness.js`)
canonicalize primary groups and aggregate readiness conservatively for Quick
Workout; absent groups are treated as fresh by the generator.

Every controlled primary and secondary muscle declares or resolves to one of the
ten Recovery groups in `src/shared/exercise-taxonomy.json`. Detailed values are
folded into their anatomical Recovery region: chest variants to chest; back,
lats and traps to back; deltoids to shoulders; forearms to biceps; abs and
obliques to core; hip abductors to glutes; and hip adductors to quadriceps. This
same mapping drives the server readiness contract and the client body map so a
controlled muscle cannot be silently omitted. The calculator applies full load
to the primary muscle and half load to each secondary muscle; if normalization
collapses both to the same muscle, the full primary load wins.

---

# 16. Quick Workout server feature

## Location

```text
src/server/quick-workout/
```

## Owns

- deterministic Quick Workout generation;
- exercise scoring and tie-breaking;
- duration constraints;
- goal-based prescriptions;
- ready-only eligibility and same-muscle alternative pools;
- Quick Workout HTTP routes.

## Typical files

```text
service.ts
generator.ts
scoring.ts
constraints.ts
routes.ts
```

## May depend on

```text
recovery service
exercise service
profile service
session service
```

## Must not depend on

- AI;
- Nostr;
- Monero;
- Statistics;
- feature repositories directly.

## Important rule

Quick Workout is deterministic and works with AI disabled. It consumes Recovery
readiness rather than recalculating recovery, consumes Profile equipment and
goal preferences rather than duplicating settings, and generates preview plans
without persisting them automatically. Ready-only selection uses primary groups
at 80% or higher, round-robin group balancing, completed-before/compound scoring,
and same-group alternative pools. It never fills the plan with tired muscles.

---

# 17. AI server feature

## Location

```text
src/server/ai/
```

## Owns

- AI provider abstraction;
- Ollama integration;
- optional remote-provider adapters;
- prompt construction;
- AI Coach orchestration;
- program generation;
- workout generation;
- training analysis;
- natural-language fitness interactions.

## Typical files

```text
provider.ts
ollama.ts
coach.ts
prompts.ts
routes.ts
types.ts
```

## May depend on

Documented service contracts from:

```text
exercises
programs
sessions
statistics
recovery
profile/preferences
```

## Must not depend on

- raw database internals when a service contract exists;
- Nostr internals;
- Monero internals;
- client code.

## Important rule

AI owns generated interpretation and suggestions.

AI does not own canonical training data.

---

# 17. Nostr server feature

## Location

```text
src/server/nostr/
```

## Owns

- Nostr configuration interpretation;
- private-key signer;
- public-key derivation;
- relay connections;
- profile loading;
- public exercise discovery in `discovery-service.js`;
- official/creator workout discovery in `program-discovery.js` through Program
  and Exercise service contracts;
- verified kind 33402 parsing in `program-event.js` and bounded structured block
  parsing in `program-blocks.js`;
- bounded read-only relay queries in `relay-query.js`;
- signature verification and Workstr event parsing in `exercise-event.js`;
- catalog/import HTTP endpoints and verified program review/update endpoints in
  `routes.js`; `program-discovery.js` checks the selected verified event before
  calling Program service review/update contracts;
- event construction;
- event signing;
- event publishing;
- Nostr-specific parsing.

## Typical files

```text
config.ts
signer.ts
relays.ts
profile.ts
discover.ts
publish.ts
events.ts
types.ts
```

## May depend on

Service contracts from:

```text
exercises
programs
sessions
```

and:

```text
server configuration
```

## Must not depend on

- Monero internals;
- client internals;
- raw program SQL;
- raw exercise SQL;
- raw session SQL.

## Important rule

Nostr is an integration.

It does not own canonical exercise, program, or session data.

Correct dependency:

```text
Nostr
  ↓
program service
```

Incorrect dependency:

```text
Nostr
  ↓
program repository internals
```

---

# 18. Monero server feature

## Location

```text
src/server/monero/
```

## Owns

- hot-wallet lifecycle;
- seed loading;
- wallet initialization;
- node connection;
- balance;
- receive address;
- QR payment data;
- transaction history;
- send flow;
- transaction creation;
- transaction broadcast;
- wallet-specific errors.

## Typical files

```text
config.ts
wallet.ts
node.ts
balance.ts
receive.ts
send.ts
transactions.ts
routes.ts
types.ts
```

## May depend on

```text
server configuration
Monero library/provider adapter
```

## Must not depend on

- Nostr internals;
- AI internals;
- exercises;
- programs;
- sessions unless a future documented payment feature requires a narrow contract.

## Important rule

The Monero seed remains server-side.

The client interacts with a wallet service/API rather than with the wallet library
directly.

---

# 19. Nostr + Monero payment orchestration

Creator tipping may require both Nostr and Monero.

Neither feature should own the other's behavior.

Preferred flow:

```text
Nostr discover
    ↓
creator payment target
    ↓
client/orchestration layer
    ↓
Monero wallet API
```

Avoid:

```text
nostr/publish.ts imports monero/wallet.ts
```

and avoid:

```text
monero/send.ts parses Nostr events
```

If more orchestration becomes necessary later, introduce a narrowly scoped payment
or integration coordinator rather than coupling the modules directly.

---

# 19. Client application shell

## Location

```text
src/client/app/
```

## Owns

- application startup;
- routing;
- navigation and browser history in `menu-navigation.ts`;
- capability loading;
- top-level layout and compact header/navigation styling;
- shared typography, spacing, and radius tokens in `styles/tokens.css`;
  feature styles consume these tokens while owning their page layout;
- warm light theme in `styles/editorial.css` and shared header, surface, control,
  and focus treatments in `styles/design-system.css`;
- global app state;
- feature registration.

## Typical files

```text
bootstrap.ts
router.ts
navigation.ts
capabilities.ts
shell.ts
```

## May depend on

Client feature public APIs.

## Must not contain

- exercise-specific business logic;
- workout runner internals;
- Nostr relay logic;
- Monero wallet internals.

---

# 20. Exercises client feature

## Location

```text
src/client/exercises/
```

## Owns

- exercise library UI;
- unified local-first list and Local/Update/Web strips with a direct Update action in
  `catalog.ts`; optional loading/saving is injected by the app shell through
  the public `ExerciseCatalog` contract;
- exercise cards;
- search UI;
- filter UI;
- exercise filter facets and sheet/chip adapters in `filter-sheet.ts`, using the
  shared client filter sheet presentation contract;
- favorites UI;
- exercise detail loading/API state in `detail-page.ts`;
- detail card layout and collapsed instructions in `detail-view.ts`;
- exercise detail front/back muscle map;
- feature-owned body geometry in `body-map.ts` and highlighting in `muscle-map.ts`;
- canonical create/edit controls in `editor-taxonomy.ts`, consuming the shared
  exercise taxonomy, exposing controlled movement type, and rendering a synchronized
  primary/secondary muscle preview; free-form tags remain hidden catalog metadata;
- exercise selection surfaces;
- public tabs, image, formatting, filter controls, and detail card components
  consumed by Discover without relay logic entering Exercises.
- public informational `statusLabel` presentation contract consumed by Workouts
  to keep Local/Update/Web card strips consistent;
- public `muscleRegion` and `muscleMapMarkup` presentation contracts consumed by
  Workouts for aggregate front/back muscle maps and focus labels.

## Typical files

```text
view.ts
cards.ts
filters.ts
favorites.ts
detail.ts
api.ts
types.ts
```

## May depend on

```text
src/client/shared/
exercise API
```

## Must not depend on

- server internals;
- Monero;
- Nostr relay implementation;
- statistics internals.

---

# 21. Workouts client feature

## Location

```text
src/client/workouts/
```

## Owns

- program library;
- shared client filter sheet presentation contract for program facets and chips;
- History/Recovery routing and legacy Discover redirects in `page.ts`; unified
  local-first Library orchestration in `program-library.ts`, address deduplication
  and Local/Update/Web ordering in `program-catalog.ts`; compact chrome and filter
  sheet in `program-browser.ts`, and styles in `browser.css`;
- read-only comparison and explicit update application in `program-update.ts`;
- program discovery HTTP client in `discovery-api.ts` (no browser relay SDK);
- expandable local/remote cards in `program-card.ts` and `program-preview.ts`;
- derived program taxonomy/search in `program-taxonomy.ts`;
- program editor;
- program builder dialog in `program-builder.ts`, pure prescription/block
  planning in `builder-plan.ts`, and styles in `builder.css`;
- exercise selection for programs;
- live workout runner;
- runner lifecycle, saved clocks and training mutations in `session-page.ts`;
- deadline-based five-second countdown sound scheduling and cancellation in
  `live-audio.ts`, independent of UI polling and using device output timing;
- pure strength/superset planning and EMOM schedule/phase clocks in `live-plan.ts`;
- full-screen chrome and clock painting in `live-shell.ts`, strength and EMOM
  worksheets in `live-strength-view.ts`/`live-emom-view.ts`, image sizing and
  device-local compact/expanded preference in `live-media.ts`, shared training
  elements in `live-components.ts`, corrections in `live-edit.ts`, and styling in
  `live-session.css`;
- rest overlay presentation and keyboard controls in `live-rest-view.ts` and
  shared countdown/rest styling in `live-rest.css`;
- set logging UI;
- live rest overlay (not a separate rest-timer module);
- workout completion;
- Recovery composition through the public Quick Workout panel;

## Typical files

```text
program-library.ts
program-builder.ts
session-page.ts
live-rest-view.ts
live-session.css
api.ts
types.ts
```

## May depend on

```text
client shared
exercise client public components where appropriate
program/session APIs
public local profile API for saved equipment and weight units
public profile weight-unit conversion helpers
program discovery API
Quick Workout public recovery panel
```

## Must not depend on

- server implementation files;
- Nostr signer;
- Monero wallet library.

---

# 22. Statistics client feature

## Location

```text
src/client/statistics/
```

## Owns

- statistics dashboard;
- charts;
- records UI;
- streak presentation;
- body-weight history presentation.

## May depend on

```text
statistics API
client shared chart helpers
```

## Must not calculate canonical statistics independently if the server owns them.

Presentation-only transforms are allowed.

---

# 23. Recovery client feature

## Location

```text
src/client/recovery/
```

## Owns

- muscle recovery/readiness presentation;
- recovery status labels;
- recovery card ordering for display;
- recovery empty/loading/error states;
- composition of the public Quick Workout panel below readiness.

## May depend on

```text
recovery API
Quick Workout public recovery panel
client shared formatting
```

## Must not

- recalculate recovery thresholds;
- duplicate backend recovery math;
- depend on AI, Nostr, or Monero.

---

# 24. Profile client feature

## Location

```text
src/client/profile/
```

## Owns

- local profile presentation;
- avatar;
- display name;
- training preferences;
- equipment;
- units;
- profile-related settings.

When Nostr is enabled, this feature may display Nostr-derived identity information
returned safely by the server.
The application shell passes the safe `nostrIdentity` capability to Settings.
The Profile identity section requires both Nostr enabled and a nonempty
`NOSTR_NSEC` configured; public discovery (`nostr`) does not imply identity.
Training and Equipment remain available. Configuration retains only an
`identityEnabled` boolean for this visibility contract, never the key value.

## Must not

- receive nsec;
- parse private keys;
- connect to relays directly unless architecture is explicitly changed;
- receive Monero seed material.

---

# 25. Quick Workout client feature

## Location

```text
src/client/quick-workout/
```

## Owns

- Quick Workout form and preview;
- public `createRecoveryWorkoutPanel` entry in `recovery-panel.ts`, composed by
  Workouts/Recovery, with duration choices and ready-muscle preview;
- pure same-muscle swap/removal state in `recovery-plan.ts` and panel styling in
  `recovery-panel.css`;
- target-muscle selection presentation;
- deterministic Quick Workout API client;
- start-workout action that creates a canonical Session through the server;
- Quick Workout loading, empty, and error states.

## May depend on

```text
Quick Workout API
Exercise client public image/types helpers
Workouts client public Session/Program types
client shared API
```

## Must not

- duplicate backend generation/scoring logic;
- create client-only workout sessions;
- depend on AI, Nostr, or Monero.

---

# 26. Exercise catalog client (Nostr)

## Location

```text
src/client/exercises/catalog-api.ts
```

## Owns

- official Workstr/Nostr exercise catalog API adapter consumed by the app shell
  to inject the optional `ExerciseCatalog` contract into Exercises;
- catalog loading and local import API contracts;
- no standalone Discover product UI (removed; `/exercises/discover` redirects to Exercises).

## Availability

Catalog import may be inactive when Nostr is disabled.

## May depend on

```text
safe Nostr-backed server APIs
Exercise client public types and formatting
client shared
```

## Must not depend on

- server Nostr internals;
- nsec;
- Monero seed;
- relay libraries directly.

---

# 25. Shared client code

## Location

```text
src/client/shared/
```

## Owns

Only genuinely shared UI/infrastructure such as:

- API client;
- modal primitives;
- filter sheet and removable chip presentation in `filter-sheet.ts` and
  `filter-sheet.css`, consumed by Exercises and Workouts; feature adapters own
  facet values, filtering, persistence, and result counts;
- buttons;
- icons;
- formatting;
- toast/notification primitives;
- safe shared types.

## Typical structure

```text
src/client/shared/
├── api/
├── ui/
├── formatting/
└── types/
```

## Important rule

Do not move feature-specific code here merely because two files use it.

Shared modules should have clear, stable responsibilities.

Avoid:

```text
shared/utils.ts
shared/helpers.ts
shared/misc.ts
```

---

# 26. Public assets

## Location

```text
public/
```

## Owns

Static assets such as:

- PWA icons;
- manifest;
- static images;
- fonts if bundled;
- service-worker assets where applicable.

## Must not contain

- secrets;
- server configuration;
- private keys;
- wallet seeds.

Everything in `public/` should be assumed accessible to the browser.

---

# 27. Architecture scripts

## Location

```text
scripts/
```

## Owns

Development tooling such as:

- architecture checks;
- generated module maps if introduced;
- validation scripts;
- repository maintenance tools.

Primary architecture checker:

```text
scripts/check-architecture.mjs
```

## Must not become

a place for production application logic.

---

# 28. Tests

## Location

```text
tests/
```

Tests should mirror feature ownership.

Recommended structure:

```text
tests/
├── exercises/
├── programs/
├── sessions/
├── statistics/
├── recovery/
├── ai/
├── nostr/
├── monero/
└── architecture/
```

Feature tests should load only the smallest practical dependency set.

---

# 29. Capability ownership

Capability evaluation belongs on the server.

Example capabilities:

```text
ai
nostr
moneroWallet
```

Server configuration determines whether a capability is enabled.

The client consumes only the safe result.

Recommended flow:

```text
.env
 ↓
server config
 ↓
capabilities service
 ↓
GET /api/capabilities
 ↓
client app shell
```

---

# 30. Quick Workout ownership

Quick Workout is a training feature, not an AI-only feature.

Its deterministic logic should live near:

```text
recovery
program/workout generation
```

depending on final implementation.

AI may enhance Quick Workout but must not own its base availability.

When implemented, this file must be updated with one explicit owning module.

Do not implement duplicate Quick Workout logic in both AI and workouts.

---

# 31. Equipment ownership

Equipment is user training configuration. Canonical exercise equipment identifiers,
along with exercise categories, difficulty and movement-type values, and recovery-safe muscle choices,
live in `src/shared/exercise-taxonomy.json`. The Exercises server validates manual
writes from it and the Exercises client builds editor controls from it.

Profile/preferences should consume the same identifiers rather than duplicating
equipment values across:

- exercises;
- AI;
- recovery;
- Quick Workout.

Consumers should receive equipment through a documented contract.

Display labels may evolve independently, but persisted identifiers remain stable.

---

# 32. Body-weight ownership

Body-weight persistence belongs in the database layer.

Business access should be exposed through a small body/profile service if the
feature grows beyond simple CRUD.

Statistics and AI should consume that contract rather than duplicate queries.

---

# 33. Backup and restore ownership

Backup/restore should eventually live in a dedicated server module, for example:

```text
src/server/backup/
```

It should own:

- SQLite backup;
- application-owned media backup;
- restore validation;
- restore lifecycle.

It must not casually include `.env` secrets.

When this module is implemented, add it to the repository structure and this map.

---

# 34. Authentication ownership

If Setrai adds application authentication, it should live in a dedicated module:

```text
src/server/auth/
```

Authentication should remain separate from:

- Nostr identity;
- local training profile;
- Monero wallet.

Nostr identity should not automatically become Setrai authentication unless a
future architecture decision explicitly changes that model.

---

# 35. API ownership

Each feature should normally own its own routes.

Example:

```text
src/server/exercises/routes.ts
src/server/programs/routes.ts
src/server/sessions/routes.ts
```

Avoid a single giant API routing file containing business logic for all features.

A small central router may register feature routes.

---

# 36. Service contract rule

A feature's public service contract should be intentionally small.

Example:

```ts
programService.getProgram(id)
programService.createProgram(input)
programService.getPublishableProgram(id)
```

Do not expose every internal helper simply because another module wants access.

If another feature needs new information, add a purposeful contract rather than
importing internals.

---

# 37. Internal file rule

Files not documented as public contracts should be considered internal to their
feature.

For example:

```text
src/server/programs/validator.ts
```

should not normally be imported by Nostr or AI.

They should import:

```text
src/server/programs/service.ts
```

or an explicitly exported contract.

---

# 38. Dependency direction summary

Preferred dependency direction:

```text
client
  ↓
HTTP API
  ↓
routes
  ↓
feature services
  ↓
repositories / integration adapters
  ↓
SQLite / external systems
```

Optional integrations:

```text
AI
 ↓
core service contracts
```

```text
Nostr
 ↓
core service contracts
```

```text
Monero
 ↓
wallet/node adapters
```

Avoid circular feature dependencies.

---

# 39. What agents should read by task

## Exercise card/UI change

Read:

```text
AGENTS.md
docs/instruction.md → exercise sections
docs/modules.md → Exercises client feature
src/client/exercises/
```

Possibly:

```text
src/client/shared/ui/
```

Do not read:

```text
src/server/nostr/
src/server/monero/
src/server/ai/
```

unless explicitly required.

---

## Program editor change

Read:

```text
docs/instruction.md → Programs
docs/modules.md → Programs server + Workouts client
src/server/programs/
src/client/workouts/
```

And only documented dependencies.

---

## Live session change

Read:

```text
docs/instruction.md → Workout sessions / Rest timer
docs/modules.md → Sessions server + Workouts client
src/server/sessions/
src/client/workouts/
```

---

## Statistics change

Read:

```text
docs/instruction.md → Statistics
docs/modules.md → Statistics server/client
src/server/statistics/
src/client/statistics/
```

---

## Recovery change

Read:

```text
docs/instruction.md → Recovery
docs/modules.md → Recovery
src/server/recovery/
```

Plus documented session/exercise service contracts.

---

## AI Coach change

Read:

```text
docs/instruction.md → AI
docs/modules.md → AI
src/server/ai/
```

Then only the service contracts required by the task.

---

## Nostr publish change

Read:

```text
docs/instruction.md → Nostr
docs/security.md → Nostr secrets
docs/modules.md → Nostr
src/server/nostr/
```

Then the relevant core service contract.

Do not scan all training modules.

---

## Monero send change

Read:

```text
docs/instruction.md → Monero
docs/security.md → Monero wallet
docs/modules.md → Monero
src/server/monero/
```

Do not read Nostr unless the change specifically involves creator tipping.

---

# 40. Updating this map

Update `docs/modules.md` whenever:

- a new feature module is introduced;
- ownership moves between modules;
- a public service contract changes significantly;
- a feature gains a new allowed dependency;
- a cross-feature dependency is removed;
- a previously planned module becomes concrete.

Do not let this document become historical documentation.

It should describe the repository as it is intended to exist now.

Historical rationale belongs in:

```text
docs/decisions/
```

---

# 41. Primary module-design goal

A coding agent should be able to answer:

> Where does this behavior live?

without scanning the repository.

For most tasks, the answer should resolve to:

```text
one owning module
+
a small number of explicit contracts
```

If the answer becomes:

```text
several unrelated directories
+
multiple giant shared files
+
direct database access
+
integration internals
```

the module architecture has degraded and should be corrected.


# 42. Deployment packaging

Deployment owns `Dockerfile`, `.dockerignore`, `deploy/compose.yaml` (public
image installer), the optional source-build override `deploy/compose.build.yaml`,
and `deploy/.env.example`. There is no root `compose.yaml`; install folders are
empty directories that paste or download those templates.
The multi-stage image builds the client and runs the existing server as a non-root
user; persistent application data lives in the `/data` named volume. Secrets are
supplied at runtime and never enter the Docker build context.

`scripts/docker-healthcheck.mjs` consumes the public capability HTTP endpoint.
`scripts/test-docker.mjs` (`npm run test:docker`) owns isolated Compose smoke tests
with a temporary environment and volume, without importing feature internals or
using operator data. `.github/workflows/docker.yml` checks the application
and container before publishing `dockersette/setrai` for amd64/arm64 on main,
version tags, or explicit manual runs. Docker Hub credentials exist only as Actions secrets.

Source installation remains independent. Installation, network exposure,
updates, backups, and publication instructions live in `docs/deployment.md`.
