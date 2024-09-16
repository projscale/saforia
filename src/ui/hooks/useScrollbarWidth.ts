import React from 'react'

// Measures native vertical scrollbar width and exposes it as CSS var --sbw
export function useScrollbarWidth() {
  React.useEffect(() => {
    try {
      const div = document.createElement('div')
      div.style.width = '100px'
      div.style.height = '100px'
      div.style.overflow = 'scroll'
      div.style.position = 'absolute'
      div.style.top = '-9999px'
      document.body.appendChild(div)
      const sbw = div.offsetWidth - div.clientWidth
      document.body.removeChild(div)
      const value = Math.max(0, sbw || 0)
      document.documentElement.style.setProperty('--sbw', `${value}px`)
    } catch {}
  }, [])
}

