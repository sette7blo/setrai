# Changelog

All notable changes to Setrai will be documented here.
Versions follow [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`

- **MAJOR** — breaking changes (e.g. DB schema requires migration)
- **MINOR** — new features, backwards compatible
- **PATCH** — bug fixes, visual tweaks

---

## [Unreleased]

- Added Settings → Backup with a complete `.setrai` archive containing the SQLite database and uploaded exercise images, confirmed and validated import, automatic schema upgrades, transactional database restore, safe media replacement, legacy `.db` import, and a complete server-side pre-restore safety archive.
- Promoted the 33 operator-curated exercise images to bundled seed artwork so fresh installations receive the updated images without importing an existing database or media directory.
- Kept iOS screens awake during visible live workout sessions with native Screen Wake Lock support plus an interaction-activated fallback for non-HTTPS and unsupported contexts.
- Added a prominent mobile Quick action that opens the recovery-aware workout composer and automatically becomes Resume while a workout session is active.

## [v0.2.0] — 2026-10-17

- Replaced remote exercise/workout discovery with versioned local seeds: 56 bundled exercises, seven bundled workouts, immutable seed keys, local-edit-safe revisions, deletion tombstones, and bundled local artwork. Removed remote catalog configuration, dependencies, routes, UI, and stored provenance.
- Removed unused external-wallet configuration, capability contracts, architecture stubs, and documentation.
- Consolidated bounded JSON request parsing across server routes, removed dead modules and stale CSS, enabled unused TypeScript checks, and eliminated unsafe statistics HTML interpolation.
- Clarified install vs develop vs ship: public Compose lives under `deploy/` and in the README copy-paste installer; root `compose.yaml` removed so a git checkout is not mistaken for an install folder. Day-to-day development remains `npm start`; CI still publishes `dockersette/setrai`.
- Aligned GitHub/Docker publication with the other self-hosted projects: pushes to `main` publish `latest`, version tags publish semver Docker tags and create GitHub releases, and the public Compose installer uses the published `dockersette/setrai` image only.

## [v0.1.0] — 2026-10-11

- Initial public Setrai release with self-hosted workouts, exercise library, program builder, live sessions, statistics, recovery, profile settings, Docker image publication, and image-only Compose installation.
