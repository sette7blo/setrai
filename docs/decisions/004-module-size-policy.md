# ADR 004: Module Size and Agent-Oriented Architecture

## Status

Accepted

---

## Context

Setrai is intended to be maintained heavily with AI coding agents.

Large monolithic files and unclear feature boundaries create several problems:

- agents need to load too much unrelated code;
- token usage increases;
- reasoning becomes less focused;
- changes become harder to review;
- unrelated features become accidentally coupled;
- regressions become more likely;
- ownership becomes unclear.

Setrai therefore needs an architecture that is optimized not only for human maintainability, but also for efficient agent-based development.

---

## Decision

Setrai will use small, feature-owned modules with explicit dependency boundaries.

Handwritten source files should normally remain within:

```text
100–300 lines
```

The normal maximum for handwritten source files is:

```text
400 lines
```

Files above this limit should be treated as candidates for refactoring.

---

## Scope of the rule

The module-size rule applies primarily to handwritten application code.

Examples:

```text
routes
services
business logic
client views
feature controllers
integration adapters
repositories
```

It does not necessarily apply to:

```text
generated files
generated schemas
fixtures
vendored code
compiled assets
large static data files
```

Exemptions should remain exceptional.

---

## Existing oversized files

If an existing file already exceeds the normal limit, it may temporarily remain oversized.

However:

- it should not grow without a documented reason;
- meaningful changes should consider splitting it;
- new functionality should not continue accumulating in the same oversized file.

A useful rule is:

```text
oversized file
→ shrink or remain stable
→ do not grow casually
```

---

## Feature ownership

Code should be organized around clear feature ownership.

Examples:

```text
src/server/exercises/
src/server/programs/
src/server/sessions/
src/server/statistics/
src/server/recovery/
src/server/ai/
src/server/nostr/
src/server/monero/
```

Each feature should own its internal implementation.

Other features should depend on small public contracts rather than internal files.

---

## Service contracts

Cross-feature communication should happen through explicit contracts.

Preferred:

```ts
programService.getProgram(id)
sessionService.getRecentSessions()
walletService.send(...)
```

Avoid:

```text
feature A importing random internals from feature B
```

or:

```text
feature A reaching directly into feature B's repository
```

when a service contract exists.

---

## Dependency direction

The preferred dependency direction is:

```text
client
  ↓
HTTP API
  ↓
routes
  ↓
feature services
  ↓
repositories / adapters
  ↓
SQLite / external systems
```

Optional features consume core contracts:

```text
AI
 ↓
training services
```

```text
Nostr
 ↓
program/exercise/session services
```

```text
Monero
 ↓
wallet/node adapters
```

Circular dependencies should be avoided.

---

## Agent navigation

A coding agent should usually be able to complete a normal task by reading:

```text
AGENTS.md
+
relevant docs/instruction.md section
+
relevant docs/modules.md entry
+
owning feature directory
+
documented dependencies
```

The agent should not need to scan the entire repository.

---

## Documentation as navigation

`docs/modules.md` exists specifically to make repository navigation explicit.

It should tell an agent:

- where a feature lives;
- what it owns;
- what it may depend on;
- what it must not depend on.

Module ownership should remain current.

If ownership changes, `docs/modules.md` must be updated.

---

## Generic filename policy

Setrai should avoid broad junk-drawer files.

Avoid names such as:

```text
utils.ts
helpers.ts
misc.ts
common.ts
manager.ts
```

when they contain unrelated behavior.

Prefer names that describe the actual responsibility.

Examples:

```text
program-validator.ts
session-summary.ts
exercise-filter.ts
relay-publisher.ts
wallet-send.ts
```

A generic filename is acceptable only when the module has a genuinely narrow and obvious shared purpose.

---

## Shared code policy

Shared code should be introduced carefully.

Code should not be moved into `shared` merely because two files happen to use it.

A shared abstraction should normally have:

- multiple real consumers;
- a stable responsibility;
- a clear name;
- no feature-specific ownership.

Avoid creating shared modules that become dumping grounds.

---

## Route size

HTTP route handlers should remain thin.

A route should generally:

1. validate input;
2. call the owning service;
3. serialize the result;
4. map expected failures to HTTP responses.

Business logic should remain in services rather than accumulating inside route handlers.

---

## Repository size

Repositories should remain focused on persistence.

They should contain:

- queries;
- inserts;
- updates;
- deletes;
- mapping between database records and domain data.

They should not accumulate unrelated business behavior.

---

## Client module size

Client code follows the same modularity principle.

Large single-file application implementations should be avoided.

A client feature should be split into focused files such as:

```text
view.ts
api.ts
types.ts
filters.ts
cards.ts
editor.ts
runner.ts
```

depending on the feature.

---

## Architectural enforcement

Setrai will include an architecture checker:

```text
scripts/check-architecture.mjs
```

The checker should gradually enforce rules such as:

- source-file size limits;
- forbidden cross-feature imports;
- generic filenames;
- client/server import boundaries;
- module ownership;
- allowed dependency directions.

The exact checks may evolve as the codebase grows.

---

## Build integration

Architecture checks must be part of the normal validation workflow.

The intended pattern is:

```json
{
  "scripts": {
    "arch": "node scripts/check-architecture.mjs",
    "test": "...",
    "build": "...",
    "check": "npm run arch && npm test && npm run build"
  }
}
```

Agents must run:

```bash
npm run check
```

before considering work complete.

---

## Why 400 lines

The 400-line threshold is not a claim that every file above 400 lines is automatically badly designed.

It is a practical guardrail.

The threshold helps identify files that may be:

- accumulating too many responsibilities;
- difficult for agents to understand efficiently;
- expensive to repeatedly load into context;
- harder to test independently.

The preferred range remains lower:

```text
100–300 lines
```

The 400-line value is the normal ceiling, not the target.

---

## Refactoring guidance

When splitting a large file, split by responsibility rather than arbitrary line count.

Good:

```text
sessions/service.ts
sessions/validator.ts
sessions/summary.ts
sessions/types.ts
```

Poor:

```text
sessions-part1.ts
sessions-part2.ts
sessions-part3.ts
```

The goal is better ownership, not merely fewer lines per file.

---

## No fragmentation for its own sake

Setrai should not create tiny files that make behavior harder to follow.

A five-line helper used only once does not automatically need its own file.

The goal is:

```text
small cohesive modules
```

not:

```text
maximum number of files
```

Cohesion is more important than arbitrary splitting.

---

## Imports

Feature modules should expose intentional entry points where practical.

Other features should not depend on deep internal paths without a documented reason.

Preferred:

```text
program service contract
```

instead of:

```text
programs/internal/some-helper
```

This reduces accidental coupling.

---

## Database boundaries

Features should not execute arbitrary SQL outside the repository layer.

This helps ensure an agent working on one feature does not need to understand the entire database schema.

Preferred:

```text
feature service
      ↓
repository
      ↓
SQLite
```

---

## Optional integration isolation

AI, Nostr, and Monero should each remain isolated modules.

A task involving one optional integration should not normally require loading the others.

For example:

A Nostr publish change should not require reading:

```text
src/server/monero/
src/server/ai/
```

unless the requested behavior explicitly crosses those features.

---

## Token efficiency

Agent token efficiency is a first-class maintainability concern.

Architecture should minimize the amount of code required to understand and modify one feature.

This means:

- small modules;
- explicit contracts;
- predictable locations;
- minimal cross-feature imports;
- current documentation;
- narrow task scope.

Token efficiency must not override correctness, but it should influence structure.

---

## Rationale

This decision was made because Setrai is expected to be developed and maintained using coding agents extensively.

A modular architecture gives:

- smaller context windows per task;
- lower token consumption;
- faster reasoning;
- fewer accidental edits;
- easier code review;
- easier testing;
- clearer ownership;
- safer parallel development.

These benefits also improve normal human maintainability.

---

## Consequences

### Positive

- agents can work on smaller code surfaces;
- feature ownership is clearer;
- regressions become easier to isolate;
- tests can target smaller units;
- architectural drift is easier to detect;
- optional integrations remain isolated;
- large monoliths are discouraged early.

### Negative

- there are more files;
- service contracts require deliberate design;
- some changes may require maintaining interfaces;
- architecture checks add development constraints;
- overly aggressive splitting could create fragmentation.

These costs are acceptable.

---

## Rejected alternative: unrestricted file growth

Allowing files to grow without architectural limits was rejected.

This tends to produce:

- giant route files;
- giant frontend entry points;
- shared junk drawers;
- difficult agent navigation;
- high context usage.

---

## Rejected alternative: line-count-only enforcement

Line count alone is not enough.

A 200-line file may still be badly coupled.

A 450-line file may occasionally be justified.

Therefore Setrai combines:

```text
size limits
+
ownership rules
+
dependency rules
+
documentation
```

rather than treating file length as the only architecture metric.

---

## Rejected alternative: one global shared layer

A large universal shared layer was rejected.

Such layers often become hidden monoliths.

Shared code must remain intentional and narrowly scoped.

---

## Revisit conditions

The specific line limits may be adjusted if practical development experience shows that another threshold works better.

However, any change must preserve the core goals:

- small context requirements;
- clear feature ownership;
- explicit dependencies;
- easy agent navigation.

Changing the numeric limit must not be used to justify architectural degradation.

---

## Related documents

```text
AGENTS.md
docs/architecture.md
docs/modules.md
docs/instruction.md
docs/decisions/001-self-hosted-architecture.md
docs/decisions/002-optional-nostr.md
docs/decisions/003-monero-hot-wallet.md
```
