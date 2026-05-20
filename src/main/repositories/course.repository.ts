import { getDatabase } from '../database/connection'
import type { Course, CourseInput, CourseWithProgress } from '../../shared/types'

export function findAll(): CourseWithProgress[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT c.*,
              COALESCE(w.cnt, 0) AS watched_count,
              COALESCE(d.total, 0) AS total_duration_seconds,
              CASE WHEN c.thumbnail_url = '' OR c.thumbnail_url IS NULL
                   THEN COALESCE(ft.thumbnail_url, '')
                   ELSE c.thumbnail_url
              END AS thumbnail_url
       FROM courses c
       LEFT JOIN (
         SELECT course_id, COUNT(*) AS cnt
         FROM course_videos
         WHERE watched = 1
         GROUP BY course_id
       ) w ON w.course_id = c.id
       LEFT JOIN (
         SELECT course_id, SUM(duration_seconds) AS total
         FROM course_videos
         GROUP BY course_id
       ) d ON d.course_id = c.id
       LEFT JOIN (
         SELECT course_id, thumbnail_url
         FROM course_videos
         WHERE position = 0
       ) ft ON ft.course_id = c.id
       ORDER BY c.updated_at DESC`
    )
    .all() as CourseWithProgress[]
}

export function findById(id: number): Course | undefined {
  const db = getDatabase()
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as Course | undefined
  if (!course) return undefined
  const row = db
    .prepare('SELECT COUNT(*) AS cnt FROM course_videos WHERE course_id = ? AND watched = 1')
    .get(id) as { cnt: number }
  return { ...course, watched_count: row.cnt }
}

export function create(input: CourseInput, playlistId: string, thumbnailUrl: string): Course {
  const db = getDatabase()
  return db
    .prepare(
      `INSERT INTO courses (name, playlist_url, playlist_id, thumbnail_url) VALUES (?, ?, ?, ?) RETURNING *`
    )
    .get(input.name, input.playlist_url, playlistId, thumbnailUrl) as Course
}

export function update(id: number, fields: { name?: string; playlist_url?: string }): void {
  const db = getDatabase()
  const sets: string[] = []
  const values: unknown[] = []
  if (fields.name !== undefined) {
    sets.push('name = ?')
    values.push(fields.name)
  }
  if (fields.playlist_url !== undefined) {
    sets.push('playlist_url = ?')
    values.push(fields.playlist_url)
  }
  if (sets.length === 0) return
  sets.push("updated_at = datetime('now','localtime')")
  values.push(id)
  db.prepare(`UPDATE courses SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

export function remove(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM courses WHERE id = ?').run(id)
}

export function updateVideoCount(id: number, count: number): void {
  const db = getDatabase()
  db.prepare(
    `UPDATE courses SET video_count = ?, updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(count, id)
}

export function updatePlaylistId(id: number, playlistId: string): void {
  const db = getDatabase()
  db.prepare('UPDATE courses SET playlist_id = ? WHERE id = ?').run(playlistId, id)
}

export function updateThumbnail(id: number, thumbnailUrl: string): void {
  const db = getDatabase()
  db.prepare('UPDATE courses SET thumbnail_url = ? WHERE id = ?').run(thumbnailUrl, id)
}
