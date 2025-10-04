import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaperCreationState } from '@/types/prompt'

const STORAGE_KEY = 'paper-creation-state'

function readStateFromStorage(): PaperCreationState | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PaperCreationState
    return parsed
  } catch (error) {
    console.warn('读取PaperCreationState失败:', error)
    return null
  }
}

function writeStateToStorage(state: PaperCreationState | null) {
  if (typeof window === 'undefined') {
    return
  }
  if (!state || Object.keys(state).length === 0) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('保存PaperCreationState失败:', error)
  }
}

export function usePaperCreationState() {
  const [state, setState] = useState<PaperCreationState | null>(() => readStateFromStorage())
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const updateState = useCallback((next: Partial<PaperCreationState>) => {
    setState((prev) => {
      const updated: PaperCreationState = {
        ...(prev ?? {}),
        ...next,
        updatedAt: next.updatedAt || new Date().toISOString(),
      }
      writeStateToStorage(updated)
      return updated
    })
  }, [])

  const replaceState = useCallback((next: PaperCreationState | null) => {
    if (!isMountedRef.current) return
    setState(next)
    writeStateToStorage(next)
  }, [])

  const resetState = useCallback(() => {
    replaceState(null)
  }, [replaceState])

  return {
    state,
    updateState,
    replaceState,
    resetState,
  }
}
