import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useCourses, useCourseVideos } from '@/hooks/useCourses'
import type { CourseWithProgress } from '@shared/types'
import TitleBar from './TitleBar'
import {
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Check,
  RefreshCw,
  Play,
  X,
  Pencil,
  Clock,
  BookOpen
} from 'lucide-react'

/* ─── Utility Functions ─── */

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatHM(totalSeconds: number): string {
  const t = totalSeconds || 0
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  return h > 0 ? `${h}sa ${m}dk` : `${m}dk`
}

const RING_R = 14
const RING_C = 2 * Math.PI * RING_R

/* ─── Header Bar ─── */

function SectionHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
      <h2 className="text-base font-bold tracking-tight-2">Dersler</h2>
      <div className="flex-1" />
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 h-7 px-3 font-mono text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-200"
      >
        <Plus className="size-3" strokeWidth={3} />
        Ekle
      </button>
    </div>
  )
}

/* ─── Modal Shell ─── */

function Modal({
  children,
  onClose
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop bg-black/50"
      onClick={onClose}
    >
      <div
        className="modal-content bg-card border border-border w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

/* ─── Main Component ─── */

export default function CoursesPage() {
  const { courses, loading, createCourse, updateCourse, deleteCourse, refresh } = useCourses()
  const [selectedCourse, setSelectedCourse] = useState<CourseWithProgress | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

  const [editCourse, setEditCourse] = useState<CourseWithProgress | null>(null)
  const [editName, setEditName] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const { videos, loading: videosLoading, toggleWatched, refreshVideos } = useCourseVideos(
    selectedCourse?.id ?? null
  )

  async function handleAdd() {
    if (!addName.trim() || !addUrl.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      await createCourse({ name: addName.trim(), playlist_url: addUrl.trim() })
      setAddName('')
      setAddUrl('')
      setShowAddDialog(false)
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : String(err)
      setAddError(msg)
    }
    setAdding(false)
  }

  async function handleDelete(id: number) {
    await deleteCourse(id)
    if (selectedCourse?.id === id) setSelectedCourse(null)
    setConfirmDelete(null)
  }

  function openEdit(course: CourseWithProgress) {
    setEditCourse(course)
    setEditName(course.name)
    setEditUrl(course.playlist_url)
    setEditError(null)
  }

  async function handleEdit() {
    if (!editCourse || !editName.trim()) return
    setEditing(true)
    setEditError(null)
    try {
      const fields: { name?: string; playlist_url?: string } = {}
      if (editName.trim() !== editCourse.name) fields.name = editName.trim()
      if (editUrl.trim() !== editCourse.playlist_url) fields.playlist_url = editUrl.trim()
      if (Object.keys(fields).length > 0) {
        await updateCourse(editCourse.id, fields)
        if (selectedCourse?.id === editCourse.id) {
          setSelectedCourse((prev) => (prev ? { ...prev, ...fields } : prev))
        }
      }
      setEditCourse(null)
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : String(err)
      setEditError(msg)
    }
    setEditing(false)
  }

  function handleSelectCourse(course: CourseWithProgress) {
    setSelectedCourse(course)
    setActiveVideoId(null)
  }

  function handleBack() {
    setSelectedCourse(null)
    setActiveVideoId(null)
    refresh()
  }

  /* Loading */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 className="size-4 animate-spin text-accent" />
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Yukleniyor
        </span>
      </div>
    )
  }

  /* ─── Detail View ─── */
  if (selectedCourse) {
    const watchedCount = videos.filter((v) => v.watched === 1).length
    const totalCount = videos.length
    const progressPct = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0

    return (
      <div className="flex h-full overflow-hidden animate-fade-in">
        {/* Left panel — video list */}
        <div className="w-[360px] shrink-0 border-r border-border flex flex-col bg-card">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
            <button
              onClick={handleBack}
              className="shrink-0 size-8 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground hover:bg-muted transition-all duration-200"
            >
              <ArrowLeft className="size-3.5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold truncate tracking-tight-2">
                {selectedCourse.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="label-caps">
                  {watchedCount}/{totalCount}
                </span>
                <span className="font-mono text-[11px] font-bold text-accent">
                  {progressPct}%
                </span>
              </div>
            </div>
            <button
              onClick={() => refreshVideos()}
              className="shrink-0 size-8 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground hover:bg-muted transition-all duration-200"
              title="Videolari yenile"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-[3px] bg-muted shrink-0">
            <div
              className={cn(
                'h-full bg-accent transition-all duration-500',
                progressPct > 0 && 'progress-glow'
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Video list */}
          <div className="flex-1 overflow-auto">
            {videosLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Play className="size-5 text-muted-foreground/30" />
                <p className="label-caps">Video bulunamadi</p>
              </div>
            ) : (
              videos.map((video, i) => (
                <div
                  key={video.id}
                  className={cn(
                    'video-item group/item flex items-center gap-2.5 px-3 py-2 border-b border-border/50 cursor-pointer transition-all duration-200',
                    activeVideoId === video.video_id
                      ? 'bg-accent/10 border-l-[3px] border-l-accent'
                      : 'hover:bg-muted/50 border-l-[3px] border-l-transparent'
                  )}
                  style={{ animationDelay: `${i * 25}ms` }}
                  onClick={() => setActiveVideoId(video.video_id)}
                >
                  {/* Number */}
                  <span
                    className={cn(
                      'shrink-0 w-5 text-center font-mono text-[10px] font-bold',
                      activeVideoId === video.video_id
                        ? 'text-accent'
                        : 'text-muted-foreground'
                    )}
                  >
                    {video.position + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative shrink-0 w-16 aspect-video overflow-hidden bg-muted">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt=""
                        className={cn(
                          'w-full h-full object-cover',
                          video.watched === 1 && 'opacity-40'
                        )}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="size-2.5 text-muted-foreground" />
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 px-1 py-px font-mono text-[7px] font-bold bg-black/80 text-white">
                      {formatDuration(video.duration_seconds)}
                    </span>
                    {video.watched === 1 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Check className="size-3.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <p
                    className={cn(
                      'flex-1 min-w-0 text-[11px] leading-tight line-clamp-2 font-medium',
                      video.watched === 1 &&
                        activeVideoId !== video.video_id &&
                        'text-muted-foreground line-through decoration-muted-foreground/30'
                    )}
                  >
                    {video.title}
                  </p>

                  {/* Watch toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleWatched(video.id)
                    }}
                    className={cn(
                      'shrink-0 size-5 flex items-center justify-center border transition-all duration-200',
                      video.watched === 1
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-border hover:border-accent/50'
                    )}
                    title={video.watched === 1 ? 'Izlenmedi isaretle' : 'Izlendi isaretle'}
                  >
                    {video.watched === 1 && <Check className="size-3" strokeWidth={3} />}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right — YouTube player */}
        <div className="flex-1 flex items-center justify-center bg-black">
          {activeVideoId ? (
            <iframe
              key={activeVideoId}
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube Player"
            />
          ) : (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="relative size-20 mx-auto">
                <div className="absolute inset-0 border border-white/10 flex items-center justify-center">
                  <Play className="size-8 text-white/15" />
                </div>
              </div>
              <p className="font-mono text-xs text-white/25 uppercase tracking-[0.2em]">
                Video Sec
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ─── List View ─── */
  return (
    <div className="flex flex-col h-full">
      <TitleBar />
      <SectionHeader onAdd={() => setShowAddDialog(true)} />

      {/* Add Dialog */}
      {showAddDialog && (
        <Modal onClose={() => { setShowAddDialog(false); setAddError(null) }}>
          <div className="h-[3px] bg-accent" />
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h3 className="font-bold text-sm tracking-tight-2">Yeni Ders Ekle</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                YouTube oynatma listesi baglayın
              </p>
            </div>
            <button
              onClick={() => { setShowAddDialog(false); setAddError(null) }}
              className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="px-5 pb-4 space-y-4">
            <div>
              <label className="label-caps">Ders Adi</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Turkce Dil Bilgisi"
                className="w-full h-10 mt-2 px-3 text-sm font-medium border border-input bg-background focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="label-caps">YouTube Playlist URL</label>
              <input
                type="text"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder="https://www.youtube.com/playlist?list=..."
                className="w-full h-10 mt-2 px-3 text-sm font-medium font-mono border border-input bg-background focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all duration-200"
              />
            </div>
            {addError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20">
                <span className="font-mono text-xs text-destructive">{addError}</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <button
              onClick={() => { setShowAddDialog(false); setAddError(null) }}
              className="h-9 px-4 font-mono text-xs font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            >
              Iptal
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !addName.trim() || !addUrl.trim()}
              className="h-9 px-5 font-mono text-xs font-bold uppercase tracking-wider bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
            >
              {adding ? <Loader2 className="size-3 animate-spin" /> : 'Ekle'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Dialog */}
      {editCourse && (
        <Modal onClose={() => setEditCourse(null)}>
          <div className="h-[3px] bg-accent" />
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h3 className="font-bold text-sm tracking-tight-2">Dersi Duzenle</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ders bilgilerini guncelleyin
              </p>
            </div>
            <button
              onClick={() => setEditCourse(null)}
              className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="px-5 pb-4 space-y-4">
            <div>
              <label className="label-caps">Ders Adi</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-10 mt-2 px-3 text-sm font-medium border border-input bg-background focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="label-caps">YouTube Playlist URL</label>
              <input
                type="text"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="w-full h-10 mt-2 px-3 text-sm font-medium font-mono border border-input bg-background focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all duration-200"
              />
            </div>
            {editError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20">
                <span className="font-mono text-xs text-destructive">{editError}</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <button
              onClick={() => setEditCourse(null)}
              className="h-9 px-4 font-mono text-xs font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            >
              Iptal
            </button>
            <button
              onClick={handleEdit}
              disabled={editing || !editName.trim()}
              className="h-9 px-5 font-mono text-xs font-bold uppercase tracking-wider bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
            >
              {editing ? <Loader2 className="size-3 animate-spin" /> : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {confirmDelete !== null && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <div className="h-[3px] bg-destructive" />
          <div className="px-5 py-4">
            <h3 className="font-bold text-sm tracking-tight-2 text-destructive">Dersi Sil</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Bu islem geri alinamaz</p>
          </div>
          <div className="px-5 pb-4">
            <p className="text-sm">
              <span className="font-bold">
                {courses.find((c) => c.id === confirmDelete)?.name}
              </span>{' '}
              dersini silmek istediginize emin misiniz? Tum videolar ve ilerleme kaybolacak.
            </p>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <button
              onClick={() => setConfirmDelete(null)}
              className="h-9 px-4 font-mono text-xs font-bold uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            >
              Iptal
            </button>
            <button
              onClick={() => handleDelete(confirmDelete)}
              className="h-9 px-5 font-mono text-xs font-bold uppercase tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-200"
            >
              Sil
            </button>
          </div>
        </Modal>
      )}

      {/* Course Grid */}
      <div className="flex-1 overflow-auto p-4">
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 animate-fade-in">
            <div className="size-24 border border-dashed border-border flex items-center justify-center">
              <BookOpen className="size-8 text-muted-foreground/25" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">
                Henuz ders eklenmemis
              </p>
              <p className="text-xs text-muted-foreground/60">
                YouTube oynatma listesi ekleyerek baslayin
              </p>
            </div>
            <button
              onClick={() => setShowAddDialog(true)}
              className="h-9 px-5 font-mono text-xs font-bold uppercase tracking-wider bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-200"
            >
              Ilk Dersi Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {courses.map((course, i) => {
              const pct =
                course.video_count > 0
                  ? Math.round((course.watched_count / course.video_count) * 100)
                  : 0
              const ringOffset = RING_C * (1 - pct / 100)
              return (
                <div
                  key={course.id}
                  onClick={() => handleSelectCourse(course)}
                  className="course-card group border border-border overflow-hidden cursor-pointer bg-card animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="size-8 text-muted-foreground/20" />
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

                    {/* Radial progress ring */}
                    {pct > 0 && (
                      <div className="absolute top-2.5 right-2.5 size-11 drop-shadow-lg">
                        <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18" cy="18" r={RING_R}
                            fill="rgba(0,0,0,0.55)"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="2.5"
                          />
                          <circle
                            cx="18" cy="18" r={RING_R}
                            fill="none"
                            stroke={pct === 100 ? 'var(--success)' : 'var(--accent)'}
                            strokeWidth="2.5"
                            strokeDasharray={String(RING_C)}
                            strokeDashoffset={String(ringOffset)}
                            className="transition-[stroke-dashoffset] duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {pct === 100 ? (
                            <Check className="size-3.5 text-white drop-shadow" strokeWidth={3} />
                          ) : (
                            <span className="font-mono text-[10px] font-bold text-white drop-shadow">
                              {pct}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Course name on overlay */}
                    <div className="absolute bottom-0 inset-x-0 px-3 pb-2.5">
                      <h3 className="text-[13px] font-bold text-white leading-snug truncate tracking-tight-2 drop-shadow-lg">
                        {course.name}
                      </h3>
                    </div>

                    {/* Hover actions */}
                    <div className="absolute top-2.5 left-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(course)
                        }}
                        className="size-7 flex items-center justify-center bg-black/60 backdrop-blur-sm text-white/80 hover:bg-white hover:text-black transition-all duration-200"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDelete(course.id)
                        }}
                        className="size-7 flex items-center justify-center bg-black/60 backdrop-blur-sm text-white/80 hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-[3px] bg-muted">
                    <div
                      className={cn(
                        'h-full bg-accent transition-all duration-700',
                        pct > 0 && 'progress-glow'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Info row */}
                  <div className="flex items-center px-3 py-2.5">
                    <span className="label-caps">
                      {course.watched_count}/{course.video_count}
                    </span>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-2.5" />
                      <span className="font-mono text-[10px] font-medium">
                        {formatHM(course.total_duration_seconds)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
