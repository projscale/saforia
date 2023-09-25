import React from 'react'

export function useIsMobile(maxWidth = 600) {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return false
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches
  })
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`) as any
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile((e as MediaQueryList).matches ?? (e as MediaQueryListEvent).matches)
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler)
    else if (typeof mq.addListener === 'function') mq.addListener(handler)
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', handler as any)
      else if (typeof mq.removeListener === 'function') mq.removeListener(handler as any)
    }
  }, [maxWidth])
  return isMobile
}

