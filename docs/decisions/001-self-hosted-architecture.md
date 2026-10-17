# ADR 001: Self-Hosted Architecture

## Status

Accepted

---

## Context

Setrai is intended to be a self-hosted fitness and training application.

Its core functions include:

- exercise management;
- workout programs;
- live workout sessions;
- training history;
- statistics;
- recovery;
- optional AI assistance;

The application must remain useful without depending on Setrai-operated cloud infrastructure.

The product also needs to be maintainable by coding agents, which favors clear ownership, explicit data flow, and a relatively small number of infrastructure assumptions.

---

## Decision

Setrai will use a server-based self-hosted architecture with SQLite as the canonical source of application data.

The default architecture is:

```text
Browser / PWA
      ↓
Setrai server
      ↓
SQLite
```

The Setrai server owns:

- persistence;
- application APIs;
- business logic;
- external integrations;
- privileged operations;
- secrets.

The browser owns:

- rendering;
- interaction;
- navigation;
- local presentation state.

SQLite is the source of truth for core Setrai data.

---

## Data ownership

Core application data is stored server-side.

This includes:

- exercises;
- favorites;
- programs;
- program structure;
- workout sessions;
- logged sets;
- training history;
- body-weight history;
- statistics inputs;
- recovery inputs;
- user preferences that belong to the application.

The browser may cache or temporarily hold data for UX purposes, but browser storage is not the canonical data store.

---

## No required Setrai cloud

Setrai must not require:

- a Setrai account;
- a Setrai-operated backend;
- a third-party identity provider.

Optional features may use operator-selected public or private infrastructure.

---

## Optional integrations


They must not redefine the core storage model.

Conceptually:


Core Setrai must remain functional when all optional capabilities are disabled.

---

## Deployment model

Docker is the preferred deployment method.

Persistent application data should live outside the container image.

Typical deployment:

```text
docker compose
     ↓
Setrai container
     ↓
persistent /data
```

The persistent data directory may contain:

- SQLite database;
- exercise media;
- application-owned files;
- wallet state where required by the wallet implementation.

Deployment-level configuration is supplied through `.env`.

---

## Configuration

Setrai uses environment-based configuration for deployment concerns.

Examples:


Ordinary user data and training preferences belong in SQLite instead of `.env`.

---

## Server authority

The server is authoritative for all privileged behavior.

Examples:


The client requests actions through defined APIs.

The client must not directly own privileged secrets.

---

## Rationale

This architecture was chosen because it provides:

- straightforward self-hosting;
- simple backup and recovery;
- clear secret boundaries;
- server-side AI integration;
- deterministic local data ownership;
- fewer synchronization problems;
- clearer module boundaries;
- lower context requirements for coding agents.

SQLite is appropriate because Setrai is primarily a single-instance self-hosted application and does not initially require a distributed database.

---

## Consequences

### Positive

Setrai gains:

- one canonical data store;
- simple deployment;
- straightforward migrations;
- easier backups;
- clear browser/server responsibility;
- secure server-side secret handling;
- direct access to training history for AI;
- simpler integration with optional services.

### Negative

The architecture requires a running backend.

Setrai cannot be deployed as a purely static application without changing the architecture.

Offline operation is more complex than in a browser-only local database model.

Multi-server clustering is not a first-class initial requirement.

---

## Rejected alternative: browser as source of truth

A browser-first architecture using IndexedDB as the canonical data store was not selected.

That model would complicate:

- server-side AI access;
- multi-device consistency;
- backup ownership;
- privileged secrets;
- deterministic self-hosted state.

Client-side caching may still be introduced where useful, but it must not silently replace the server as the canonical source of truth.

---

## Rejected alternative: cloud-first architecture

A mandatory hosted backend was rejected.

It conflicts with Setrai's self-hosted product identity and would create unnecessary dependency on:

- hosted accounts;
- hosted infrastructure;
- central availability;
- external data custody.

Hosted options could exist in the future, but they must not become a requirement for the self-hosted product.

---

## Architectural rule

The expected dependency direction remains:

```text
Browser
   ↓
HTTP API
   ↓
Feature services
   ↓
Repositories / integration adapters
   ↓
SQLite / external systems
```

Optional integrations consume documented service contracts instead of bypassing the core application model.

---

## Revisit conditions

This decision should only be reconsidered if Setrai develops a requirement that fundamentally conflicts with a single self-hosted server and SQLite, such as:

- true multi-server clustering;
- large-scale multi-user hosting;
- distributed writes;
- mandatory offline-first synchronization across independent devices.

Normal feature growth is not sufficient reason to replace the architecture.

---

## Related documents

```text
docs/architecture.md
docs/instruction.md
docs/modules.md
docs/security.md
docs/configuration.md
```
