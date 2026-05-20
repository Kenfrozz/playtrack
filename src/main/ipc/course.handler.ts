import { handle } from './register'
import * as courseService from '../services/course.service'

export function registerCourseHandlers(): void {
  handle('course:list', () => courseService.list())
  handle('course:get', (data) => courseService.get(data.id))
  handle('course:create', (data) => courseService.create(data))
  handle('course:update', (data) => {
    const { id, ...fields } = data
    return courseService.update(id, fields)
  })
  handle('course:delete', (data) => courseService.remove(data.id))
  handle('course:videos', (data) => courseService.getVideos(data.id))
  handle('course:toggle-watched', (data) => courseService.toggleWatched(data.id))
  handle('course:refresh-videos', (data) => courseService.refreshVideos(data.id))
  handle('course:stats', () => courseService.getStats())
}
