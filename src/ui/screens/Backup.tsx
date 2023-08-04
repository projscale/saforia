import React from 'react'
import { invoke } from '../../bridge'

export function Backup({ onToast, onImported }: { onToast: (t: string, k?: 'info'|'success'|'error') => void, onImported: () => void }) {
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
      <h3>Backup</h3>
      <div className="row" style={{ alignItems: 'end', marginBottom: 8 }}>
        <div className="col" style={{ flex: 1 }}>
          <label>Export to path</label>
          <input aria-describedby={expHelpId} placeholder="/path/to/backup.safe" value={exportPath} onChange={e => setExportPath(e.target.value)} />
        </div>
        <div className="col">
          <label>Passphrase (optional)</label>
          <input type="password" value={exportPass} onChange={e => setExportPass(e.target.value)} />
        </div>
        <button className="btn" title="Export saved postfixes" aria-label="Export saved postfixes" disabled={!exportPath || exportBusy} aria-busy={exportBusy ? 'true' : 'false'} onClick={async () => {
          setExportBusy(true)
          try { await invoke('export_entries', { path: exportPath, passphrase: exportPass || null }); onToast('Exported successfully', 'success'); setExportPass('') }
          catch (err: any) { onToast('Export failed: ' + String(err), 'error') }
          finally { setExportBusy(false) }
        }}>{exportBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> Exporting…</span>) : 'Export'}</button>
      </div>

      <p className="muted" id={expHelpId}>Exports saved postfixes as JSON or an encrypted archive if passphrase is provided. Keep passphrases safe.</p>

      <div className="row" style={{ alignItems: 'end' }}>
        <div className="col" style={{ flex: 1 }}>
          <label>Import from path</label>
          <input aria-describedby={impHelpId} placeholder="/path/to/backup.safe" value={importPath} onChange={e => setImportPath(e.target.value)} />
        </div>
        <div className="col">
          <label>Passphrase (if used)</label>
          <input type="password" value={importPass} onChange={e => setImportPass(e.target.value)} />
        </div>
        <div className="col" style={{ minWidth: 120 }}>
          <label>Overwrite</label>
          <select value={importOverwrite ? 'yes' : 'no'} onChange={e => setImportOverwrite(e.target.value === 'yes') }>
            <option value='no'>No</option>
            <option value='yes'>Yes</option>
          </select>
        </div>
        <button className="btn" title="Import saved postfixes" aria-label="Import saved postfixes" disabled={!importPath || importBusy} aria-busy={importBusy ? 'true' : 'false'} onClick={async () => {
          setImportBusy(true)
          try { const count = await invoke<number>('import_entries', { path: importPath, passphrase: importPass || null, overwrite: importOverwrite }); onImported(); onToast(`Imported ${count} entries`, 'success'); setImportPass('') }
          catch (err: any) { onToast('Import failed: ' + String(err), 'error') }
          finally { setImportBusy(false) }
        }}>{importBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> Importing…</span>) : 'Import'}</button>
      </div>
      <p className="muted" id={impHelpId}>Import merges with existing entries by default; choose Overwrite to replace all.</p>

      <h3 style={{ marginTop: 16 }}>CSV Backup</h3>
      <div className="row" style={{ alignItems: 'end', marginBottom: 8 }}>
        <div className="col" style={{ flex: 1 }}>
          <label>Export CSV to path</label>
          <input placeholder="/path/to/backup.csv" value={csvExportPath} onChange={e => setCsvExportPath(e.target.value)} />
        </div>
        <button className="btn" title="Export CSV" aria-label="Export CSV" disabled={!csvExportPath || exportBusy} aria-busy={exportBusy ? 'true' : 'false'} onClick={async () => {
          setExportBusy(true)
          try { await invoke('export_entries_csv', { path: csvExportPath }); onToast('Exported CSV', 'success') } catch (err:any) { onToast('Export CSV failed: ' + String(err), 'error') } finally { setExportBusy(false) }
        }}>{exportBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> Exporting…</span>) : 'Export CSV'}</button>
      </div>

      <div className="row" style={{ alignItems: 'end' }}>
        <div className="col" style={{ flex: 1 }}>
          <label>Import CSV from path</label>
          <input placeholder="/path/to/backup.csv" value={csvImportPath} onChange={e => setCsvImportPath(e.target.value)} />
        </div>
        <div className="col" style={{ minWidth: 120 }}>
          <label>Overwrite</label>
          <select value={importOverwrite ? 'yes' : 'no'} onChange={e => setImportOverwrite(e.target.value === 'yes') }>
            <option value='no'>No</option>
            <option value='yes'>Yes</option>
          </select>
        </div>
        <button className="btn" title="Preview CSV import" aria-label="Preview CSV import" disabled={!csvImportPath || importBusy} aria-busy={importBusy ? 'true' : 'false'} onClick={async () => {
          setImportBusy(true)
          try { const prev = await invoke<{ fingerprints: [string, number][] }>('import_entries_csv_preview', { path: csvImportPath }); setCsvPreview(prev); setCsvModal(true) }
          catch (err:any) { onToast('Preview CSV failed: ' + String(err), 'error') }
          finally { setImportBusy(false) }
        }}>{importBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> Loading…</span>) : 'Preview CSV'}</button>
      </div>

      {csvModal && csvPreview && (
        <div className="modal-backdrop" onClick={() => setCsvModal(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="csv-map-title" onClick={e => e.stopPropagation()}>
            <h3 id="csv-map-title">Map imported fingerprints</h3>
            <p className="muted">Choose a target local master for each imported fingerprint, or select Ignore to skip. If there is only one local and one imported, a default mapping is pre-selected.</p>
            <CsvMapper mapping={csvMap} setMapping={setCsvMap} imported={csvPreview.fingerprints} onToast={onToast} />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={async () => {
                const mapping = Object.entries(csvMap).map(([from,to]) => ({ from, to: to==='ignore'? null : to }))
                try { const count = await invoke<number>('import_entries_csv_apply', { path: csvImportPath, mapping, overwrite: importOverwrite }); onToast(`Imported ${count} entries`, 'success'); setCsvModal(false); onImported() } catch (err:any) { onToast('Import CSV failed: ' + String(err), 'error') }
              }}>Apply</button>
              <button className="btn" onClick={() => setCsvModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CsvMapper({ mapping, setMapping, imported, onToast }: { mapping: Record<string,string|'ignore'>, setMapping: (m:Record<string,string|'ignore'>)=>void, imported: [string, number][], onToast: (t:string,k?:any)=>void }) {
  const [locals, setLocals] = React.useState<string[]>([])
  React.useEffect(() => { (async () => { try { setLocals(await invoke<string[]>('list_masters')) } catch {} })() }, [])
  React.useEffect(() => {
    if (imported.length === 1 && locals.length === 1) { setMapping({ [imported[0][0]]: locals[0] }) }
  }, [imported, locals])
  return (
    <div className="col" style={{ gap: 8 }}>
      {imported.map(([fp, count]) => (
        <div key={fp} className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="password">{shortFp(fp)} <span className="muted">({count})</span></div>
          <select value={mapping[fp] || ''} onChange={e => setMapping({ ...mapping, [fp]: e.target.value || 'ignore' })}>
            <option value=''>Ignore</option>
            {locals.map(l => <option key={l} value={l}>{shortFp(l)}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

function shortFp(fp: string) { return fp.length <= 12 ? fp : fp.slice(0,6) + '…' + fp.slice(-4) }
