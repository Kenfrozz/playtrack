// Domain model interfaces

export interface Course {
  id: number
  name: string
  playlist_url: string
  playlist_id: string
  thumbnail_url: string
  video_count: number
  watched_count: number
  created_at: string
  updated_at: string
}

export interface CourseInput {
  name: string
  playlist_url: string
}

export interface CourseVideo {
  id: number
  course_id: number
  video_id: string
  title: string
  thumbnail_url: string
  duration_seconds: number
  position: number
  watched: number
  created_at: string
}

export interface CourseWithProgress extends Course {
  watched_count: number
  total_duration_seconds: number
}

export interface CourseStats {
  total_duration_seconds: number
  total_videos: number
  total_watched: number
  unwatched_duration_seconds: number
}
