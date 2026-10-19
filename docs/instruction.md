# Setrai — Product Instructions

> This document is the authoritative product specification for Setrai.
>
> If implementation, comments, README content, or older documentation conflict
> with this file, this file defines intended product behavior unless a newer
> architecture decision explicitly supersedes it.

---

# 1. Product objective

Setrai is a self-hosted, AI-native fitness and workout tracking application.

It is designed primarily for users who are comfortable running their own software
and want:

- full control of their training data;
- a local server and database;
- AI-assisted training features;
- no mandatory Setrai-operated cloud infrastructure.

Setrai must remain useful as a complete workout tracker even when all optional
integrations are disabled.

The core product is:

```text
Self-hosted fitness tracking
+
training planning
+
workout logging
+
statistics and recovery
+
optional AI assistance
```


---

# 2. Product identity

The product name is:

```text
Setrai
```

Use this capitalization consistently.

Do not use:

```text
SeTrAI
SetrAI
SeTrai
```

Setrai should be presented as a modern self-hosted training application rather
than as a cryptocurrency application or protocol-specific tool.

The UI should prioritize:

- training;
- local exercise library;
- programs;
- sessions;
- statistics;
- recovery;
- AI assistance.

Optional integrations should remain secondary.

---

# 3. Product principles

## 3.1 Self-hosted by design

Setrai runs on infrastructure controlled by the operator.

Typical deployment:

```text
Browser / PWA
      ↓
Setrai server
      ↓
SQLite
```

Docker Compose is the primary installation method for distributed releases.
The image-only installer uses `dockersette/setrai`, runtime `.env` configuration,
and a persistent `/data` volume. Maintainers can keep building from source or use
the separate Compose build override. Installation does not require optional
integrations. Public access requires a private VPN or authenticated HTTPS proxy
until application authentication is implemented. See `docs/deployment.md`.

Setrai should not require a hosted Setrai account.

---

## 3.2 Local ownership

Training data belongs to the operator.

Core application data is stored in the local Setrai database.

This includes:

- exercises;
- exercise favorites;
- programs;
- program structure;
- workout sessions;
- logged sets;
- weight used;
- repetitions;
- session history;
- body-weight history;
- statistics inputs;
- recovery inputs;
- local application preferences.

---

## 3.3 Optional integrations

The following integrations are optional:

- AI;

Each is controlled through deployment configuration.

A disabled integration should be dormant.

A disabled integration must not prevent normal Setrai operation.

---

## 3.4 Configuration over account setup

Setrai targets self-hosted users.

Advanced integrations should therefore primarily be configured through `.env`
rather than requiring consumer-style setup flows inside the application.

Example:


Changes to deployment configuration may require restarting Setrai.

---

## 3.5 Server-side secrets

Secrets stay on the server.

Examples:


The browser never receives them.

---

# 4. Core navigation

The exact responsive presentation may evolve, but the main application concepts
are:

```text
Home
Exercises
Workouts
Statistics
Profile
```

AI capabilities may introduce:

```text
Coach
```

or AI actions inside existing features.

The navigation should remain focused and avoid exposing implementation details.
Desktop navigation includes a labeled Settings link with a gear icon to `/profile`.
Mobile exposes Settings through the header gear.
Menu navigation between core pages keeps the application shell mounted rather
than reloading the document. Browser Back and Forward update the selected view.
Live session navigation retains document teardown until its timer lifecycle has
an explicit client routing cleanup contract.

---

# 5. Exercise library

The exercise library is a core feature.

Exercises is a local-only list backed by SQLite. A fresh installation receives
the bundled 56-exercise library and seven bundled Workouts. Bundled entities use
immutable Setrai seed keys, monotonic revisions, and stored baselines: repeated
startup is idempotent, older revisions are ignored, and newer revisions change
only fields that the user has not edited locally. Deleting a bundled entity
creates a tombstone so later startup does not reinstall it.
Exercises have no Web status, publication, remote catalog, refresh, or import
controls. Images use bundled `/images/` files or uploads under
`/media/exercises/` on the Setrai server. External image URLs are rejected on
create/update; legacy remote references display the local fallback without fetching.

Users must be able to:

- browse exercises;
- search exercises;
- filter exercises;
- favorite exercises;
- inspect exercise details;
- use exercises when building programs;
- use exercises in generated workouts.

Useful exercise metadata may include:

- name;
- muscle group;
- granular muscles;
- equipment;
- difficulty;
- instructions;
- image;
- tags.

Exercise create/edit uses the canonical taxonomy in
`src/shared/exercise-taxonomy.json`. Category, primary muscle, secondary muscles,
equipment, difficulty, and movement type (`compound` or `isolation`) are controlled
choices rather than free text. The
primary choice is a Recovery group; secondary choices may be anatomically more
specific, but every controlled value maps to a Recovery group and the front/back
body preview. The editor updates that
preview immediately, using a strong primary highlight and quieter secondary
highlight. Movement type is required for new manual exercises and is used by Quick
Workout scoring. Tags are retained only as internal compatibility metadata and are not
edited or displayed in normal exercise UI; descriptions and instructions remain free-form. The server
normalizes known aliases and rejects unsupported structural values so Recovery,
filters, body maps, and Quick Workout do not diverge because of spelling variants.
Legacy exercise data uses the audited correction data in
`src/shared/exercise-secondary-muscles.json` when older data contains only a
duplicate of its primary muscle. Explicit secondary muscle selections remain
authoritative. Existing exercises persist a successful image upload immediately instead
of requiring a second Save action; new exercises attach the uploaded image when the
exercise is created. JPEG, PNG, WebP, GIF, and SVG uploads may be up to 10 MB.
Sets, reps, weight, and rest are workout prescriptions, not exercise identity, so
exercise cards, details, and editing do not present them. New manual workout rows
start with neutral editable values, while Quick Workout derives its prescription
from the active Profile training goal. Legacy exercise default fields remain API and
storage compatibility metadata only.
When a new workout does not prescribe a load, the session starts from the most
recent completed weight for that exercise. An explicit workout weight always wins;
sets, target reps, and rest remain owned by the current workout.

The UI should avoid displaying excessive metadata on exercise cards.

The normal card hierarchy should favor:

```text
exercise image
exercise name
primary muscle
difficulty
```

Secondary metadata belongs in filters or detail views when possible.
Card names, primary muscle (or category when no primary muscle is available),
and difficulty appear on three separate lines. Names are prominent; difficulty
uses quieter text and a small muted dot: green for Beginner, orange for
Intermediate, red for Advanced, and neutral for unknown levels. Difficulty
always retains its text label so meaning does not depend on color.
Card titles reserve two lines at every screen size. Longer titles truncate with
an ellipsis; the full name remains available in the card's accessible link label
and exercise detail view.
Selection uses an icon-only toggle with a contrasting active state and an
accessible label. In selection mode, cards show a black circle at the bottom
left, with a white check only when selected. Favorite controls are hidden and titles stay unobstructed;
tapping a card toggles selection without opening its details.

The filter button opens a bottom sheet on mobile and a centered dialog on desktop,
with labeled muscle, equipment, and difficulty options. Longer lists are searchable.
The sheet uses the standard white surfaces, muted borders, and black selected
states, with Reset and a live result-count button. Removable chips keep selected
values visible after closing; resetting facets preserves search and favorites. Exercise
details follow the Workstr card layout: image, title and classification
badges, Sets/Reps/Rest tiles, target muscles and front/back map, equipment,
then a collapsed Instructions disclosure and favorite action. Primary and
secondary muscles use distinct highlights. Library cards show the primary
muscle and difficulty, with equipment reserved for details.

---

# 6. Exercise imagery

Exercise imagery is an important part of the Setrai visual experience.

The UI must treat images consistently across:

- exercise library cards;
- exercise selection;
- workout/program editing;
- live training;
- exercise detail views.

A standard source image ratio should be used wherever practical.

The UI may render the same image differently depending on context, but should not
distort the source image.

Exercise imagery should remain visually prominent without making cards excessively
large on mobile.

---

# 7. Favorites

Users can favorite exercises.

Favorites must be useful, not merely decorative.

The exercise library must provide an easy way to display only favorites.

The favorite action should be visually consistent across exercise surfaces.

---

# 8. Programs

Programs are reusable workout definitions.

A program may contain:

- name;
- description;
- difficulty;
- tags;
- ordered exercises;
- sets;
- reps;
- rest duration;
- target weight;
- notes;
- structured blocks where required.

Users must be able to:

- create programs;
- edit programs;
- reorder exercises;
- change prescriptions;
- start a workout from a program;
- duplicate or modify programs as product behavior evolves.

Workouts shows the locally saved Library, including the seven bundled seeds.
There are no remote catalogs, publication, import, refresh, or Web/Update status
controls.
The list uses a search toolbar, goal/focus/format/level/equipment
filters, and expandable program cards with front/back muscle maps, estimated
duration, level, and goal/focus summaries. Filters use the same themed
sheet, searchable long lists, and removable chips as Exercises. Expanded cards show exercise
prescriptions and structured block previews. Search keeps keyboard focus.
Workout card estimates use 45 seconds per strength set plus rest between sets,
added to scheduled EMOM duration, matching Workstr-web. An exercise also used in
a straight block retains its strength estimate when its slug appears in EMOM.
Blank exercise names fall back to exercise metadata or a readable slug. Workout
muscle labels group biceps, triceps, and forearms as Arms; maps retain anatomical
regions and highlight every exercise's primary muscle as primary.

Library supports creating, editing, ordering exercises, changing sets/reps/rest/
weight/notes, duplicating, deleting, and starting programs. The builder uses local
exercises and supports normal sets, supersets, EMOM sections, circuits sharing an
interval, and mixed strength/EMOM plans. Goals are author-selected; focus, format,
and equipment filters derive from exercises and blocks. My equipment uses the
saved local equipment profile. Library keeps an active-workout Resume action. Quick Workout lives in Recovery. Completed sessions appear in the History tab; Library
does not duplicate them in a Recent sessions section.

---

# 9. Workout sessions

Users must be able to start a workout from a program.

During a live session, Setrai should support:

- exercise sequence;
- current set;
- target reps;
- actual reps;
- weight;
- completion state;
- rest timer;
- session duration;
- notes where appropriate.

The live workout interface must prioritize fast interaction.

Live sessions use the Workstr layout: a full-screen exercise header and elapsed
clock, connected exercise rail, centered 4:3 exercise media, prescription tiles, one set
worksheet, technique accordion, and fixed bottom training actions. The live UI
uses the compact Workstr proportions with warm off-white surfaces, restrained
sage progress accents, and a dark primary action on a light footer.
Live exercise images fit fully without cropping or distortion. Media scales down
on short viewports while preserving its ratio; the worksheet remains scrollable
and the bottom training action stays visible.
Live media defaults to a compact image with an enlarge/reduce control beside it.
The selected image size is a device-local presentation preference, retained
across exercise changes and reloads. Compact mobile spacing prioritizes the
image, prescription, set worksheet, and primary action on one screen; longer
plans and expanded technique instructions remain scrollable.
Target values remain on one line, and exercise/interval markers display their actual numbers. Logged sets
can be corrected or deleted; adding a set persists across reloads. Reps and load
carry forward from the previous set, with load displayed in the saved kg/lb unit.

Straight supersets move directly between exercises and rest after each round.
Mixed workouts hand off from strength to EMOM. EMOM starts explicitly and supports
pause/resume, interval navigation, timed work/recovery phases, actual interval
logging, and early completion. Timed targets never invent actual reps. Clock
position and active elapsed time are separate, so seeking does not add training
time and pausing stops the active clock. Session plans, extra sets, rest deadlines
and EMOM clocks survive reloads. Plans are captured when a session starts.
Rest and EMOM phase countdowns cue the final five seconds and the transition
against the same deadline as the displayed clock. Pausing, seeking, skipping,
changing a deadline, or leaving the foreground cancels obsolete sound cues;
returning does not replay missed beeps. Sound remains optional.

The header End control discards an active session after confirmation; finishing
preserves logged work in history. Completed sessions cannot be discarded through
the live session endpoint.

Users should not need to navigate through complex forms while training.

---

# 10. Rest timer

Setrai includes a rest timer for workout sessions.

The timer should:

- start easily after completing a set;
- display remaining rest clearly;
- allow adjustment or dismissal;
- remain usable on mobile;
- provide a warm light rest overlay with a clear sage countdown ring, next
  exercise and set, −15/+15 seconds, and Skip rest; keyboard focus remains in
  the overlay and Escape skips rest;
- reconcile elapsed wall time after backgrounding, without clearing input drafts;
- continue to the next prescribed move when rest expires or is skipped.

---

# 11. Workout history

Completed sessions become part of the canonical training history.

History is used for:

- statistics;
- progression analysis;
- recovery calculations;
- AI recommendations;
- personal records;
- future program decisions.

Historical records should remain stable even if a program is later edited.

---

# 12. Statistics

Setrai includes useful training statistics.

Initial statistics may include:

- training frequency;
- weekly volume;
- exercise volume;
- muscle distribution;
- training streak;
- estimated 1RM;
- personal records;
- body-weight history.

Statistics should derive from canonical training data.

They should not require AI.

---

# 13. Recovery

Recovery is a core Setrai feature.

Setrai should estimate muscle recovery from recent training history.

Recovery logic should be deterministic and usable without AI.

Recovery output may influence:

- recommended exercises;
- Quick Workout;
- AI Coach recommendations;
- program suggestions.

AI may interpret recovery information, but AI must not be required to calculate
the base recovery state.

---

# 14. Quick Workout

Setrai should support generating a workout when the user does not want to select
an existing program.

Quick Workout may consider:

- recent training;
- muscle recovery;
- available equipment;
- exercise library;
- workout duration;
- user goals.

The deterministic training system should be capable of producing a useful result
without requiring AI.

Quick Workout is built directly in the Recovery section, with 20/30/45/60-minute
choices and a preview before starting. The former `/quick-workout` URL redirects
to `/workouts/recovery`. Generation uses the local exercise library and saved
equipment. Like Workstr, primary muscle groups must be at least 80% recovered;
groups without recent logged training are fresh and eligible. Granular aliases
are grouped into the recovery map regions, using the lowest readiness in a group.
There is no fallback to tired muscles: a small pool produces a shorter workout,
and no ready exercises produces an actionable empty message. Selection cycles
across eligible groups, preferring completed-before and compound exercises within
each group, with deterministic name/slug tie-breaking. Duration allows roughly
one exercise per nine minutes, reported as an estimate. Set/repetition/rest
prescriptions continue to follow the saved training goal. Users can swap within
the same ready group or remove exercises before starting the exact preview as a
temporary Program-backed Session; building a preview never saves a library item.

AI may enhance or personalize this result when enabled.

---

# 15. Equipment

Users should be able to define available equipment.

Examples include:

```text
barbell
dumbbells
bench
cable machine
pull-up bar
bodyweight
```

Equipment information can be used by:

- exercise filters;
- Quick Workout;
- recovery-generated sessions;
- AI recommendations.

Generated workouts should not routinely recommend equipment the user does not
have.

---

# 16. Body-weight tracking

Setrai may store body-weight history.

Users should be able to:

- enter weight;
- associate weight with a date;
- review historical values.

Body-weight information may be used in statistics and AI context.

---

# 17. Profile

Setrai has a local profile concept.

The local profile may include:

- display name;
- avatar;
- preferences;
- training goals;
- equipment;
- unit preferences.

The app header uses a neutral Settings link without a placeholder name or avatar.
An empty local profile must not display a fabricated identity.
The current local-only Settings page exposes Training and Equipment and hides
the Profile identity section. Any future identity integration must explicitly
restore its visibility contract.
The Training settings accordion presents every goal as a directly selectable
description with its intent and exact Quick Workout starting prescription.
General Fitness is selected by default. These descriptions and the generator
presets share `src/shared/training-goals.json` so displayed guidance cannot drift
from runtime behavior.

---

# 18. AI

AI is a major optional Setrai capability.

AI must be useful for fitness and training workflows rather than being added only
for branding.

Potential AI functions include:

- program generation;
- workout generation;
- training-plan adjustments;
- session analysis;
- exercise recommendations;
- recovery interpretation;
- progression suggestions;
- natural-language interaction with training history;
- explanation of statistics.

---

# 19. AI providers

Setrai should support a provider abstraction.

A primary use case is self-hosted inference through:

```text
Ollama
```

Example configuration:

```env
AI_ENABLED=true
AI_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434
AI_MODEL=
```

The architecture should allow additional providers later without rewriting core
training features.

---

# 20. AI data access

AI must access Setrai data through documented service interfaces.

AI may receive information such as:

- recent sessions;
- programs;
- exercise metadata;
- equipment;
- recovery status;
- body-weight history;
- user preferences.

AI should receive only the context required for the requested task.

Core features must not depend on an AI response to function.

---

# 21. AI failure behavior

If AI is unavailable:

- the core app continues working;
- workouts remain accessible;
- session logging remains functional;
- recovery continues working;
- statistics remain available.

AI provider failure should produce a clear error without corrupting application
state.

---

# 36. Capability combinations

Core training works with both optional integrations disabled. AI can be enabled
wallet functionality. Neither changes the local exercise and workout library.

---

# 37. Capabilities API

The server should expose a safe representation of active capabilities.

Example:

```text
GET /api/capabilities
```

Response:

```json
{
  "ai": true
}
```

The response must never contain secret configuration.

---

# 38. Configuration model

Setrai uses `.env` for deployment-level configuration.

`.env.example` should document supported settings.

Important groups should include:


Optional integrations should be OFF by default unless explicitly decided
otherwise.

---

# 39. Restart behavior

Changes to deployment-level configuration may require restarting Setrai.

This is acceptable and expected for a self-hosted application.

The product does not need to dynamically activate every integration without a
restart.

---

# 40. Backup and restore

Setrai supports complete backup and restore from Settings → Backup.

Backups should cover canonical application data.

At minimum this includes:

- SQLite database, exported as a consistent snapshot;
- locally stored exercise media where applicable;
- relevant application-owned data.

The downloadable `.setrai` archive includes the SQLite database plus all
uploaded files under `data/media`, including custom exercise images. Import validates
the archive and database, requires explicit replacement confirmation, migrates older
Setrai databases forward, rejects backups from newer schema versions, and creates a
complete server-side safety archive before replacing current data and media. Legacy
`.db` imports remain supported, but they restore database data only.

Secrets require special handling.

A backup mechanism must not casually expose:

- API keys.

If `.env` is backed up, the backup should be treated as highly sensitive.

---

# 41. Units

Setrai should support configurable weight units.

Internally, a canonical representation should be used consistently.

UI may present:

```text
kg
lb
```

according to user preference.

Conversions must not silently alter historical accuracy.

---

# 42. Mobile-first usability

Setrai should work well as a PWA on mobile devices.

Primary workflows must remain comfortable on a phone:

- browsing exercises;
- starting workouts;
- logging sets;
- running timers;
- reviewing programs;
- checking recovery;
- using AI features.

Desktop support remains important for self-hosted users, but workout interaction
should prioritize mobile ergonomics.

---

# 43. Visual design

Setrai uses a premium warm light interface with off-white canvas, white surfaces,
near-black text, and restrained semantic accents. Live training may use dark
header and action surfaces for emphasis.

The exact design system may evolve, but it should feel:

- modern;
- clean;
- technical;
- premium;
- focused;
- appropriate for an AI-native fitness application.

Use a consistent compact scale across the application. Phone page titles use
30 px text; headers, navigation icons, cards, and tiles should follow the compact
Exercise library proportions. Touch controls remain at least 44 px tall and form
input text remains 16 px to avoid automatic zoom on iOS. Shared spacing and title
size tokens keep feature pages consistent; tablet and desktop layouts adapt
without oversized hero typography.

Use 1 px neutral borders for cards and controls, with stronger 2 px focus outlines.
Page titles share a 30 px phone / 36 px desktop maximum scale and consistent
header spacing. Use sentence case controls, restrained font weights, and whitespace
to establish hierarchy; avoid decorative grids and heavy nested box outlines.

Avoid excessive decorative complexity.

Content hierarchy is more important than visual novelty.

---

# 44. Setrai color identity

Setrai should have its own product identity rather than inheriting protocol-specific
branding.


Protocol colors may appear inside their respective integrations.

The main Setrai palette should remain protocol-neutral.

---

# 45. Exercise image identity

Exercise imagery may retain a distinctive neon training style.

The image system does not need to use the same accent color as the application
chrome.

Strong orange or neon exercise artwork can coexist with a separate Setrai UI
palette.

---

# 46. Local storage and seeds

Exercises, programs, and workout history are saved directly in SQLite.
Bundled exercises and workouts are installed through versioned local seeds.
There is no external catalog, content publication, or public identity dependency.

---

# 47. Failure isolation

An optional integration should not bring down unrelated Setrai functions.


```text
wallet functions fail gracefully
training continues
```

If Ollama is unavailable:

```text
AI functions fail gracefully
training continues
```

---

# 48. Security expectations

Detailed security requirements live in:

```text
docs/security.md
```

At the product level:

- secrets remain server-side;
- private keys are never sent to the browser;
- explicit confirmation is required before spending funds;
- optional integrations must not weaken core-data integrity.

---

# 49. Architecture expectations

Detailed architecture rules live in:

```text
docs/architecture.md
```

The product should remain modular enough for AI coding agents to work on one
feature without loading the entire repository.

Routine product work should normally require only:

```text
relevant specification section
+
module ownership entry
+
owning source directory
+
explicit service contracts
```

---

# 50. Scope discipline

Setrai should avoid accumulating features merely because they are technically
possible.

New features should serve at least one of these product goals:

- improve workout tracking;
- improve training planning;
- improve recovery understanding;
- improve self-hosted ownership;
- improve AI-assisted training;
- improve optional private payments.

Protocol experimentation that does not improve the fitness product should not
drive the core application.

---

# 51. Initial product scope

The initial Setrai implementation should focus on:

1. local exercise library and versioned seeds;
2. programs;
3. workout sessions;
4. statistics;
5. recovery;
6. equipment;
7. body-weight tracking;
8. backup/restore;
9. optional AI;

Additional features can be introduced after this base is stable.

---

# 52. Explicit non-goals

Setrai is not intended to be:

- a general-purpose cryptocurrency wallet;
- a social network;
- a cloud SaaS account system;
- dependent on Setrai-operated infrastructure.


---

# 53. Product completion rule

A feature is not complete merely because its UI exists.

A Setrai feature should include, where relevant:

- defined behavior;
- persistent storage;
- API contract;
- client behavior;
- failure handling;
- tests;
- documentation;
- architecture ownership.

---

# 54. Guiding product model

Setrai should be understandable as:

```text
A self-hosted training system
        +
an optional AI coach
        +
an optional private payment wallet
```

The core training system always comes first.
