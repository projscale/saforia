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

// Safe wrapper around Tauri event listen that no-ops in web/mock mode.
export async function listen<T = any>(event: string, handler: (e: { payload: T }) => void): Promise<() => void> {
  const anyWin = globalThis as any
  const hasTauri = !!anyWin?.__TAURI_INTERNALS__?.invoke
  if (!hasTauri || anyWin?.SAFORIA_MOCK) {
    return Promise.resolve(() => {})
  }
  // Dynamic import only when available to avoid bundling errors in web
  const mod = await import('@tauri-apps/api/event')
  const unlisten = await mod.listen<T>(event as any, handler as any)
  return () => { try { unlisten() } catch {} }
}
