import { useState, useCallback } from 'react'

/**
 * IPC 호출을 감싸는 유틸리티 훅
 * 로딩 상태와 에러 처리를 자동으로 관리한다.
 */
export function useIpc<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>
): {
  execute: (...args: A) => Promise<T | null>
  loading: boolean
  error: string | null
} {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async (...args: A): Promise<T | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await fn(...args)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [fn]
  )

  return { execute, loading, error }
}
