export const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  category TEXT NOT NULL DEFAULT '',
  muscle_group TEXT NOT NULL DEFAULT '',
  muscles TEXT NOT NULL DEFAULT '[]',
  equipment TEXT NOT NULL DEFAULT '[]',
  difficulty TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  instructions TEXT NOT NULL DEFAULT '[]',

  image_url TEXT NOT NULL DEFAULT '',

  favourite INTEGER NOT NULL DEFAULT 0,

  default_sets INTEGER NOT NULL DEFAULT 3,
  default_reps TEXT NOT NULL DEFAULT '8-12',
  default_rest INTEGER NOT NULL DEFAULT 90,

  source_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'active',

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  difficulty TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  blocks TEXT NOT NULL DEFAULT '[]',

  is_temporary INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS program_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  program_id INTEGER NOT NULL,
  exercise_id INTEGER,

  exercise_slug TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,

  sets INTEGER NOT NULL DEFAULT 3,
  reps TEXT NOT NULL DEFAULT '8-12',
  rest_sec INTEGER NOT NULL DEFAULT 90,
  weight REAL,

  notes TEXT NOT NULL DEFAULT '',

  FOREIGN KEY (program_id)
    REFERENCES programs(id)
    ON DELETE CASCADE,

  FOREIGN KEY (exercise_id)
    REFERENCES exercises(id)
    ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  program_id INTEGER,

  program_name TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,

  notes TEXT NOT NULL DEFAULT '',


  FOREIGN KEY (program_id)
    REFERENCES programs(id)
    ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS session_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  session_id INTEGER NOT NULL,

  exercise_id INTEGER,
  exercise_slug TEXT NOT NULL,
  exercise_name TEXT NOT NULL DEFAULT '',

  set_number INTEGER NOT NULL,

  reps INTEGER,
  weight REAL,

  done INTEGER NOT NULL DEFAULT 1,

  logged_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (session_id)
    REFERENCES sessions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (exercise_id)
    REFERENCES exercises(id)
    ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS body_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  date TEXT NOT NULL UNIQUE,
  weight_kg REAL NOT NULL,

  notes TEXT NOT NULL DEFAULT '',

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);


CREATE INDEX IF NOT EXISTS idx_exercises_status
  ON exercises(status);

CREATE INDEX IF NOT EXISTS idx_exercises_slug
  ON exercises(slug);

CREATE INDEX IF NOT EXISTS idx_programs_slug
  ON programs(slug);

CREATE INDEX IF NOT EXISTS idx_program_exercises_program
  ON program_exercises(program_id);

CREATE INDEX IF NOT EXISTS idx_program_exercises_exercise
  ON program_exercises(exercise_id);

CREATE INDEX IF NOT EXISTS idx_sessions_started
  ON sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_sessions_program
  ON sessions(program_id);

CREATE INDEX IF NOT EXISTS idx_session_sets_session
  ON session_sets(session_id);

CREATE INDEX IF NOT EXISTS idx_session_sets_exercise
  ON session_sets(exercise_id);

CREATE INDEX IF NOT EXISTS idx_session_sets_slug
  ON session_sets(exercise_slug);

CREATE INDEX IF NOT EXISTS idx_body_log_date
  ON body_log(date);
`
