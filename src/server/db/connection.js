// src/server/db/connection.js

import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { runMigrations } from './migrations.js'
import {
  initializeDatabaseSeeds
} from './seed/seed.js'

export function openDatabase(dbPath, options = {}) {
  const directory = path.dirname(dbPath)

  fs.mkdirSync(directory, {
    recursive: true
  })

  const db = new DatabaseSync(dbPath)

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `)

  runMigrations(db)

  if (options.seed === true) {
    initializeDatabaseSeeds(db)
  }

  return db
}
