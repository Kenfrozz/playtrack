import { useCallback, useEffect, useState } from 'react'
import type { CourseWithProgress, CourseInput, CourseVideo } from '@shared/types'
import { apiCall } from '@/api/client'

interface UseCoursesReturn {
  courses: CourseWithProgress[]
  loading: boolean
  error: string | null
  createCourse: (input: CourseInput) => Promise<void>
  updateCourse: (id: number, fields: Partial<CourseInput>) => Promise<void>
  deleteCourse: (id: number) => Promise<void>
  refresh: () => void
}

export function useCourses(): UseCoursesReturn {
  const [courses, setCourses] = useState<CourseWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    apiCall('course:list')
      .then((data) => {
        setCourses(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createCourse = useCallback(
    async (input: CourseInput): Promise<void> => {
      await apiCall('course:create', input)
      refresh()
    },
    [refresh]
  )

  const updateCourse = useCallback(
    async (id: number, fields: Partial<CourseInput>): Promise<void> => {
      await apiCall('course:update', { id, ...fields })
      refresh()
    },
    [refresh]
  )

  const deleteCourse = useCallback(
    async (id: number): Promise<void> => {
      await apiCall('course:delete', { id })
      setCourses((prev) => prev.filter((c) => c.id !== id))
    },
    []
  )

  return { courses, loading, error, createCourse, updateCourse, deleteCourse, refresh }
}

interface UseCourseVideosReturn {
  videos: CourseVideo[]
  loading: boolean
  toggleWatched: (videoId: number) => Promise<void>
  refreshVideos: () => Promise<void>
}

export function useCourseVideos(courseId: number | null): UseCourseVideosReturn {
  const [videos, setVideos] = useState<CourseVideo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!courseId) {
      setVideos([])
      return
    }
    setLoading(true)
    apiCall('course:videos', { id: courseId })
      .then((data) => {
        setVideos(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [courseId])

  const toggleWatched = useCallback(
    async (videoId: number): Promise<void> => {
      const updated = await apiCall('course:toggle-watched', { id: videoId })
      setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
    },
    []
  )

  const refreshVideos = useCallback(async (): Promise<void> => {
    if (!courseId) return
    setLoading(true)
    const data = await apiCall('course:refresh-videos', { id: courseId })
    setVideos(data)
    setLoading(false)
  }, [courseId])

  return { videos, loading, toggleWatched, refreshVideos }
}
