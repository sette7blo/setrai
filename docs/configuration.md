# Setrai Configuration

## 1. Purpose

This document defines Setrai deployment configuration.

Setrai uses environment variables for deployment-level settings such as:

- server configuration;
- database location;
- authentication;
- AI providers;
- networking;
- optional capabilities.

The canonical example configuration lives in:

```text
.env.example
```

This document explains what each variable means and how it should be used.

---

# 2. Configuration principles

Setrai follows these rules:

- deployment-level configuration belongs in `.env`;
- secrets stay server-side;
- optional capabilities are explicitly enabled;
- disabled capabilities should remain dormant;
- the browser never reads `.env` directly;
- configuration is validated at startup;
- configuration changes may require restarting Setrai.

The server should load and normalize configuration into a typed configuration object.

Avoid reading `process.env` throughout unrelated modules.

Preferred:


---

# 3. Example configuration

A complete configuration may look like:


This is illustrative.

`.env.example` is the authoritative list of supported configuration keys once implementation begins.

---

# 4. Core Setrai configuration

## `SETRAI_HOST`

Example:

```env
SETRAI_HOST=0.0.0.0
```

Defines the network interface the Setrai HTTP server listens on.

Recommended Docker default:

```text
0.0.0.0
```

This value is not secret.

Restart required:

```text
Yes
```

---

## `SETRAI_PORT`

Example:

```env
SETRAI_PORT=3000
```

Defines the internal HTTP server port.

`npm start` loads `.env` when present. To use a different local port, set
`SETRAI_PORT=3001` in `.env` and restart the server. Environment variables
already set in the shell take precedence over `.env` values.

This value is not secret.

Restart required:

```text
Yes
```

---

## `SETRAI_DATA_DIR`

Example:

```env
SETRAI_DATA_DIR=/data
```

Defines the persistent application-data directory.

It may contain:

- SQLite database;
- exercise images;
- imported media;
- application-owned persistent files.

This directory should normally be mounted as persistent storage in Docker.

This value is not itself secret, but the contents of the directory may contain sensitive data.

Restart required:

```text
Yes
```

---

# 5. Database configuration

The initial Setrai architecture uses SQLite.

The primary database should normally live under:

```text
SETRAI_DATA_DIR
```

For example:

```text
/data/setrai.db
```

If a dedicated database-path variable is introduced, use:

```env
SETRAI_DB_PATH=/data/setrai.db
```

The application should provide a sensible default derived from `SETRAI_DATA_DIR`.

---

## `SETRAI_DB_PATH`

Optional.

Example:

```env
SETRAI_DB_PATH=/data/setrai.db
```

Defines the SQLite database file explicitly.

Default:

```text
<SETRAI_DATA_DIR>/setrai.db
```

Secret:

```text
No
```

Restart required:

```text
Yes
```

---

# 6. Authentication

Setrai may support application-level authentication.

Authentication is separate from:

- the user's fitness profile;

---

## `SETRAI_AUTH_ENABLED`

Example:

```env
SETRAI_AUTH_ENABLED=false
```

Controls whether Setrai requires application authentication.

Recommended default:

```text
false
```

for initial local/private-network deployments.

When Setrai is intentionally exposed beyond a trusted network, authentication should be enabled.

Secret:

```text
No
```

Restart required:

```text
Yes
```

---

## `SETRAI_AUTH_PASSWORD`

Example:

```env
SETRAI_AUTH_PASSWORD=
```

Defines the application password when password-based authentication is enabled.

Secret:

```text
Yes
```

Must never:

- be committed;
- be sent to the browser except as user-entered login input;
- be logged;
- appear in errors.

Required when:

```env
SETRAI_AUTH_ENABLED=true
```

if password authentication is the selected implementation.

Restart required:

```text
Yes
```

---

# 7. AI configuration

AI is an optional Setrai capability.

The initial preferred provider is self-hosted Ollama.

---

## `AI_ENABLED`

Example:

```env
AI_ENABLED=true
```

Controls whether AI functionality is available.

Recommended default:

```text
true
```

for Setrai's AI-native deployment model, provided a valid provider is configured.

A deployment may explicitly disable it:

```env
AI_ENABLED=false
```

When disabled:

- AI provider initialization should not occur unnecessarily;
- AI Coach UI should be hidden or unavailable;
- AI-generated features should fall back to deterministic Setrai behavior where supported.

Secret:

```text
No
```

Restart required:

```text
Yes
```

---

## `AI_PROVIDER`

Example:

```env
AI_PROVIDER=ollama
```

Selects the AI backend.

Initial supported value:

```text
ollama
```

Future values may include other local or remote providers.

Required when:

```env
AI_ENABLED=true
```

Secret:

```text
No
```

Restart required:

```text
Yes
```

---

## `AI_MODEL`

Example:

```env
AI_MODEL=qwen3
```

Defines the model requested from the configured AI provider.

No hardcoded model should be assumed when the provider requires explicit selection unless Setrai defines a documented default.

Secret:

```text
No
```

Restart required:

```text
Usually yes
```

---

## `OLLAMA_URL`

Example:

```env
OLLAMA_URL=http://ollama:11434
```

Defines the Ollama API endpoint.

Common Docker deployment:

```text
http://ollama:11434
```

Common host deployment:

```text
http://127.0.0.1:11434
```

Secret:

```text
No
```

Restart required:

```text
Yes
```

---

## `AI_API_KEY`

Example:

```env
AI_API_KEY=
```

Reserved for AI providers that require an API key.

Ollama typically does not require this.

Secret:

```text
Yes
```

Must never be returned to the browser.

Restart required:

```text
Yes
```

---

# 8. AI capability behavior

When:

```env
AI_ENABLED=false
```

the server capability response should contain:

```json
{
  "ai": false
}
```

When enabled and successfully initialized:

```json
{
  "ai": true
}
```

If configuration is enabled but invalid, Setrai should either:

- fail startup when the invalid configuration creates an unsafe state; or
- mark the capability unavailable with a safe diagnostic.

The exact behavior should remain consistent across optional integrations.

---

# 13. Seed format

The final implementation should document exactly which seed representation is supported.

Possible formats include:


Do not silently support multiple formats without validation.

Once the wallet implementation is selected, this section must be updated with the exact supported format.

---

# 18. Capability endpoint

The browser should consume safe capability state from the server.

Recommended endpoint:

```text
GET /api/capabilities
```

Example response:

```json
{
  "ai": true
}
```

The endpoint must not expose:


---

# 19. Capability versus readiness

There are two useful concepts:

```text
configured
ready
```

A feature may be enabled in `.env` but unavailable because an external dependency failed.

Example:

```env
AI_ENABLED=true
```

but Ollama is offline.

The implementation may therefore eventually expose states such as:

```json
{
  "ai": {
    "enabled": true,
    "ready": false
  }
}
```

The initial implementation may use booleans if sufficient.

Do not expose secret diagnostic information through this endpoint.

---

# 20. Profile and user settings

User preferences that change during normal application use should normally live in SQLite, not `.env`.

Examples:

```text
display name
avatar
weight unit
available equipment
training goal
UI preferences
```

These are product settings, not deployment settings.

---

# 21. What belongs in `.env`

Use `.env` for configuration that affects deployment or privileged integrations.

Examples:


---

# 22. What does not belong in `.env`

Do not use `.env` for ordinary user-managed application state such as:

```text
favorite exercises
current program
body weight
exercise history
preferred workout
session state
recovery values
```

Those belong in the application database.

---

# 23. Restart requirements

Most `.env` changes require a Setrai restart.

This includes:


This is intentional.

Setrai does not need to implement live configuration mutation for these settings.

---

# 24. Docker configuration

The expected self-hosted deployment model is Docker Compose with a **published
image**, installed into an empty directory (README paste or `deploy/` templates).
A git checkout is for development (`npm start`), not for production Compose.

The distributed installer templates are `deploy/compose.yaml` (image-only
`dockersette/setrai`) and `deploy/.env.example`. The optional
`deploy/compose.build.yaml` override builds a local image from a source checkout.
See [deployment instructions](deployment.md) for installation and publication.

The container uses a named volume at `/data`, runs as UID/GID 1000, and listens on
internal port 3000. Compose overrides the server's host, port, data-directory,
and database-path environment variables to match this layout. `SETRAI_IMAGE`
chooses a published version or digest, `SETRAI_HTTP_PORT` chooses the host port,
and `SETRAI_BIND_ADDRESS` defaults to `127.0.0.1`. The source-build workflow keeps
using its existing host `.env` and database independently.

The key design goals are:

- persistent data outside the container image;
- secrets supplied at deployment time;
- reproducible startup;
- minimal privileges.

---

# 25. `.env` bind mount versus `env_file`

Setrai may load configuration using either:

```text
env_file:
```

or a mounted `.env` file depending on implementation.

If Setrai ever writes configuration itself, a bind-mounted `.env` may be required.

The current preferred model is:

> The operator edits `.env` manually and restarts Setrai.

Therefore Setrai does not need to write `.env` from the application UI.

---

# 26. Example Docker deployment

Minimal installation (empty directory — not a git checkout):

```bash
# paste compose.yaml from README, or:
# curl deploy/compose.yaml + deploy/.env.example into the folder
cp .env.example .env   # if you downloaded deploy/.env.example as .env.example
chmod 600 .env
docker compose pull
docker compose up -d --wait
```

The image must first be published to Docker Hub. Preserve an existing `.env`
instead of overwriting it. Optional integrations are disabled in this template.
A public deployment needs authenticated HTTPS proxy access or a VPN; the
`SETRAI_AUTH_ENABLED` flag does not implement HTTP authentication yet.

If Ollama runs as another Compose service:

```yaml
services:
  setrai:
    depends_on:
      - ollama

  ollama:
    image: ollama/ollama
```

Then:

```env
OLLAMA_URL=http://ollama:11434
```

may be used.

---

# 27. Reverse proxy

Reverse-proxy settings should usually be handled by the deployment environment rather than Setrai-specific `.env` variables.

Common options include:

```text
Caddy
Nginx
Traefik
```

Setrai should not require one specific reverse proxy.

---

# 28. Public URL

If Setrai later needs to generate absolute URLs, a configuration variable may be introduced:

```env
SETRAI_PUBLIC_URL=https://setrai.example.com
```

Do not introduce it until required.

Potential uses include:

- callback URLs;
- externally shared links;
- absolute media URLs.

---

# 29. Logging

A future logging configuration may include:

```env
LOG_LEVEL=info
```

Potential values:

```text
error
warn
info
debug
```

If implemented, secret values must remain redacted regardless of log level.

---

# 30. Development configuration

Development-specific values may live in:

```text
.env.development
```

if the tooling requires it.

Real secret-bearing local environment files must remain ignored by Git.

Do not commit:

```text
.env
.env.local
.env.development.local
.env.production
```

if they contain secrets.

---

# 31. `.gitignore`

At minimum, ensure:

```gitignore
.env
.env.*
!.env.example
```

If the project uses environment files that are intentionally committed, explicitly whitelist only those known-safe files.

---

# 32. Configuration validation

Setrai should validate configuration during startup.

Examples:

If:

```env
AI_ENABLED=true
```

validate:

```text
AI_PROVIDER exists
provider-specific required values exist
```

If:


validate:


---

# 33. Conditional validation

Configuration for disabled integrations is not required. For example:


is valid. AI can likewise remain disabled without a configured provider.

---

# 34. Safe validation errors

Validation errors identify the missing or invalid variable without revealing
a configured seed. Provider keys and authentication passwords follow the same rule.

---

# 35. Configuration object

Application code should receive normalized configuration.

Conceptual example:


Secret-bearing values may be held in more restricted configuration structures where useful.

Do not serialize the entire configuration object to the client.

---

# 36. Secret separation

material such as the wallet seed. Never serialize secrets or the full environment
to the client or logs.

---

# 37. Configuration ownership

Configuration parsing belongs under:

```text
src/server/config/
```

Recommended structure:

```text
src/server/config/
├── env.ts
├── config.ts
├── validation.ts
├── secrets.ts
└── capabilities.ts
```

The exact filenames may evolve.

The principle remains:

> Environment parsing is centralized.

---

# 38. Feature configuration access

A feature receives only the configuration it needs through its public service
constructor. Do not pass the complete environment object to every feature;
keep parsing centralized and secret access narrowly scoped.

---

# 39. Default capability state

The default fresh installation should be simple.

Recommended:


AI may be set to `false` instead if the initial installer cannot guarantee an available provider.

The final `.env.example` should reflect the implementation available at release time.


---

# 40. Minimal configuration

A minimal deployment without optional integrations should look similar to:


This should provide a complete core fitness application.

---

# 41. AI-only configuration

Example:


---

# 43. Full optional-integration configuration

Example:


This configuration enables:


---

# 44. Configuration changes

When adding a new configuration variable:

1. add it to `.env.example`;
2. document it here;
3. add centralized validation;
4. define a default where appropriate;
5. classify whether it is secret;
6. define whether restart is required;
7. update capability behavior if relevant.

Do not introduce undocumented environment variables.

---

# 45. Removing configuration

When removing a configuration variable:

1. remove it from `.env.example`;
2. remove it from this document;
3. remove validation;
4. remove implementation usage;
5. update relevant ADRs if the architectural model changed.

Do not leave stale configuration indefinitely.

---

# 46. Configuration and UI

The application UI should not expose every `.env` field as a setting.

Deployment configuration belongs to the operator.

Examples that should generally remain deployment-level:


User preferences such as units and equipment belong in the application UI.

---

# 47. Configuration and security

Security-sensitive values are governed by:

```text
docs/security.md
```

This document defines what values exist.

`docs/security.md` defines how they must be protected.

If the two documents conflict regarding secret handling, the stricter security requirement applies and the documentation should be corrected.

---

# 48. Initial `.env.example`

The initial `.env.example` should be:


This file should evolve alongside implementation.

Do not add configuration merely because a future feature might need it.

---

# 49. Primary configuration rule

Use this distinction:

```text
Deployment concern
→ .env
```

```text
Normal user preference or training data
→ SQLite
```

And always preserve:

```text
.env
→ server
→ validated configuration
→ feature
```

Never:

```text
.env
→ browser
```
