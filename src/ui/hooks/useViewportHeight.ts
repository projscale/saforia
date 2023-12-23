import React from 'react'

// Updates CSS var --vh to real viewport height units to avoid iOS browser UI shrinking content.
export function useViewportHeight() {
  React.useEffect(() => {
    function setVH() {
      const vh = typeof window !== 'undefined' ? window.innerHeight * 0.01 : 1
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    setVH()
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', setVH)
    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
    }
  }, [])
}

