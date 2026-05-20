import { contextBridge, ipcRenderer } from 'electron'
import type { ApiChannel, ApiRequest, ApiResponse } from '../shared/types'

const api = {
  /** Typed IPC invoke — ApiMap'ten tip güvenliği sağlar */
  invoke<C extends ApiChannel>(channel: C, data?: ApiRequest<C>): Promise<ApiResponse<C>> {
    return ipcRenderer.invoke(channel as string, data)
  }
}

export type ElectronApi = typeof api

contextBridge.exposeInMainWorld('api', api)
