import { useCallback, useEffect, useState } from 'react'
import type { ApiChannel, ApiRequest, ApiResponse, ApiError } from '@shared/types'
import { apiCall } from '@/api/client'

interface UseApiState<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
}

interface UseApiReturn<C extends ApiChannel> extends UseApiState<ApiResponse<C>> {
  refetch: () => void
}

/**
 * Generic hook — bir IPC kanalını çağırır, loading/error/data yönetir.
 *
 * Kullanım:
 *   const { data, loading, error, refetch } = useApi('course:list')
 */
export function useApi<C extends ApiChannel>(
  channel: C,
  ...[data]: ApiRequest<C> extends void ? [] : [ApiRequest<C>]
): UseApiReturn<C> {
  const [state, setState] = useState<UseApiState<ApiResponse<C>>>({
    data: null,
    error: null,
    loading: true
  })

  const fetch = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    apiCall(channel, ...(data !== undefined ? [data] : []) as never)
      .then((result) => setState({ data: result, error: null, loading: false }))
      .catch((err: ApiError) => setState({ data: null, error: err, loading: false }))
  }, [channel, data])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { ...state, refetch: fetch }
}
