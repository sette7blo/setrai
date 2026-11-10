# Changelog

All notable changes to Setrai will be documented here.
Versions follow [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`

- **MAJOR** — breaking changes (e.g. DB schema requires migration)
- **MINOR** — new features, backwards compatible
- **PATCH** — bug fixes, visual tweaks

---

## [Unreleased]

## [v0.5.0] — 2026-11-10

- Desktop uses its width better: the content area is wider, the Library shows five exercises per row (six on very wide windows), Today lines up its two columns and lists the last three workouts, and the sidebar highlights the current section the same way the phone navigation does.
- Slimmer phone top bar: the main tabs show only the logo mark and the settings gear, inner screens (Recovery, an exercise, the editor, Settings) show a single back row instead of a brand bar plus a back link, and the bar shows the page title once you scroll past it.
- Exercise artwork leads: Library cards show one quiet line ("Core, Beginner") instead of a coloured difficulty bar, and the exercise page opens with a full-width image, a one-line summary, and instructions already expanded above the target muscles.
- History and program cards are easier to read: a smaller diagram, a larger title and at most two quieter lines. The History calendar is a plain white card with readable day numbers and no longer repeats the monthly recap figures. In an expanded program, Start is the orange button at the top and Edit, Duplicate and Delete sit in one quiet row.
- Progress, Body tab: logging a weight is now the first thing on the tab, with a date picker in your local format. Weight trend, goal progress and BMI are separate cards, entries are a compact list with "Show all", deleting an entry takes two taps, and height and target weight moved into a collapsed "Goal and height" section at the bottom.
- Progress, Training tab: weekly volume, muscle distribution and personal records are now three separate cards, the range selector is a full-height control, and record rows are one fixed height with the estimated 1RM aligned on the right.

## [v0.4.0] — 2026-11-10

- Tightened the visual foundations: text now uses one scale of eight sizes and four weights with nothing smaller than 12px, corners use five shared radii, every interface colour comes from the design tokens, and transitions share three durations and one easing. Secondary text is slightly darker for contrast, and page changes no longer fade.
- One visual world: the pastel gradient stat tiles on Progress and Body are replaced by the flat stat strip used on Today, and the muscle distribution, goal and BMI bars are solid instead of gradient.
- The body diagram is the same solid figure everywhere it appears. Recovery and Today colour it by readiness; history cards, program cards, exercise pages and the workout summary show primary muscles in black and secondary muscles in grey instead of brown.
- Rebuilt the workout summary shown after finishing a session: it uses the same page heading, stat strip and cards as the rest of the app, with Share image and Done side by side. Figures with no value are left out instead of showing "Done" or a dash, and a single set now reads "1 set logged".
- Fixed empty pills beside each Settings section, developer wording on the Settings save row, and the Library tab underline stopping short on desktop.
- Fixed the program builder dialog, which still used the old dark theme and had unreadable labels.
- Redesigned navigation around Today, Progress, and Library. Quick is no longer a tab: Today opens with your readiness, a suggested workout that is already built, and the week so far, and an unfinished workout shows as a Resume bar above the navigation on every other screen. Old links, including installed home-screen shortcuts, redirect to the new screens.
- Unified the interface on one design system: the Archivo typeface is now bundled, the live workout matches the rest of the app, and a single orange accent taken from the exercise artwork marks the action that starts or continues training. Removed the "AI Training Coach" tagline from the app until an AI feature ships.
- Recovery now shows full rows only for muscles that still need time and collapses ready and fresh muscles into chips. Personal records are listed heaviest first. Weekly volume bars show their values.
- Added a duration correction in History for sessions that were left running or closed by accident.
- Fixed the run-together goal line on Body, the white box inside search fields, and the duplicated header on the workout summary. Removed the unreachable program page and the repeated header cards on each screen.

- Fixed live workout countdown sounds on iOS: audio is now primed during taps and key presses, kept alive between cues, and rebuilt after the app returns from the background. Cues are louder, with a longer final tone, and the countdown number and ring turn red for the final five seconds.
- Added an optional Omarchy snapshot: with `SETRAI_OMARCHY_SNAPSHOT_ENABLED=true`, Setrai writes a small JSON file of glanceable training state (resume workout, today and week volume, readiness, last workout, body weight) for the Omarchy bar plugin. Off by default; Docker installs also need the snapshot bind mount described in `docs/deployment.md`.

## [v0.3.0] — 2026-11-09

- Added Settings → Backup with a complete `.setrai` archive containing the SQLite database and uploaded exercise images, confirmed and validated import, automatic schema upgrades, transactional database restore, safe media replacement, legacy `.db` import, and a complete server-side pre-restore safety archive.
- Promoted the 33 operator-curated exercise images to bundled seed artwork so fresh installations receive the updated images without importing an existing database or media directory.
- Kept iOS screens awake during visible live workout sessions with native Screen Wake Lock support plus an interaction-activated fallback for non-HTTPS and unsupported contexts.
- Added a prominent mobile Quick action that opens the recovery-aware workout composer and automatically becomes Resume while a workout session is active.
- Opened the mobile Quick composer in an accessible bottom sheet so starting a generated workout no longer leaves the current page.
- Reorganized personal state under Home (Training, History, Body, Recovery), combined Exercises and Programs under Library, and retained Quick/Resume as the emphasized training action.
- Polished Quick Workout with a visible duration label, concise recovery copy, generating/regenerate states, preview motion, and a sticky Start Workout action.
- Fixed muscle recovery running far too slow: each session now sets its own 24-72 hour recovery window with diminishing returns on volume, older fully-recovered sessions no longer delay newer ones, values no longer jump to ready at the 7-day lookback edge, and stretching/cardio exercises fatigue muscles less.
- Corrected Air Bike (a bicycle crunch) to train core with obliques as its only secondary muscle instead of nine unrelated muscle groups; existing installs pick this up on restart unless its muscles were edited locally.

## [v0.2.0] — 2026-10-17

- Replaced remote exercise/workout discovery with versioned local seeds: 56 bundled exercises, seven bundled workouts, immutable seed keys, local-edit-safe revisions, deletion tombstones, and bundled local artwork. Removed remote catalog configuration, dependencies, routes, UI, and stored provenance.
- Removed unused external-wallet configuration, capability contracts, architecture stubs, and documentation.
- Consolidated bounded JSON request parsing across server routes, removed dead modules and stale CSS, enabled unused TypeScript checks, and eliminated unsafe statistics HTML interpolation.
- Clarified install vs develop vs ship: public Compose lives under `deploy/` and in the README copy-paste installer; root `compose.yaml` removed so a git checkout is not mistaken for an install folder. Day-to-day development remains `npm start`; CI still publishes `dockersette/setrai`.
- Aligned GitHub/Docker publication with the other self-hosted projects: pushes to `main` publish `latest`, version tags publish semver Docker tags and create GitHub releases, and the public Compose installer uses the published `dockersette/setrai` image only.

## [v0.1.0] — 2026-10-11

- Initial public Setrai release with self-hosted workouts, exercise library, program builder, live sessions, statistics, recovery, profile settings, Docker image publication, and image-only Compose installation.
