# Changelog

All notable changes to Setrai will be documented here.
Versions follow [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`

- **MAJOR** — breaking changes (e.g. DB schema requires migration)
- **MINOR** — new features, backwards compatible
- **PATCH** — bug fixes, visual tweaks

---

## [Unreleased]

- Fixed: finishing a workout a second time (a network retry or a double tap) no longer moves its finish time to now. Sending an explicit `finishedAt` still corrects it, but a finish time before the workout started is now refused (`400`), as are notes that are not text or longer than 5000 characters.
- Fixed: after a short network drop during a workout, logging the next set kept failing with the old error until you did something else first. It now works on the first tap once the network is back. Discarding the session had the same problem and is fixed too.
- Fixed: several kinds of invalid API input returned a server error (`500`) instead of a clear `400`: a JSON body that is not an object, body-weight notes that are not text, a non-list `equipment` for Quick Workout, and session names or notes that are not text. Body weight is now capped at 1000 kg, and moving a body-weight entry onto a date that already has one returns `409`.
- Programs API: `blocks` are now validated (`400` with the reason when a block is malformed or names an exercise that is not in the program), and `slug`, `isTemporary` and the `seed*` fields in create or update requests are ignored instead of stored. Creating or updating a program is now all-or-nothing.
- Fixed: every Quick Workout left a hidden program behind in the database. It is now removed when the workout is finished or discarded, and leftovers from earlier versions are cleared at startup. Finished Quick Workouts still show in History with their full plan.
- Statistics now include all of your history: totals, personal records and streaks used to ignore everything older than the newest 1000 sessions. Statistics and recovery also load much faster on large histories.
- Fixed: History (calendar, list and monthly recap) only showed your newest 50 workouts. It now shows all of them and loads in a single request instead of one per workout. `GET /api/sessions` accepts optional `from`, `to`, `limit` and `includeSets=1`; without them it behaves as before.
- New: during a strength workout, the current set shows what you did for that set last time (for example "Last time: 80 kg x 8") and a simple progression hint: when every set last time reached the top of the rep range, it suggests 2.5 kg (5 lb) more, otherwise to repeat the weight. The hint is advisory and does not change the pre-filled values.
- New: an exercise's page shows a Progress section once you have logged it: a trend chart (estimated 1RM, or reps or duration for bodyweight and timed exercises), your bests, and the last five sessions. New endpoint `GET /api/statistics/exercises/:slug`.
- Fixed: a workout finished near midnight could land on one day in History and on another for streaks and "this week", because statistics used UTC. Days and weeks now follow your time zone everywhere. The profile has a new `timeZone` setting, filled in from your browser the first time you open the app after upgrading; `GET /api/statistics` reports it as `timeZone`. Stored times do not change.
- Faster app loads: the built JavaScript and CSS files have content hashes in their names and are now cached by the browser for good, instead of being downloaded again on every visit. `index.html` is still checked on every load, so a new release shows up on the next reload.
- Backups: exporting no longer freezes the app while the archive is built (it is streamed; the file format is unchanged and older archives still restore). Restores copy data by column name, which keeps them correct if a future version reorders a table. Only the newest 5 automatic `setrai-before-restore-*` safety backups in `data/backups` are kept; older ones are deleted on the next restore. The restore screen now notes that API keys come from the backup.
- Uploaded exercise images that no exercise (or workout in progress) uses any more are now deleted at startup and once a day, after a 24 hour grace period, so `data/media/exercises` and backups stop growing with unused files. Only files Setrai uploaded itself are touched.
- `.env.example` now marks `SETRAI_AUTH_ENABLED`, `SETRAI_AUTH_PASSWORD` and the `AI_*` settings as not implemented (they never had an effect), and `GET /api/capabilities` reports `"ai": false` until an AI feature exists, even with `AI_ENABLED=true`. Settings and the docs now say plainly that API keys identify other apps but do not lock Setrai.

## [v0.9.1] — 2026-11-23

- Fixed a crash: requesting a folder of the web app (for example `/assets`) took the whole server down. It now serves the app instead, and malformed `%` escapes in a URL no longer cause a server error.
- Fixed a security issue: an exercise name containing HTML could run script when its personal record was shared. Exercise and muscle names are now always shown as plain text.
- Other websites open in your browser can no longer change Setrai data. Write requests that a browser marks as cross-site are refused (`403`), and JSON request bodies must be sent with `Content-Type: application/json` (`415` otherwise). The web app and the setrai-omarchy plugin already do this. If you call the API from your own scripts, add that header to requests with a body.
- Fixed a startup failure: if you deleted a built-in exercise, a future release adding a built-in workout that uses it would have stopped Setrai from starting. That workout is now skipped, and updates to existing built-in workouts keep your current plan in that case.

## [v0.9.0] — 2026-11-21

- Removed the Omarchy snapshot: `GET /api/omarchy/snapshot` (now the normal 404) and the optional snapshot file writer. The setrai-omarchy plugin reads the regular API with an API key and no longer uses either. If you had enabled the snapshot, the file stops updating; you can delete it. The `SETRAI_OMARCHY_SNAPSHOT_*` variables are now ignored and can be removed from `.env`, along with the snapshot bind mount in `compose.yaml`. No data migration is needed.

## [v0.8.4] — 2026-11-21

- Uploaded exercise images are served with a sandboxing Content-Security-Policy and `X-Content-Type-Options: nosniff`, so a script inside an uploaded SVG cannot run when the image's address is opened directly. Images in the app look the same.
- A request for an exercise image whose file disappears mid-request now ends that request instead of risking a server crash, and `HEAD` requests no longer open the file.

## [v0.8.3] — 2026-11-21

- Fixed exercise image uploads failing with a server error since v0.2.0: `POST /api/exercises/upload` crashed on every file, so neither the exercise editor nor an API client could attach an image.

## [v0.8.2] — 2026-11-15

- Fixed a standalone app window opened directly on `/statistics` showing Today instead, which is what the setrai-omarchy "Show stats" menu entry ran into. The redirect was meant for home-screen installs made before v0.4.0; such an install now opens on Statistics until its shortcut is added again.

## [v0.8.1] — 2026-11-15

- Fixed the current training streak reading 0 before the day's or week's first session. The day streak now counts back from yesterday until you train today, and the week streak counts back from last week until you train this week; a streak ends only once a full day or week is missed. `currentStreakDays` and `currentStreakWeeks` in `GET /api/statistics` change the same way. The longest streaks are unaffected.

## [v0.8.0] — 2026-11-13

- Added API keys. Settings has a new API keys section to generate a named key for another app, such as the setrai-omarchy plugin, and to revoke it later. A key has full admin access to the Setrai API and is sent as `Authorization: Bearer <key>`. It is shown once when created; Setrai stores only a hash. The web app itself still needs no key, but a request that carries a wrong or revoked key is refused.
- Added `GET /api/omarchy/snapshot`, which returns the live Omarchy snapshot to a plugin on another machine. It requires an API key.
- `GET /api/recovery` now returns `readiness`, the overall "% ready" figure, and `GET /api/statistics` returns `bodyWeightChangeKg`, the Body tab's total change. The Today, Recovery and Statistics pages read these values from the server instead of working them out in the browser, so other apps such as the setrai-omarchy plugin get the same numbers.

## [v0.7.1] — 2026-11-11

- Improved contrast of the orange accent. Orange buttons and banners use a slightly deeper orange so their white text is easier to read in both themes, and orange text in the light theme uses the same shade. The dark theme keeps the brighter orange for text and icons, and share images keep the original brand orange.

## [v0.7.0] — 2026-11-10

- Redesigned the five share images (workout summary, monthly recap, personal record, weekly volume, body progress) to match the app: chalk ground, white cards, the Archivo typeface and large condensed numerals. The "AI Training Coach" tagline is gone, and the workout image no longer shows "Done" or a dash for missing figures. Share images stay light in the dark theme.
- Added a dark theme. It follows your device by default, and Settings has a new Appearance section to force Light or Dark on that device. The browser and status bar colour follow the theme.

## [v0.6.0] — 2026-11-10

- Loading placeholders now match each screen's real layout, so content no longer jumps when it arrives, and they only appear when loading takes longer than a moment. The exercise grid placeholder, which was invisible on the light background, is fixed.
- Redesigned the rest timer: the countdown is a large heavy number inside a thicker ring, the filler heading is gone, the next exercise and set are shown plainly beneath, and the three buttons (15 seconds less, Skip, 15 seconds more) are the same size. Ring and number still turn orange for the final five seconds.
- Added feedback where it matters: logging a set fills the row's badge with a check before moving on, History, program, Settings and Instructions sections open and close smoothly, the exercise filter sheet slides up and down, the readiness number on Today counts up once when the app opens, and every button responds to a press the same way. All of it is switched off when your device asks for reduced motion.

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
