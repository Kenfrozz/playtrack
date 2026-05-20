import { useEffect, useState } from 'react'
import { apiCall } from '@/api/client'
import type { CourseStats } from '@shared/types'

const EXAM_DATE = new Date(2026, 9, 4)

function useCountdown() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = EXAM_DATE.getTime() - now.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60)
  }
}

function daysUntil(date: Date, now: Date): number {
  const diff = date.getTime() - now.getTime()
  return diff > 0 ? Math.floor(diff / 86400000) + 1 : 0
}

function formatDaily(totalSeconds: number, daysLeft: number): string {
  if (daysLeft <= 0) return '—'
  const daily = Math.ceil(totalSeconds / daysLeft)
  const h = Math.floor(daily / 3600)
  const m = Math.floor((daily % 3600) / 60)
  return h > 0 ? `${h}sa ${m}dk` : `${m}dk`
}

export default function TitleBar() {
  const [stats, setStats] = useState<CourseStats | null>(null)
  const { days, hours, minutes, seconds } = useCountdown()

  useEffect(() => {
    const fetch = () => apiCall('course:stats').then(setStats).catch(() => {})
    fetch()
    const id = setInterval(fetch, 5000)
    return () => clearInterval(id)
  }, [])

  const now = new Date()
  const totalSecs = stats?.unwatched_duration_seconds || 0
  const oneMonthBeforeExam = new Date(
    EXAM_DATE.getFullYear(),
    EXAM_DATE.getMonth() - 1,
    EXAM_DATE.getDate()
  )
  const days1m = daysUntil(oneMonthBeforeExam, now)
  const watched = stats?.total_watched || 0
  const remaining = Math.max((stats?.total_videos || 0) - watched, 0)
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="border-b border-border bg-card px-4 py-2.5 shrink-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
        <span className="font-bold tracking-[0.15em] uppercase text-foreground mr-1">PlayTrack</span>
        <span>
          <span>{days}</span>
          <span className="text-[9px]">g</span>{' '}
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
        <span className="text-muted-foreground/30">|</span>
        <span>
          {formatDaily(totalSecs, days1m)}
          <span className="text-[9px]">/1ay</span>
        </span>
        <span className="text-muted-foreground/30">|</span>
        <span>
          İzlenen {watched} | Kalan {remaining}
        </span>
      </div>
    </div>
  )
}
