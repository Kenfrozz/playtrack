import { ipcMain } from 'electron'
import type { ApiChannel, ApiRequest, ApiResponse } from '../../shared/types'
import { registerCourseHandlers } from './course.handler'

/**
 * Typed IPC handle — ApiMap'ten tip güvenliği sağlar.
 */
export function handle<C extends ApiChannel>(
  channel: C,
  handler: (data: ApiRequest<C>) => ApiResponse<C> | Promise<ApiResponse<C>>
): void {
  ipcMain.handle(channel as string, (_event, data) => handler(data))
}

/**
 * Tüm IPC handler'ları kaydet.
 */
export function registerAllHandlers(): void {
  registerCourseHandlers()
}
