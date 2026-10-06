# ADR 003: Monero Hot Wallet

## Status

Accepted

---

## Context

Setrai may support Monero payments as an optional capability.

The intended use is not merely to display a donation address.

Setrai should be capable of operating a real Monero hot wallet for actions such as:

- receiving XMR;
- sending XMR;
- displaying wallet balance;
- showing transaction history;
- tipping creators;
- supporting future payment-related Setrai features.

At the same time, Monero is not required for the core fitness application.

The wallet must therefore remain optional and isolated from core training functionality.

---

## Decision

Setrai will support an optional server-side Monero hot wallet.

It is disabled by default.

Configuration is provided through `.env`.

Example:

```env
MONERO_WALLET_ENABLED=false
MONERO_SEED=
MONERO_NODE=
```

When the wallet is disabled:

- no seed is required;
- no wallet is initialized;
- no Monero node connection is required;
- wallet UI is hidden or unavailable;
- wallet APIs must not perform payment operations;
- core Setrai functionality remains unaffected.

---

## Server-side wallet

The Monero wallet lives on the Setrai server.

Conceptually:

```text
Browser
   ↓
Setrai API
   ↓
Monero wallet service
   ↓
Monero wallet implementation
   ↓
Monero node
```

The browser never receives the wallet seed or private wallet material.

---

## Hot-wallet model

The Setrai wallet is explicitly a hot wallet.

It is intended for operational funds.

It is not intended to replace:

- cold storage;
- hardware-secured savings;
- a primary long-term wallet.

The recommended usage model is:

```text
dedicated Setrai wallet
+
limited balance
```

Operators should avoid importing a primary savings wallet into Setrai.

---

## Wallet capabilities

When enabled, the wallet may expose safe user-facing capabilities such as:

- current balance;
- unlocked balance;
- receive address;
- payment QR code;
- transaction history;
- outgoing payments;
- payment status.

Future wallet functionality may be added as long as it follows the same security boundary.

---

## Receive flow

Receiving funds does not require Nostr.

Conceptually:

```text
Wallet
  ↓
receive address
  ↓
Setrai API
  ↓
browser
```

The browser may safely receive public payment information such as:

```text
address
payment URI
QR payload
```

Private wallet material remains server-side.

---

## Send flow

Sending XMR is a privileged action.

The normal flow should be:

```text
enter destination and amount
          ↓
server validates request
          ↓
review transaction
          ↓
explicit user confirmation
          ↓
server creates/broadcasts transaction
```

The user should be able to review:

- destination;
- amount;
- fee where available;
- total where available.

Setrai must not silently send funds.

---

## Explicit spending rule

No other feature may cause an automatic Monero payment without explicit user intent.

For example:

```text
import program
```

must not automatically result in:

```text
tip creator
```

Likewise:

```text
view creator
```

must not automatically result in payment.

Payments require a deliberate user action.

---

## Wallet seed

The wallet seed is configured server-side.

Example:

```env
MONERO_SEED=
```

It is highly sensitive.

The seed must never:

- be returned by an API;
- be sent to the browser;
- be logged;
- be stored in client-side storage;
- appear in errors;
- be committed to Git;
- be included in normal downloadable backups.

---

## Seed format

The exact supported wallet-seed format depends on the final Monero wallet implementation.

Potential formats may include:

```text
standard Monero mnemonic
Polyseed
wallet-file-backed initialization
```

The implementation must clearly define and validate the supported format.

Multiple formats should not be accepted implicitly without deliberate support.

---

## Wallet persistence

The wallet implementation may require persistent server-side files such as:

- wallet cache;
- encrypted wallet file;
- synchronization state.

These files should live under the Setrai persistent data directory or a dedicated wallet directory.

Example:

```text
/data/wallet/
```

They must never live in:

```text
public/
src/client/
browser storage
```

Wallet files should be considered sensitive even if encrypted.

---

## Monero node

Setrai connects to a configured Monero node.

The node may be:

- public;
- self-hosted;
- hosted elsewhere on the operator's network.

Example:

```env
MONERO_NODE=https://node.example
```

Setrai must not require a Setrai-operated Monero node.

---

## Node trust boundary

The configured Monero node is external infrastructure.

It must not receive wallet seed material or private spend keys.

A remote node may still observe network-level wallet activity.

Users who require stronger privacy should be able to configure their own node.

---

## Capability model

The server determines whether the Monero wallet is available.

The browser consumes only safe capability information.

Example:

```json
{
  "moneroWallet": true
}
```

The browser does not inspect:

```text
MONERO_SEED
```

or other private wallet configuration.

---

## Module boundary

Monero lives under:

```text
src/server/monero/
```

Expected responsibilities include:

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

The Monero module owns wallet behavior.

Core fitness modules must not directly manipulate wallet internals.

---

## Nostr interaction

Nostr and Monero remain separate integrations.

If a creator discovered through Nostr exposes a Monero payment target, Setrai may allow the user to tip that creator.

Preferred flow:

```text
Nostr discovery
      ↓
creator payment target
      ↓
Setrai UI/orchestration
      ↓
Monero wallet API
      ↓
explicit confirmation
      ↓
payment
```

The Nostr module must not directly control Monero wallet internals.

The Monero module must not need to understand Nostr events.

---

## AI interaction

AI must not directly authorize or trigger Monero spending.

AI may potentially suggest an action, but actual payment requires explicit user confirmation.

For example, AI may say:

```text
You can tip this creator.
```

It must not result in:

```text
wallet.send(...)
```

without a deliberate user action.

---

## Backup behavior

Normal Setrai backups should not automatically include:

```text
MONERO_SEED
```

If wallet files are included in application backups, they must be treated as sensitive.

Setrai should clearly distinguish:

```text
training data backup
```

from:

```text
wallet recovery material
```

The operator remains responsible for securely backing up the wallet seed.

---

## Failure isolation

Monero failure must not break training functionality.

Examples:

If the node is unavailable:

```text
wallet unavailable
training continues
```

If wallet synchronization fails:

```text
wallet unavailable or degraded
training continues
```

If sending fails:

```text
transaction reports failure
training data remains unaffected
```

---

## No wallet as application identity

The Monero wallet is not the user's Setrai identity.

It must remain separate from:

- local profile;
- Setrai authentication;
- Nostr identity.

A wallet address should not automatically become an account identifier.

---

## Security

The Monero wallet is one of the highest-risk components in Setrai.

The implementation must follow:

```text
docs/security.md
```

In particular:

- seed remains server-side;
- wallet operations require capability checks;
- spending requires explicit confirmation;
- secrets are not logged;
- client code never owns private wallet material.

---

## Rationale

A server-side hot wallet was chosen because it allows Setrai to perform real payments while preserving a clear browser/server security boundary.

This architecture also fits the self-hosted deployment model:

```text
operator-controlled server
+
operator-controlled wallet
+
operator-selected Monero node
```

The wallet remains optional so that users who do not want cryptocurrency functionality can run Setrai without any Monero dependency.

---

## Consequences

### Positive

- real Monero payments are possible;
- users can receive and send XMR;
- creator tipping can be integrated naturally;
- browser code never needs wallet seeds;
- operators can choose their own node;
- no Setrai-operated payment infrastructure is required;
- Monero remains independent from core fitness features.

### Negative

- a compromised Setrai server may expose the hot wallet;
- `.env` and wallet files become highly sensitive;
- wallet synchronization and node connectivity add complexity;
- Monero dependencies increase server responsibility;
- operators must understand that this is a hot wallet.

These tradeoffs are acceptable for the intended optional payment capability.

---

## Rejected alternative: receive-only address

A receive-only donation address was not selected as the full Monero design.

While displaying a payment address is simpler, it does not support the intended capabilities:

- sending;
- creator tipping;
- transaction management;
- future payment workflows.

Setrai therefore uses a real wallet model.

---

## Rejected alternative: browser wallet

The browser will not own the Setrai Monero wallet.

A browser-managed wallet would complicate:

- secret storage;
- wallet persistence;
- synchronization;
- device security;
- payment authorization;
- backups.

The server-side model fits Setrai's self-hosted architecture more cleanly.

---

## Rejected alternative: Setrai-operated wallet service

Setrai will not require a centralized Setrai payment service.

Such a service would:

- introduce custody concerns;
- weaken self-hosting;
- create central infrastructure dependency;
- increase regulatory and operational complexity.

The operator owns the wallet directly.

---

## Rejected alternative: required local Monero node

Running a private node should be supported but not mandatory.

Requiring every Setrai user to operate a Monero node would unnecessarily raise the deployment barrier.

The operator may choose between:

```text
public node
```

and:

```text
self-hosted node
```

---

## Revisit conditions

This decision should be reconsidered only if Setrai develops a strong requirement for:

- hardware-wallet signing;
- multisignature wallets;
- wallet RPC separation;
- multi-user wallet isolation;
- multiple wallets per Setrai instance;
- automatic payment policies;
- stronger secret-isolation infrastructure.

Normal receive/send/tipping functionality is not sufficient reason to change the architecture.

---

## Related documents

```text
docs/instruction.md
docs/architecture.md
docs/modules.md
docs/security.md
docs/configuration.md
docs/decisions/001-self-hosted-architecture.md
docs/decisions/002-optional-nostr.md
```
