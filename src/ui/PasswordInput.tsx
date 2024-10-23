import React from 'react'
import { useI18n } from './i18n'

type Props = {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  name?: string
  disabled?: boolean
  describedBy?: string
  autoFocus?: boolean
}

export function PasswordInput({ label, value, onChange, placeholder, autoComplete, name, disabled, describedBy, autoFocus }: Props) {
  const [revealed, setRevealed] = React.useState(false)
  const id = React.useId()
  const { t } = useI18n()
  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <div className="input-affix">
        <input
          id={id}
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete || 'off'}
          name={name}
          disabled={disabled}
          aria-describedby={describedBy}
          autoFocus={autoFocus}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="none"
        />
        <button
          type="button"
          className={`affix-btn ${revealed ? 'active' : ''}`}
          aria-hidden="true"
          tabIndex={-1}
          title={revealed ? (t('hide') || 'Hide') : (t('reveal') || 'Reveal')}
          onMouseDown={(e) => { e.preventDefault() }}
          onClick={() => setRevealed(r => !r)}
        >
          {revealed ? (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2.81 2.81L1.39 4.22l3.2 3.2C2.64 8.74 1 12 1 12s3.37 7 11 7c2.11 0 3.89-.48 5.36-1.18l3.04 3.04l1.41-1.41L2.81 2.81ZM12 17c-2.76 0-5-2.24-5-5c0-.62.13-1.21.34-1.76l1.54 1.54A2.996 2.996 0 0 0 12 15c.55 0 1.06-.15 1.5-.41l1.58 1.58c-.78.5-1.7.83-2.68.83Zm7.08-2.24l-1.52-1.52c.27-.69.44-1.42.44-2.24c0-3.31-2.69-6-6-6c-.82 0-1.55.17-2.24.44L7.24 2.92C8.71 2.22 10.49 1.74 12.6 1.74c7.63 0 11 7 11 7s-1.64 3.26-4.52 6.02Z"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7s11-7 11-7s-3.367-7-11-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 .002 6.002A3 3 0 0 0 12 9Z"/></svg>
          )}
        </button>
      </div>
    </div>
  )
}
