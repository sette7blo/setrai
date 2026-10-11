# Changelog

All notable changes to Setrai will be documented here.
Versions follow [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`

- **MAJOR** — breaking changes (e.g. DB schema requires migration)
- **MINOR** — new features, backwards compatible
- **PATCH** — bug fixes, visual tweaks

---

## [Unreleased]

- Aligned GitHub/Docker publication with the other self-hosted projects: pushes to `main` publish `latest`, version tags publish semver Docker tags and create GitHub releases, and the public Compose installer is `compose.yaml` using the published `dockersette/setrai` image only.

## [v0.1.0] — 2026-10-11

- Initial public Setrai release with self-hosted workouts, exercise library, program builder, live sessions, statistics, recovery, profile settings, optional Nostr discovery/import, Docker image publication, and image-only Compose installation.
