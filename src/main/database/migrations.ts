import { getDatabase } from './connection'

interface Migration {
  version: number
  description: string
  up: string
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Create courses table',
    up: `CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      playlist_url TEXT NOT NULL,
      playlist_id TEXT NOT NULL,
      video_count INTEGER NOT NULL DEFAULT 0,
      thumbnail_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )`
  },
  {
    version: 2,
    description: 'Create course_videos table',
    up: `CREATE TABLE IF NOT EXISTS course_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL,
      title TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL DEFAULT '',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      watched INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )`
  }
]

export function runMigrations(): void {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const applied = new Set(
    db
      .prepare('SELECT version FROM _migrations')
      .all()
      .map((row) => (row as { version: number }).version)
  )

  const pending = migrations.filter((m) => !applied.has(m.version))

  if (pending.length === 0) return

  const applyMigration = db.transaction(() => {
    for (const m of pending) {
      db.exec(m.up)
      db.prepare('INSERT INTO _migrations (version, description) VALUES (?, ?)').run(
        m.version,
        m.description
      )
    }
  })

  applyMigration()
}
