import React from 'react'

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
  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <div className="input-with-btns">
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
        <button type="button" className="btn small" aria-label={revealed ? 'Hide password' : 'Show password'} title={revealed ? 'Hide password' : 'Show password'} onClick={() => setRevealed(r => !r)}>
          {revealed ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  )
}
