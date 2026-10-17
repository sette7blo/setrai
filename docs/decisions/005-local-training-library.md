# Local training library

## Status

Accepted.

## Decision

SQLite is the sole source of exercise, program, and workout-history data. The
application includes 56 exercises, seven workouts, and their local artwork.
There is no external content catalog, public identity, or content publication.

Bundled entities use immutable seed keys, monotonic revisions, and stored
baselines. Startup installs missing seeds, ignores equal or older revisions,
and updates only fields that still match the previous baseline. Database unique
indexes prevent duplicate keys. Deletion tombstones preserve intentional removals.

## Upgrades

Database migrations retain entity IDs, local edits, program references, session
plans, and logged sets. Obsolete extra columns are removed using the supported
local schema contract, rather than retaining integration-specific field names.
Existing canonical slugs are adopted into the versioned seed library.

Exercise images use bundled files or uploads stored on the Setrai server. Legacy
external image references display a local fallback without external requests.

and public service contracts. Core training does not depend on either.
