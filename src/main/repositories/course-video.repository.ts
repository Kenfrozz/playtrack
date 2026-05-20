import { getDatabase } from '../database/connection'
import type { CourseVideo } from '../../shared/types'

export function findByCourseId(courseId: number): CourseVideo[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM course_videos WHERE course_id = ? ORDER BY position')
    .all(courseId) as CourseVideo[]
}

export interface BulkVideoInput {
  videoId: string
  title: string
  thumbnailUrl: string
  durationSeconds: number
  position: number
}

export function bulkInsert(courseId: number, videos: BulkVideoInput[]): void {
  const db = getDatabase()
  const stmt = db.prepare(
    `INSERT INTO course_videos (course_id, video_id, title, thumbnail_url, duration_seconds, position)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  const insertAll = db.transaction(() => {
    for (const v of videos) {
      stmt.run(courseId, v.videoId, v.title, v.thumbnailUrl, v.durationSeconds, v.position)
    }
  })
  insertAll()
}

export function toggleWatched(id: number): CourseVideo {
  const db = getDatabase()
  db.prepare('UPDATE course_videos SET watched = NOT watched WHERE id = ?').run(id)
  return db.prepare('SELECT * FROM course_videos WHERE id = ?').get(id) as CourseVideo
}

export function deleteByCourseId(courseId: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM course_videos WHERE course_id = ?').run(courseId)
}

export function findAllUnwatched(): CourseVideo[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT cv.* FROM course_videos cv
       JOIN courses c ON c.id = cv.course_id
       WHERE cv.watched = 0
       ORDER BY c.name, cv.position`
    )
    .all() as CourseVideo[]
}

export function countWatched(courseId: number): number {
  const db = getDatabase()
  const row = db
    .prepare('SELECT COUNT(*) AS cnt FROM course_videos WHERE course_id = ? AND watched = 1')
    .get(courseId) as { cnt: number }
  return row.cnt
}

export function getStats(): { total_duration_seconds: number; total_videos: number; total_watched: number; unwatched_duration_seconds: number } {
  const db = getDatabase()
  const row = db
    .prepare(
      `SELECT
        COALESCE(SUM(duration_seconds), 0) AS total_duration_seconds,
        COUNT(*) AS total_videos,
        COALESCE(SUM(watched), 0) AS total_watched,
        COALESCE(SUM(CASE WHEN watched = 0 THEN duration_seconds ELSE 0 END), 0) AS unwatched_duration_seconds
      FROM course_videos`
    )
    .get() as { total_duration_seconds: number; total_videos: number; total_watched: number; unwatched_duration_seconds: number }
  return row
}
