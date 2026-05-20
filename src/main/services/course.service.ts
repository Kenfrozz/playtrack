import * as courseRepo from '../repositories/course.repository'
import * as videoRepo from '../repositories/course-video.repository'
import * as youtubeService from './youtube.service'
import type { Course, CourseInput, CourseVideo, CourseWithProgress, CourseStats } from '../../shared/types'

export function list(): CourseWithProgress[] {
  return courseRepo.findAll()
}

export function get(id: number): Course {
  const course = courseRepo.findById(id)
  if (!course) throw new Error(`Course with id ${id} not found`)
  return course
}

export async function create(input: CourseInput): Promise<Course> {
  const playlistId = youtubeService.extractPlaylistId(input.playlist_url)

  let thumbnailUrl = ''
  let fetchedVideos: youtubeService.PlaylistVideo[] = []

  try {
    const result = await youtubeService.fetchPlaylist(playlistId)
    thumbnailUrl = result.thumbnailUrl
    fetchedVideos = result.videos
  } catch {
    // Videos failed to fetch - user can refresh later
  }

  const course = courseRepo.create(input, playlistId, thumbnailUrl)

  if (fetchedVideos.length > 0) {
    videoRepo.bulkInsert(
      course.id,
      fetchedVideos.map((v) => ({
        videoId: v.videoId,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        durationSeconds: v.durationSeconds,
        position: v.position
      }))
    )
    courseRepo.updateVideoCount(course.id, fetchedVideos.length)
  }

  return get(course.id)
}

export async function update(id: number, fields: { name?: string; playlist_url?: string }): Promise<Course> {
  const course = get(id)

  // If playlist URL changed, re-extract ID and re-fetch videos
  if (fields.playlist_url && fields.playlist_url !== course.playlist_url) {
    const playlistId = youtubeService.extractPlaylistId(fields.playlist_url)
    courseRepo.update(id, { ...fields })
    courseRepo.updatePlaylistId(id, playlistId)

    try {
      const result = await youtubeService.fetchPlaylist(playlistId)
      if (result.thumbnailUrl) courseRepo.updateThumbnail(id, result.thumbnailUrl)
      videoRepo.deleteByCourseId(id)
      videoRepo.bulkInsert(
        id,
        result.videos.map((v) => ({
          videoId: v.videoId,
          title: v.title,
          thumbnailUrl: v.thumbnailUrl,
          durationSeconds: v.durationSeconds,
          position: v.position
        }))
      )
      courseRepo.updateVideoCount(id, result.videos.length)
    } catch {
      // refresh later
    }
  } else {
    courseRepo.update(id, fields)
  }

  return get(id)
}

export function remove(id: number): void {
  courseRepo.remove(id)
}

export function getVideos(courseId: number): CourseVideo[] {
  return videoRepo.findByCourseId(courseId)
}

export function toggleWatched(videoId: number): CourseVideo {
  return videoRepo.toggleWatched(videoId)
}

export async function refreshVideos(courseId: number): Promise<CourseVideo[]> {
  const course = get(courseId)

  // Get current watched states
  const existing = videoRepo.findByCourseId(courseId)
  const watchedMap = new Map<string, number>()
  for (const v of existing) {
    watchedMap.set(v.video_id, v.watched)
  }

  // Fetch fresh videos
  const result = await youtubeService.fetchPlaylist(course.playlist_id)
  const videos = result.videos
  if (result.thumbnailUrl) {
    courseRepo.updateThumbnail(courseId, result.thumbnailUrl)
  }

  // Delete old and insert new
  videoRepo.deleteByCourseId(courseId)
  videoRepo.bulkInsert(
    courseId,
    videos.map((v) => ({
      videoId: v.videoId,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      durationSeconds: v.durationSeconds,
      position: v.position
    }))
  )

  // Restore watched states
  const newVideos = videoRepo.findByCourseId(courseId)
  for (const v of newVideos) {
    if (watchedMap.get(v.video_id) === 1 && v.watched === 0) {
      videoRepo.toggleWatched(v.id)
    }
  }

  courseRepo.updateVideoCount(courseId, videos.length)
  return videoRepo.findByCourseId(courseId)
}

export function getStats(): CourseStats {
  return videoRepo.getStats()
}
