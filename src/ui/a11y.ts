import React from 'react'

const FOCUSABLE = 'a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])'

export function useFocusTrap(ref: React.RefObject<HTMLElement>, active: boolean) {
  React.useEffect(() => {
    if (!active) return
    const root = ref.current
    if (!root) return
    const rootEl = root
    const focusables = Array.from(rootEl.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (document.activeElement && !rootEl.contains(document.activeElement)) {
      first.focus()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const el = document.activeElement as HTMLElement | null
      if (!el || !rootEl.contains(el)) return
      if (e.shiftKey) {
        if (el === first) { e.preventDefault(); last.focus() }
      } else {
        if (el === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ref, active])
}
