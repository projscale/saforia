import React from 'react'
import { useFocusTrap } from '../a11y'

export function FocusModal({ children, labelledBy, onClick }: { children: React.ReactNode, labelledBy?: string, onClick?: (e: React.MouseEvent)=>void }) {
  const ref = React.useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true)
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={onClick} ref={ref}>
      {children}
    </div>
  )
}

