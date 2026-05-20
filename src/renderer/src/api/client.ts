import type { ApiChannel, ApiRequest, ApiResponse, ApiError } from '@shared/types'

/**
 * Typed IPC çağrısı. Hata durumunda ApiError fırlatır.
 */
export async function apiCall<C extends ApiChannel>(
  channel: C,
  ...[data]: ApiRequest<C> extends void ? [] : [ApiRequest<C>]
): Promise<ApiResponse<C>> {
  try {
    return await window.api.invoke(channel, data as ApiRequest<C>)
  } catch (err) {
    const apiError: ApiError = {
      code: 'IPC_ERROR',
      message: err instanceof Error ? err.message : String(err)
    }
    throw apiError
  }
}
