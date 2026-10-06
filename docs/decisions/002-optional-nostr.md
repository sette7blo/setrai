# ADR 002: Optional Nostr Integration

## Status

Accepted

---

## Context

Setrai may integrate with Nostr for:

- public identity;
- creator profiles;
- discovery of exercises and programs;
- publishing exercises and programs;
- publishing selected workout-related content.

However, Nostr is not required for Setrai's core fitness functionality.

Setrai must remain a complete self-hosted training application when Nostr is disabled.

The application also needs to keep private-key handling simple and secure.

---

## Decision

Nostr will be implemented as an optional server-side capability.

It is disabled by default.

Configuration is provided through `.env`.

Example:

```env
NOSTR_ENABLED=false
NOSTR_NSEC=
NOSTR_RELAYS=
```

When Nostr is disabled:

- no private key is required;
- no relay pool is initialized;
- no relay connections are opened;
- no Nostr profile is loaded;
- Discover is hidden or unavailable;
- Publish actions are hidden or unavailable;
- core Setrai functionality remains unchanged.

---

## Server-side signing

When Nostr is enabled, Setrai signs Nostr events on the server.

The configured private key remains server-side.

Conceptually:

```text
Browser
   ↓
Setrai API
   ↓
Nostr service
   ↓
Server-side signer
   ↓
Relay
```

The browser never receives:

```text
NOSTR_NSEC
```

---

## Identity

When enabled, Setrai derives the public Nostr identity from the configured private key.

The server may expose safe public identity information such as:

- npub;
- public key;
- display name;
- avatar;
- profile metadata.

The private key remains internal to the server.

---

## Discovery

Nostr may provide public discovery for:

- exercises;
- programs;
- creators;
- other supported training content.

Discovery data comes from configured public or private relays.

Remote data is treated as untrusted input.

It must be validated before becoming canonical local data.

---

## Publishing

Setrai may publish supported local content to Nostr.

Correct flow:

```text
create or edit locally
        ↓
save to SQLite
        ↓
optional publish to Nostr
```

Nostr publication is not the persistence operation.

If publication fails:

- the local object remains saved;
- the application remains usable;
- the failure is reported separately.

---

## Canonical data

SQLite remains the source of truth.

Nostr must not become the canonical database for:

- exercises;
- programs;
- sessions;
- user preferences;
- workout history.

Nostr metadata may be stored alongside local objects when useful.

Examples:

```text
nostr_event_id
nostr_pubkey
nostr_address
nostr_published_at
```

These fields do not change local ownership.

---

## Relay infrastructure

Setrai does not require a Setrai-operated relay.

The operator may configure:

- public relays;
- privately operated relays;
- a combination of both.

Example:

```env
NOSTR_RELAYS=wss://relay.example,wss://relay2.example
```

Relay failure must not affect local workout functionality.

---

## No separate signing service

Setrai does not require a separate external signing application or identity service.

The configured server-side private key is sufficient for the intended self-hosted architecture.

This avoids introducing a required dependency for normal Nostr-enabled deployments.

---

## Capability model

The server determines whether Nostr is enabled.

The client receives only safe capability state.

Example:

```json
{
  "nostr": true
}
```

or:

```json
{
  "nostr": false
}
```

The client must not inspect `.env` directly.

---

## UI behavior

When Nostr is disabled, Nostr-specific UI should not clutter the application.

Examples that should normally disappear:

```text
Discover
Publish
Nostr identity metadata
relay-related controls
```

When enabled, those features may become available.

The core UI should still present Setrai primarily as a fitness application rather than as a Nostr client.

---

## Module boundary

Nostr lives under:

```text
src/server/nostr/
```

Typical responsibilities include:

```text
config.ts
signer.ts
relays.ts
profile.ts
discover.ts
publish.ts
events.ts
```

Nostr may consume core feature contracts.

For example:

```text
Nostr
  ↓
program service
```

or:

```text
Nostr
  ↓
exercise service
```

It must not bypass feature ownership by directly reading unrelated repositories where a service contract exists.

---

## Nostr and Monero

Nostr and Monero are separate integrations.

Nostr may expose a creator or payment target.

Monero may perform a payment.

Preferred flow:

```text
Nostr discovery
      ↓
creator payment target
      ↓
Setrai orchestration/client
      ↓
Monero wallet API
```

Nostr must not directly control the Monero wallet.

---

## Security

The Nostr private key must never:

- be returned by an API;
- be logged;
- be stored in browser storage;
- be embedded in frontend assets;
- appear in error output;
- be committed to Git.

Remote Nostr content must be treated as untrusted.

Where signatures are required, they should be verified before use.

---

## Rationale

Making Nostr optional preserves Setrai's self-hosted fitness identity while still enabling decentralized discovery and publishing.

Server-side signing was chosen because it:

- fits the self-hosted server architecture;
- avoids browser key storage;
- avoids requiring a separate signer;
- simplifies privileged operations;
- keeps private keys away from client code;
- integrates cleanly with `.env` deployment configuration.

---

## Consequences

### Positive

- Setrai works normally without Nostr.
- No external signer is required.
- Nostr identity is simple to configure.
- Private keys stay server-side.
- Relay failure does not block training.
- Discovery and publishing remain available to users who want them.
- Nostr does not dictate Setrai's core architecture.

### Negative

- Anyone who compromises the Setrai server may gain access to the configured Nostr key.
- Operators must protect `.env`.
- Changing identity typically requires editing deployment configuration and restarting Setrai.
- Browser-only signing is not part of the default architecture.

These are acceptable tradeoffs for the intended self-hosted deployment model.

---

## Rejected alternative: Nostr required for Setrai

Nostr will not be required for:

- account creation;
- local profile;
- exercise management;
- workouts;
- statistics;
- recovery;
- AI.

Requiring Nostr would unnecessarily narrow the product and make protocol concerns part of basic fitness functionality.

---

## Rejected alternative: browser-managed nsec

The browser will not be the default owner of the Setrai Nostr private key.

That would require additional architecture around:

- browser secret storage;
- vault encryption;
- device transfer;
- synchronization;
- browser signing.

Those concerns are unnecessary for the selected server-based self-hosted architecture.

---

## Rejected alternative: required external signer

Setrai will not require a separate signer or identity service for Nostr-enabled operation.

A future alternative signer could be supported as an optional advanced feature, but it must not become a dependency of the core Nostr integration without a new architecture decision.

---

## Rejected alternative: Nostr as synchronization layer

Nostr will not be used as the primary mechanism for synchronizing canonical Setrai training data.

The self-hosted SQLite database remains authoritative.

Nostr is used for public interoperability, discovery, and publishing.

---

## Revisit conditions

This decision should be reconsidered only if Setrai develops a strong requirement for:

- hardware-backed Nostr signing;
- multi-user identities on one server;
- browser-controlled identities;
- delegated signing;
- external signer protocols;
- encrypted private Nostr synchronization.

Normal publishing and discovery requirements are not sufficient reason to change this model.

---

## Related documents

```text
docs/instruction.md
docs/architecture.md
docs/modules.md
docs/security.md
docs/configuration.md
docs/decisions/001-self-hosted-architecture.md
```
