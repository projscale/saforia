import React from 'react'
import { useI18n } from '../i18n'

export type Mapping = Record<string, string | 'ignore'>
export type ImportedFingerprint = { fingerprint: string, count: number }

function shortFp(fp: string) { return fp.length <= 12 ? fp : fp.slice(0,6) + '…' + fp.slice(-4) }
function labelFor(fp: string, t: (k: string)=>string) { return fp ? shortFp(fp) : t('unbound') || '(unbound)' }

export function FingerprintMapper({ mapping, setMapping, imported, locals, askDropLabel }: {
  mapping: Mapping
  setMapping: (m: Mapping) => void
  imported: ImportedFingerprint[]
  locals: string[]
  askDropLabel?: string
}) {
  const { t } = useI18n()
  const [hoverImp, setHoverImp] = React.useState<string | null>(null)
  const [hoverIgn, setHoverIgn] = React.useState<string | null>(null)

  React.useEffect(() => {
    setMapping(prev => {
      const next = { ...prev }
      imported.forEach(i => {
        if (locals.includes(i.fingerprint) && !next[i.fingerprint]) next[i.fingerprint] = i.fingerprint
      })
      if (imported.length === 1 && locals.length === 1) next[imported[0].fingerprint] = locals[0]
      return next
    })
  }, [imported.map(i => i.fingerprint).join(','), locals.join(',')])

  function onDragStart(e: React.DragEvent, fp: string) { e.dataTransfer.setData('text/plain', fp); e.dataTransfer.effectAllowed = 'move' }
  function onDropAssign(targetImported: string, e: React.DragEvent) { e.preventDefault(); const local = e.dataTransfer.getData('text/plain'); if (local) setMapping({ ...mapping, [targetImported]: local }); setHoverImp(null) }
  function onDropIgnore(targetImported: string, e: React.DragEvent) { e.preventDefault(); setMapping({ ...mapping, [targetImported]: 'ignore' }); setHoverIgn(null) }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  function onDragEnterImp(fp: string) { return () => setHoverImp(fp) }
  function onDragLeaveImp(fp: string) { return () => { if (hoverImp === fp) setHoverImp(null) } }
  function onDragEnterIgn(fp: string) { return () => setHoverIgn(fp) }
  function onDragLeaveIgn(fp: string) { return () => { if (hoverIgn === fp) setHoverIgn(null) } }

  return (
    <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
      <div className="col" style={{ flex: 1, minWidth: 280, gap: 8 }}>
        <label>{t('importedFingerprints')}</label>
        <div className="col" style={{ gap: 8 }}>
          {imported.map(({ fingerprint, count }) => (
            <div key={fingerprint || '(none)'} className="row" style={{ alignItems: 'center', justifyContent: 'space-between', border: `2px dashed ${hoverImp===fingerprint ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`, borderRadius: 4, padding: 8, transition: 'border-color .15s ease' }} onDragOver={onDragOver} onDrop={e => onDropAssign(fingerprint, e)} onDragEnter={onDragEnterImp(fingerprint)} onDragLeave={onDragLeaveImp(fingerprint)}>
              <div className="password" title={fingerprint || t('unbound')}>{labelFor(fingerprint, t)} <span className="muted">({count})</span></div>
              <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <span className="muted">→</span>
                <div className="badge" title={typeof mapping[fingerprint] === 'string' ? (mapping[fingerprint] as string) : ''}>{mapping[fingerprint] && mapping[fingerprint] !== 'ignore' ? shortFp(mapping[fingerprint] as string) : (askDropLabel || t('dropLocalHere'))}</div>
                <div className="badge" role="button" onDragOver={onDragOver} onDrop={e => onDropIgnore(fingerprint, e)} onDragEnter={onDragEnterIgn(fingerprint)} onDragLeave={onDragLeaveIgn(fingerprint)} title={t('dropHereToIgnore')} style={{ borderColor: hoverIgn===fingerprint ? 'var(--danger)' : undefined }}>{t('ignore') || 'Ignore'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="col" style={{ flex: 1, minWidth: 240 }}>
        <label>{t('localMastersDrag')}</label>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {locals.map(l => (
            <div key={l} className="badge" draggable onDragStart={e => onDragStart(e, l)} title={l}>{shortFp(l)}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
