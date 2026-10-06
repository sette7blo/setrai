# Setrai Agent Instructions

Setrai is designed to be maintained with AI coding agents. Keep changes local,
modular, and easy to understand without loading unrelated parts of the repository.

## Before making changes

1. Read the relevant section of `docs/instruction.md`.
2. Read the matching ownership entry in `docs/modules.md`.
3. Read only the owning feature and its documented dependencies.
4. Follow the boundaries defined in `docs/architecture.md`.
5. Follow the security rules in `docs/security.md` when working with secrets,
   Nostr, Monero, authentication, or external services.

Do not scan unrelated feature directories unless the requested change genuinely
crosses those boundaries.

## Architecture rules

- Prefer source files between 100 and 300 lines.
- 400 lines is the normal maximum for handwritten source files.
- If a modified file is already above the limit, it may shrink or remain stable,
  but it must not grow without a documented reason.
- Do not create large generic files such as `utils.ts`, `helpers.ts`, `common.ts`,
  or `misc.ts` that collect unrelated behavior.
- Keep feature logic inside the feature that owns it.
- Features must communicate through documented interfaces or service contracts.
- Do not import another feature's internal implementation directly.
- Database access must go through the database/repository layer.
- Client code must never receive server secrets.
- Nostr, Monero, and AI integrations must remain optional capabilities and must
  not become required dependencies of the core training application.

## Feature boundaries

The major server features are:

- `src/server/exercises/`
- `src/server/programs/`
- `src/server/sessions/`
- `src/server/statistics/`
- `src/server/recovery/`
- `src/server/ai/`
- `src/server/nostr/`
- `src/server/monero/`

The major client features are:

- `src/client/exercises/`
- `src/client/workouts/`
- `src/client/statistics/`
- `src/client/profile/`
- `src/client/discover/`

Use `docs/modules.md` to determine ownership before modifying code.

## Configuration

Deployment configuration belongs in `.env` and is documented in
`docs/configuration.md`.

Optional integrations must be disabled by default unless the specification says
otherwise.

Secrets such as Nostr private keys and Monero wallet seeds:

- must never be committed to Git;
- must never be returned to the browser;
- must never be written to logs;
- must never appear in errors or debug output.

## Documentation

`docs/instruction.md` is the authoritative product specification.

If implementation behavior conflicts with the specification, do not silently
change the intended behavior. Update the implementation to match the specification
or explicitly update the specification as part of the change when the requested
work changes product behavior.

Update `docs/modules.md` when module ownership or dependencies change.

Use `docs/decisions/` for major architectural decisions that need durable rationale.

## Testing

Before completing a change, run:

```bash
npm run check
```

A change is not complete if architecture checks, tests, type checks, or the build
are failing.

Add or update tests for behavior changes.

## Scope discipline

Prefer the smallest change that correctly solves the requested problem.

Do not perform unrelated refactors, renames, dependency changes, or cleanup unless
they are necessary for the requested work.

When a task touches multiple features, identify the owning feature first and keep
cross-feature changes behind explicit contracts.