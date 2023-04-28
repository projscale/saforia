import React from 'react'
import { invoke } from '../../bridge'

export function Backup({ onToast, onImported }: { onToast: (t: string, k?: 'info'|'success'|'error') => void, onImported: () => void }) {
  const [busy, setBusy] = React.useState(false)
  const [exportPath, setExportPath] = React.useState('')
  const [exportPass, setExportPass] = React.useState('')
  const [importPath, setImportPath] = React.useState('')
  const [importPass, setImportPass] = React.useState('')
  const [importOverwrite, setImportOverwrite] = React.useState(false)
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Backup</h3>
      <div className="row" style={{ alignItems: 'end', marginBottom: 8 }}>
        <div className="col" style={{ flex: 1 }}>
          <label>Export to path</label>
          <input placeholder="/path/to/backup.safe" value={exportPath} onChange={e => setExportPath(e.target.value)} />
        </div>
        <div className="col">
          <label>Passphrase (optional)</label>
          <input type="password" value={exportPass} onChange={e => setExportPass(e.target.value)} />
        </div>
        <button className="btn" disabled={!exportPath || busy} onClick={async () => {
          setBusy(true)
          try { await invoke('export_entries', { path: exportPath, passphrase: exportPass || null }); onToast('Exported successfully', 'success'); setExportPass('') }
          catch (err: any) { onToast('Export failed: ' + String(err), 'error') }
          finally { setBusy(false) }
        }}>Export</button>
      </div>

      <div className="row" style={{ alignItems: 'end' }}>
        <div className="col" style={{ flex: 1 }}>
          <label>Import from path</label>
          <input placeholder="/path/to/backup.safe" value={importPath} onChange={e => setImportPath(e.target.value)} />
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
        <button className="btn" disabled={!importPath || busy} onClick={async () => {
          setBusy(true)
          try { const count = await invoke<number>('import_entries', { path: importPath, passphrase: importPass || null, overwrite: importOverwrite }); onImported(); onToast(`Imported ${count} entries`, 'success'); setImportPass('') }
          catch (err: any) { onToast('Import failed: ' + String(err), 'error') }
          finally { setBusy(false) }
        }}>Import</button>
      </div>
      <p className="muted">Export can be plain JSON or encrypted with a passphrase (Argon2id + ChaCha20-Poly1305).</p>
    </div>
  )
}

