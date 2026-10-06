# Setrai — Product Instructions

> This document is the authoritative product specification for Setrai.
>
> If implementation, comments, README content, or older documentation conflict
> with this file, this file defines intended product behavior unless a newer
> architecture decision explicitly supersedes it.

---

# 1. Product objective

Setrai is a self-hosted, AI-native fitness and workout tracking application.

It is designed primarily for users who are comfortable running their own software
and want:

- full control of their training data;
- a local server and database;
- AI-assisted training features;
- optional Nostr integration;
- an optional Monero hot wallet;
- no mandatory Setrai-operated cloud infrastructure.

Setrai must remain useful as a complete workout tracker even when all optional
integrations are disabled.

The core product is:

```text
Self-hosted fitness tracking
+
training planning
+
workout logging
+
statistics and recovery
+
optional AI assistance
```

Nostr and Monero are optional capabilities rather than requirements.

---

# 2. Product identity

The product name is:

```text
Setrai
```

Use this capitalization consistently.

Do not use:

```text
SeTrAI
SetrAI
SeTrai
```

Setrai should be presented as a modern self-hosted training application rather
than as a Nostr client, cryptocurrency application, or protocol-specific tool.

The UI should prioritize:

- training;
- exercise discovery;
- programs;
- sessions;
- statistics;
- recovery;
- AI assistance.

Optional integrations should remain secondary.

---

# 3. Product principles

## 3.1 Self-hosted by design

Setrai runs on infrastructure controlled by the operator.

Typical deployment:

```text
Browser / PWA
      ↓
Setrai server
      ↓
SQLite
```

Docker is the primary deployment method.

Setrai should not require a hosted Setrai account.

---

## 3.2 Local ownership

Training data belongs to the operator.

Core application data is stored in the local Setrai database.

This includes:

- exercises;
- exercise favorites;
- programs;
- program structure;
- workout sessions;
- logged sets;
- weight used;
- repetitions;
- session history;
- body-weight history;
- statistics inputs;
- recovery inputs;
- local application preferences.

---

## 3.3 Optional integrations

The following integrations are optional:

- AI;
- Nostr;
- Monero.

Each is controlled through deployment configuration.

A disabled integration should be dormant.

A disabled integration must not prevent normal Setrai operation.

---

## 3.4 Configuration over account setup

Setrai targets self-hosted users.

Advanced integrations should therefore primarily be configured through `.env`
rather than requiring consumer-style setup flows inside the application.

Example:

```env
NOSTR_ENABLED=false
MONERO_WALLET_ENABLED=false
AI_ENABLED=true
```

Changes to deployment configuration may require restarting Setrai.

---

## 3.5 Server-side secrets

Secrets stay on the server.

Examples:

```text
Nostr nsec
Monero seed
AI API keys
authentication secrets
```

The browser never receives them.

---

# 4. Core navigation

The exact responsive presentation may evolve, but the main application concepts
are:

```text
Exercises
Workouts
Statistics
Profile
```

Optional capabilities may add or enhance navigation.

For example, when Nostr is enabled:

```text
Discover
```

may become available.

AI capabilities may introduce:

```text
Coach
```

or AI actions inside existing features.

The navigation should remain focused and avoid exposing implementation details.

---

# 5. Exercise library

The exercise library is a core feature.

Users must be able to:

- browse exercises;
- search exercises;
- filter exercises;
- favorite exercises;
- inspect exercise details;
- use exercises when building programs;
- use exercises in generated workouts.

Useful exercise metadata may include:

- name;
- muscle group;
- granular muscles;
- equipment;
- difficulty;
- instructions;
- image;
- tags.

The UI should avoid displaying excessive metadata on exercise cards.

The normal card hierarchy should favor:

```text
exercise image
exercise name
primary muscle
```

Secondary metadata belongs in filters or detail views when possible.

---

# 6. Exercise imagery

Exercise imagery is an important part of the Setrai visual experience.

The UI must treat images consistently across:

- exercise library cards;
- exercise selection;
- workout/program editing;
- live training;
- exercise detail views.

A standard source image ratio should be used wherever practical.

The UI may render the same image differently depending on context, but should not
distort the source image.

Exercise imagery should remain visually prominent without making cards excessively
large on mobile.

---

# 7. Favorites

Users can favorite exercises.

Favorites must be useful, not merely decorative.

The exercise library must provide an easy way to display only favorites.

The favorite action should be visually consistent across exercise surfaces.

---

# 8. Programs

Programs are reusable workout definitions.

A program may contain:

- name;
- description;
- difficulty;
- tags;
- ordered exercises;
- sets;
- reps;
- rest duration;
- target weight;
- notes;
- structured blocks where required.

Users must be able to:

- create programs;
- edit programs;
- reorder exercises;
- change prescriptions;
- start a workout from a program;
- duplicate or modify programs as product behavior evolves.

Programs remain local data regardless of whether Nostr is enabled.

---

# 9. Workout sessions

Users must be able to start a workout from a program.

During a live session, Setrai should support:

- exercise sequence;
- current set;
- target reps;
- actual reps;
- weight;
- completion state;
- rest timer;
- session duration;
- notes where appropriate.

The live workout interface must prioritize fast interaction.

Users should not need to navigate through complex forms while training.

---

# 10. Rest timer

Setrai includes a rest timer for workout sessions.

The timer should:

- start easily after completing a set;
- display remaining rest clearly;
- allow adjustment or dismissal;
- remain usable on mobile;
- avoid blocking other workout interactions.

---

# 11. Workout history

Completed sessions become part of the canonical training history.

History is used for:

- statistics;
- progression analysis;
- recovery calculations;
- AI recommendations;
- personal records;
- future program decisions.

Historical records should remain stable even if a program is later edited.

---

# 12. Statistics

Setrai includes useful training statistics.

Initial statistics may include:

- training frequency;
- weekly volume;
- exercise volume;
- muscle distribution;
- training streak;
- estimated 1RM;
- personal records;
- body-weight history.

Statistics should derive from canonical training data.

They should not require AI.

---

# 13. Recovery

Recovery is a core Setrai feature.

Setrai should estimate muscle recovery from recent training history.

Recovery logic should be deterministic and usable without AI.

Recovery output may influence:

- recommended exercises;
- Quick Workout;
- AI Coach recommendations;
- program suggestions.

AI may interpret recovery information, but AI must not be required to calculate
the base recovery state.

---

# 14. Quick Workout

Setrai should support generating a workout when the user does not want to select
an existing program.

Quick Workout may consider:

- recent training;
- muscle recovery;
- available equipment;
- exercise library;
- workout duration;
- user goals.

The deterministic training system should be capable of producing a useful result
without requiring AI.

AI may enhance or personalize this result when enabled.

---

# 15. Equipment

Users should be able to define available equipment.

Examples include:

```text
barbell
dumbbells
bench
cable machine
pull-up bar
bodyweight
```

Equipment information can be used by:

- exercise filters;
- Quick Workout;
- recovery-generated sessions;
- AI recommendations.

Generated workouts should not routinely recommend equipment the user does not
have.

---

# 16. Body-weight tracking

Setrai may store body-weight history.

Users should be able to:

- enter weight;
- associate weight with a date;
- review historical values.

Body-weight information may be used in statistics and AI context.

---

# 17. Profile

Setrai has a local profile concept.

The local profile may include:

- display name;
- avatar;
- preferences;
- training goals;
- equipment;
- unit preferences.

The product must not require a Nostr identity for normal profile behavior.

When Nostr is enabled, Nostr profile information may enhance or replace selected
public-facing identity elements.

---

# 18. AI

AI is a major optional Setrai capability.

AI must be useful for fitness and training workflows rather than being added only
for branding.

Potential AI functions include:

- program generation;
- workout generation;
- training-plan adjustments;
- session analysis;
- exercise recommendations;
- recovery interpretation;
- progression suggestions;
- natural-language interaction with training history;
- explanation of statistics.

---

# 19. AI providers

Setrai should support a provider abstraction.

A primary use case is self-hosted inference through:

```text
Ollama
```

Example configuration:

```env
AI_ENABLED=true
AI_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434
AI_MODEL=
```

The architecture should allow additional providers later without rewriting core
training features.

---

# 20. AI data access

AI must access Setrai data through documented service interfaces.

AI may receive information such as:

- recent sessions;
- programs;
- exercise metadata;
- equipment;
- recovery status;
- body-weight history;
- user preferences.

AI should receive only the context required for the requested task.

Core features must not depend on an AI response to function.

---

# 21. AI failure behavior

If AI is unavailable:

- the core app continues working;
- workouts remain accessible;
- session logging remains functional;
- recovery continues working;
- statistics remain available.

AI provider failure should produce a clear error without corrupting application
state.

---

# 22. Nostr

Nostr is an optional Setrai integration.

It is disabled by default.

Example:

```env
NOSTR_ENABLED=false
NOSTR_NSEC=
NOSTR_RELAYS=
```

The operator enables Nostr by editing `.env` and restarting Setrai.

There is no requirement to configure Nostr from the application UI.

---

# 23. Nostr identity

When enabled, Setrai loads the configured Nostr private key server-side.

Setrai derives the corresponding public identity.

The private key must never be delivered to the browser.

Nostr may provide:

- profile name;
- avatar;
- npub;
- creator identity;
- publishing identity.

The UI may display the Nostr avatar and name when the integration is enabled.

---

# 24. Nostr profile

When Nostr is enabled, Setrai may load standard profile metadata from public
relays.

Profile metadata may include:

- display name;
- avatar;
- public key;
- other supported metadata.

Nostr profile functionality must remain isolated from the local training data
model.

---

# 25. Nostr discovery

When enabled, Nostr can provide a discovery layer.

Discover may include:

- exercises;
- programs;
- creators;
- published training content.

Content should be retrieved from configured public relays.

Setrai does not require a Setrai-operated relay.

---

# 26. Nostr publishing

Setrai may publish supported training content through Nostr.

Potential publishable objects include:

- exercises;
- programs;
- workout summaries.

Setrai should use appropriate standard or documented event formats.

Publication must remain optional.

Local data is saved independently of publication status.

Example:

```text
save program locally
       ↓
optional publish
       ↓
Nostr relay
```

A Nostr failure must not cause the local program to be lost.

---

# 27. Nostr relay configuration

Relays are configured through `.env`.

Example:

```env
NOSTR_RELAYS=wss://relay.example,wss://another.example
```

Setrai may provide reasonable public defaults if explicitly defined in
`docs/configuration.md`.

Setrai should not require the operator to run a private relay.

---

# 28. Nostr disabled behavior

When:

```env
NOSTR_ENABLED=false
```

Setrai should not:

- initialize Nostr libraries unnecessarily;
- connect to relays;
- load Nostr profiles;
- expose publish actions;
- expose Nostr-specific settings;
- require an nsec.

Nostr-specific UI should disappear or remain inactive according to the owning
feature specification.

The application should still feel complete.

---

# 29. Monero

Setrai supports an optional Monero hot wallet.

This is a real payment wallet, not merely a displayed donation address.

It is disabled by default.

Example:

```env
MONERO_WALLET_ENABLED=false
MONERO_SEED=
MONERO_NODE=
```

The operator enables it through `.env` and restarts Setrai.

---

# 30. Monero hot-wallet purpose

The integrated wallet is intended for everyday Setrai-related payments.

Potential functions include:

- receiving Monero;
- sending Monero;
- displaying balance;
- transaction history;
- tipping creators discovered through Nostr;
- future payment-related Setrai functionality.

The wallet is explicitly a hot wallet.

Operators should use a dedicated wallet with limited funds rather than a primary
savings wallet.

---

# 31. Monero wallet UI

When enabled, Setrai may expose:

- wallet balance;
- receive address;
- QR code;
- send form;
- transaction history;
- payment confirmation.

When disabled, wallet UI should not be shown.

---

# 32. Monero receive

Users should be able to receive XMR through the integrated wallet.

The UI should provide:

- wallet address;
- QR code;
- copy action.

Receiving should not require Nostr.

---

# 33. Monero send

Users should be able to send XMR from the hot wallet.

The send flow should clearly show:

- destination;
- amount;
- fee where available;
- confirmation before broadcast;
- success or failure state.

Sending must require an explicit user action.

Background or automatic spending is not part of the default product.

---

# 34. Monero node

Setrai may connect to:

- a public Monero node;
- a privately operated node;
- a node elsewhere on the operator's network.

Configuration should allow either.

Example:

```env
MONERO_NODE=https://example-node
```

Setrai does not require the operator to run Monero infrastructure.

---

# 35. Nostr creator tips

If both Nostr and the Monero wallet are enabled, Setrai may allow tipping creators.

Conceptually:

```text
Discover creator
      ↓
Monero payment target
      ↓
Tip
      ↓
Setrai hot wallet
```

Nostr identifies or discovers the creator/payment target.

The Monero module performs the payment.

Neither integration should directly own the other's internal logic.

---

# 36. Capability combinations

Setrai must support different valid deployment combinations.

Example:

```text
AI ON
Nostr OFF
Monero OFF
```

This is a normal AI fitness application.

Example:

```text
AI ON
Nostr ON
Monero OFF
```

Adds public discovery and publishing.

Example:

```text
AI ON
Nostr ON
Monero ON
```

Adds creator payments and wallet functionality.

Example:

```text
AI OFF
Nostr OFF
Monero OFF
```

Setrai remains a usable self-hosted workout tracker.

---

# 37. Capabilities API

The server should expose a safe representation of active capabilities.

Example:

```text
GET /api/capabilities
```

Response:

```json
{
  "ai": true,
  "nostr": false,
  "moneroWallet": false
}
```

The response must never contain secret configuration.

---

# 38. Configuration model

Setrai uses `.env` for deployment-level configuration.

`.env.example` should document supported settings.

Important groups should include:

```text
Core
AI
Nostr
Monero
Network
Authentication
```

Optional integrations should be OFF by default unless explicitly decided
otherwise.

---

# 39. Restart behavior

Changes to deployment-level configuration may require restarting Setrai.

This is acceptable and expected for a self-hosted application.

The product does not need to dynamically activate every integration without a
restart.

---

# 40. Backup and restore

Setrai should support backup and restore.

Backups should cover canonical application data.

At minimum this includes:

- SQLite database;
- locally stored exercise media where applicable;
- relevant application-owned data.

Secrets require special handling.

A backup mechanism must not casually expose:

- Nostr private keys;
- Monero seeds;
- API keys.

If `.env` is backed up, the backup should be treated as highly sensitive.

---

# 41. Units

Setrai should support configurable weight units.

Internally, a canonical representation should be used consistently.

UI may present:

```text
kg
lb
```

according to user preference.

Conversions must not silently alter historical accuracy.

---

# 42. Mobile-first usability

Setrai should work well as a PWA on mobile devices.

Primary workflows must remain comfortable on a phone:

- browsing exercises;
- starting workouts;
- logging sets;
- running timers;
- reviewing programs;
- checking recovery;
- using AI features.

Desktop support remains important for self-hosted users, but workout interaction
should prioritize mobile ergonomics.

---

# 43. Visual design

Setrai uses a premium dark interface.

The exact design system may evolve, but it should feel:

- modern;
- clean;
- technical;
- premium;
- focused;
- appropriate for an AI-native fitness application.

Avoid excessive decorative complexity.

Content hierarchy is more important than visual novelty.

---

# 44. Setrai color identity

Setrai should have its own product identity rather than inheriting protocol-specific
branding.

Nostr purple should not define the default Setrai interface.

Monero orange should not define the default Setrai interface.

Protocol colors may appear inside their respective integrations.

The main Setrai palette should remain protocol-neutral.

---

# 45. Exercise image identity

Exercise imagery may retain a distinctive neon training style.

The image system does not need to use the same accent color as the application
chrome.

Strong orange or neon exercise artwork can coexist with a separate Setrai UI
palette.

---

# 46. Publishing and local state

Publishing is never the canonical storage operation.

Correct order:

```text
create/edit locally
      ↓
persist in SQLite
      ↓
optionally publish
```

Not:

```text
publish
      ↓
use relay as database
```

This distinction applies to all Nostr-enabled content.

---

# 47. Failure isolation

An optional integration should not bring down unrelated Setrai functions.

Examples:

If public Nostr relays are unavailable:

```text
training continues
programs continue
statistics continue
AI can continue
```

If the Monero node is unavailable:

```text
wallet functions fail gracefully
training continues
```

If Ollama is unavailable:

```text
AI functions fail gracefully
training continues
```

---

# 48. Security expectations

Detailed security requirements live in:

```text
docs/security.md
```

At the product level:

- secrets remain server-side;
- private keys are never sent to the browser;
- Monero seed material is never displayed after startup;
- explicit confirmation is required before spending funds;
- optional integrations must not weaken core-data integrity.

---

# 49. Architecture expectations

Detailed architecture rules live in:

```text
docs/architecture.md
```

The product should remain modular enough for AI coding agents to work on one
feature without loading the entire repository.

Routine product work should normally require only:

```text
relevant specification section
+
module ownership entry
+
owning source directory
+
explicit service contracts
```

---

# 50. Scope discipline

Setrai should avoid accumulating features merely because they are technically
possible.

New features should serve at least one of these product goals:

- improve workout tracking;
- improve training planning;
- improve recovery understanding;
- improve self-hosted ownership;
- improve AI-assisted training;
- improve optional decentralized discovery/publishing;
- improve optional private payments.

Protocol experimentation that does not improve the fitness product should not
drive the core application.

---

# 51. Initial product scope

The initial Setrai implementation should focus on:

1. exercise library;
2. programs;
3. workout sessions;
4. statistics;
5. recovery;
6. equipment;
7. body-weight tracking;
8. backup/restore;
9. optional AI;
10. optional Nostr;
11. optional Monero hot wallet.

Additional features can be introduced after this base is stable.

---

# 52. Explicit non-goals

Setrai is not intended to be:

- a general Nostr client;
- a general-purpose cryptocurrency wallet;
- a social network;
- a cloud SaaS account system;
- a replacement for a primary cold-storage Monero wallet;
- dependent on Setrai-operated infrastructure.

Nostr and Monero exist to enhance the fitness application.

The fitness application does not exist to provide a UI for Nostr or Monero.

---

# 53. Product completion rule

A feature is not complete merely because its UI exists.

A Setrai feature should include, where relevant:

- defined behavior;
- persistent storage;
- API contract;
- client behavior;
- failure handling;
- tests;
- documentation;
- architecture ownership.

---

# 54. Guiding product model

Setrai should be understandable as:

```text
A self-hosted training system
        +
an optional AI coach
        +
optional decentralized publishing/discovery
        +
an optional private payment wallet
```

The core training system always comes first.