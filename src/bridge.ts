// Bridge to Tauri invoke with optional mock layer for UI smoke tests.
// If window.SAFORIA_MOCK is truthy, use the mock implementation.

import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { mockInvoke } from './mocks/mockInvoke'

export function invoke<T = any>(cmd: string, args?: Record<string, any>): Promise<T> {
  const anyWin = globalThis as any
  const hasTauri = !!anyWin?.__TAURI_INTERNALS__?.invoke
  if (anyWin?.SAFORIA_MOCK || !hasTauri) {
    return mockInvoke<T>(cmd, args)
  }
  return tauriInvoke<T>(cmd as any, args as any)
}
