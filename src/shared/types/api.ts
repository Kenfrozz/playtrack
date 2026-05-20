/**
 * Typed IPC API contract.
 *
 * Backend, preload ve frontend bu tek kaynaktan tip alır.
 */

import type {
  Course,
  CourseInput,
  CourseVideo,
  CourseWithProgress,
  CourseStats
} from './models'

export interface ApiMap {
  'course:list': { request: void; response: CourseWithProgress[] }
  'course:get': { request: { id: number }; response: Course }
  'course:create': { request: CourseInput; response: Course }
  'course:update': { request: { id: number } & Partial<CourseInput>; response: Course }
  'course:delete': { request: { id: number }; response: void }
  'course:videos': { request: { id: number }; response: CourseVideo[] }
  'course:toggle-watched': { request: { id: number }; response: CourseVideo }
  'course:refresh-videos': { request: { id: number }; response: CourseVideo[] }
  'course:stats': { request: void; response: CourseStats }
}

/** Geçerli IPC kanal isimleri */
export type ApiChannel = keyof ApiMap

/** Bir kanal için request tipi */
export type ApiRequest<C extends ApiChannel> = ApiMap[C]['request']

/** Bir kanal için response tipi */
export type ApiResponse<C extends ApiChannel> = ApiMap[C]['response']

/** IPC hata yapısı */
export interface ApiError {
  code: string
  message: string
}
