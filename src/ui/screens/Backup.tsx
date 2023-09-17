import React from 'react'
import { invoke } from '../../bridge'
import { useI18n } from '../i18n'

export function Backup({ onToast, onImported }: { onToast: (t: string, k?: 'info'|'success'|'error') => void, onImported: () => void }) {
  const { t } = useI18n()
  const [exportBusy, setExportBusy] = React.useState(false)
  const [importBusy, setImportBusy] = React.useState(false)
  const [exportPath, setExportPath] = React.useState('')
  const [exportPass, setExportPass] = React.useState('')
  const [importPath, setImportPath] = React.useState('')
  const [importPass, setImportPass] = React.useState('')
  const [importOverwrite, setImportOverwrite] = React.useState(false)
  // CSV
  const [csvExportPath, setCsvExportPath] = React.useState('')
  const [csvImportPath, setCsvImportPath] = React.useState('')
  const [csvPreview, setCsvPreview] = React.useState<{ fingerprints: [string, number][] } | null>(null)
  const [csvMap, setCsvMap] = React.useState<Record<string, string | 'ignore'>>({})
  const [csvModal, setCsvModal] = React.useState(false)
  const expHelpId = React.useId()
  const impHelpId = React.useId()
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>{t('tabBackup')}</h3>
      <div className="row" style={{ alignItems: 'end', marginBottom: 8 }}>
        <div className="col" style={{ flex: 1 }}>
          <label>{t('exportToPath')}</label>
          <input aria-describedby={expHelpId} placeholder="/path/to/backup.safe" value={exportPath} onChange={e => setExportPath(e.target.value)} />
        </div>
        <div className="col">
          <label>{t('passphraseOptional')}</label>
          <input type="password" value={exportPass} onChange={e => setExportPass(e.target.value)} autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="none" />
        </div>
        <button className="btn" title={t('exportToPath')} aria-label={t('exportToPath')} disabled={!exportPath || exportBusy} aria-busy={exportBusy ? 'true' : 'false'} onClick={async () => {
          setExportBusy(true)
          try { await invoke('export_entries', { path: exportPath, passphrase: exportPass || null }); onToast(t('exportedSuccessfully'), 'success'); setExportPass('') }
          catch (err: any) { onToast(t('exportFailedPrefix') + String(err), 'error') }
          finally { setExportBusy(false) }
        }}>{exportBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> {t('exporting')}</span>) : t('export')}</button>
      </div>
      <p className="muted" id={expHelpId}>{t('exportHelp')}</p>

      <div className="row" style={{ alignItems: 'end' }}>
        <div className="col" style={{ flex: 1 }}>
          <label>{t('importFromPath')}</label>
          <input aria-describedby={impHelpId} placeholder="/path/to/backup.safe" value={importPath} onChange={e => setImportPath(e.target.value)} />
        </div>
        <div className="col">
          <label>{t('passphraseIfUsed')}</label>
          <input type="password" value={importPass} onChange={e => setImportPass(e.target.value)} autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="none" />
        </div>
        <div className="col" style={{ minWidth: 120 }}>
          <label>{t('overwrite')}</label>
          <select value={importOverwrite ? 'yes' : 'no'} onChange={e => setImportOverwrite(e.target.value === 'yes') }>
            <option value='no'>{t('no')}</option>
            <option value='yes'>{t('yes')}</option>
          </select>
        </div>
        <button className="btn" title={t('importFromPath')} aria-label={t('importFromPath')} disabled={!importPath || importBusy} aria-busy={importBusy ? 'true' : 'false'} onClick={async () => {
          setImportBusy(true)
          try { const count = await invoke<number>('import_entries', { path: importPath, passphrase: importPass || null, overwrite: importOverwrite }); onImported(); onToast(`${t('importedCountPrefix')}${count}${t('importedCountSuffix')}`, 'success'); setImportPass('') }
          catch (err: any) { onToast(t('importFailedPrefix') + String(err), 'error') }
          finally { setImportBusy(false) }
        }}>{importBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> {t('importing')}</span>) : t('import')}</button>
      </div>
      <p className="muted" id={impHelpId}>{t('importHelp')}</p>

      <h3 style={{ marginTop: 16 }}>{t('csvBackupTitle')}</h3>
      <div className="row" style={{ alignItems: 'end', marginBottom: 8 }}>
        <div className="col" style={{ flex: 1 }}>
          <label>{t('exportCsvToPath')}</label>
          <input placeholder="/path/to/backup.csv" value={csvExportPath} onChange={e => setCsvExportPath(e.target.value)} />
        </div>
        <button className="btn" title={t('exportCsv')} aria-label={t('exportCsv')} disabled={!csvExportPath || exportBusy} aria-busy={exportBusy ? 'true' : 'false'} onClick={async () => {
          setExportBusy(true)
          try { await invoke('export_entries_csv', { path: csvExportPath }); onToast(t('exportedCsv'), 'success') } catch (err:any) { onToast(t('exportCsvFailedPrefix') + String(err), 'error') } finally { setExportBusy(false) }
        }}>{exportBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> {t('exporting')}</span>) : t('exportCsv')}</button>
      </div>

      <div className="row" style={{ alignItems: 'end' }}>
        <div className="col" style={{ flex: 1 }}>
          <label>{t('csvImportPath')}</label>
          <input placeholder="/path/to/backup.csv" value={csvImportPath} onChange={e => setCsvImportPath(e.target.value)} />
        </div>
        <div className="col" style={{ minWidth: 120 }}>
          <label>{t('overwrite')}</label>
          <select value={importOverwrite ? 'yes' : 'no'} onChange={e => setImportOverwrite(e.target.value === 'yes') }>
            <option value='no'>{t('no')}</option>
            <option value='yes'>{t('yes')}</option>
          </select>
        </div>
        <button className="btn" title={t('previewCsvImport')} aria-label={t('previewCsvImport')} disabled={!csvImportPath || importBusy} aria-busy={importBusy ? 'true' : 'false'} onClick={async () => {
          setImportBusy(true)
          try { const prev = await invoke<{ fingerprints: [string, number][] }>('import_entries_csv_preview', { path: csvImportPath }); setCsvPreview(prev); setCsvModal(true) }
          catch (err:any) { onToast(t('importFailedPrefix') + String(err), 'error') }
          finally { setImportBusy(false) }
        }}>{importBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> {t('loading')}</span>) : t('previewCsvImport')}</button>
      </div>

      {csvModal && csvPreview && (
        <div className="modal-backdrop" onClick={() => setCsvModal(false)}>
          <FocusTrapModal titleId="csv-map-title" onClose={() => setCsvModal(false)}>
            <h3 id="csv-map-title">{t('csvMapTitle')}</h3>
            <p className="muted"></p>
            <CsvMapper mapping={csvMap} setMapping={setCsvMap} imported={csvPreview.fingerprints} onToast={onToast} />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={async () => {
                const mapping = Object.entries(csvMap).map(([from,to]) => ({ from, to: to==='ignore'? null : to }))
                try { const count = await invoke<number>('import_entries_csv_apply', { path: csvImportPath, mapping, overwrite: importOverwrite }); onToast(`${t('importedCountPrefix')}${count}${t('importedCountSuffix')}`, 'success'); setCsvModal(false); onImported() } catch (err:any) { onToast(t('importFailedPrefix') + String(err), 'error') }
              }}>{t('applyMapping')}</button>
              <button className="btn" onClick={() => setCsvModal(false)}>{t('close')}</button>
            </div>
          </FocusTrapModal>
        </div>
      )}
    </div>
  )
}

function FocusTrapModal({ children, titleId, onClose }: { children: React.ReactNode, titleId: string, onClose: () => void }) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const node = ref.current
    if (!node) return
    const focusables = Array.from(node.querySelectorAll<HTMLElement>('a,button,select,input,textarea,[tabindex]:not([tabindex="-1"])'))
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (first) first.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && focusables.length > 0) {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); (last || first).focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); (first || last).focus() }
      }
    }
    node.addEventListener('keydown', onKey as any)
    return () => node.removeEventListener('keydown', onKey as any)
  }, [ref, onClose])
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={e => e.stopPropagation()} ref={ref}>
      {children}
    </div>
  )
}

function CsvMapper({ mapping, setMapping, imported, onToast }: { mapping: Record<string,string|'ignore'>, setMapping: (m:Record<string,string|'ignore'>)=>void, imported: [string, number][], onToast: (t:string,k?:any)=>void }) {
  const { t } = useI18n()
  const [locals, setLocals] = React.useState<string[]>([])
  React.useEffect(() => { (async () => { try { setLocals(await invoke<string[]>('list_masters')) } catch {} })() }, [])
  React.useEffect(() => {
    if (imported.length === 1 && locals.length === 1) { setMapping({ [imported[0][0]]: locals[0] }) }
  }, [imported, locals])
  const [hoverImp, setHoverImp] = React.useState<string | null>(null)
  const [hoverIgn, setHoverIgn] = React.useState<string | null>(null)
  function onDragStart(e: React.DragEvent, fp: string) { e.dataTransfer.setData('text/plain', fp); e.dataTransfer.effectAllowed = 'move' }
  function onDropAssign(targetImported: string, e: React.DragEvent) { e.preventDefault(); const local = e.dataTransfer.getData('text/plain'); if (local) setMapping({ ...mapping, [targetImported]: local }); setHoverImp(null) }
  function onDropIgnore(targetImported: string, e: React.DragEvent) { e.preventDefault(); setMapping({ ...mapping, [targetImported]: 'ignore' }); setHoverIgn(null) }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  function onDragEnterImp(fp: string) { return () => setHoverImp(fp) }
  function onDragLeaveImp(fp: string) { return () => { if (hoverImp === fp) setHoverImp(null) } }
  function onDragEnterIgn(fp: string) { return () => setHoverIgn(fp) }
  function onDragLeaveIgn(fp: string) { return () => { if (hoverIgn === fp) setHoverIgn(null) } }
  return (
    <div className="row" style={{ gap: 16 }}>
      <div className="col" style={{ flex: 1 }}>
        <label>{t('importedFingerprints')}</label>
        <div className="col" style={{ gap: 8 }}>
          {imported.map(([fp, count]) => (
            <div key={fp} className="row" style={{ alignItems: 'center', justifyContent: 'space-between', border: `2px dashed ${hoverImp===fp ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`, borderRadius: 8, padding: 8, transition: 'border-color .15s ease' }} onDragOver={onDragOver} onDrop={e => onDropAssign(fp, e)} onDragEnter={onDragEnterImp(fp)} onDragLeave={onDragLeaveImp(fp)}>
              <div className="password" title={fp}>{shortFp(fp)} <span className="muted">({count})</span></div>
              <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <span className="muted">→</span>
                <div className="badge" title={typeof mapping[fp] === 'string' ? (mapping[fp] as string) : ''}>{mapping[fp] && mapping[fp] !== 'ignore' ? shortFp(mapping[fp] as string) : t('dropLocalHere')}</div>
                <div className="badge" role="button" onDragOver={onDragOver} onDrop={e => onDropIgnore(fp, e)} onDragEnter={onDragEnterIgn(fp)} onDragLeave={onDragLeaveIgn(fp)} title={t('dropHereToIgnore')} style={{ borderColor: hoverIgn===fp ? 'var(--danger)' : undefined }}>{t('ignore') || 'Ignore'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="col" style={{ flex: 1 }}>
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

function shortFp(fp: string) { return fp.length <= 12 ? fp : fp.slice(0,6) + '…' + fp.slice(-4) }
