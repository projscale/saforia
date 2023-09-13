import React from 'react'
import { invoke } from '../bridge'
import { Preferences } from './screens/Preferences'
import { Backup } from './screens/Backup'

function shortFp(fp: string) {
  if (fp.length <= 12) return fp
  return fp.slice(0,6) + '…' + fp.slice(-4)
}

export function ProfileSwitcher({ onToast, methods, defaultMethod, autoClearSeconds, maskSensitive, autosaveQuick, setDefaultMethod, setAutoClearSeconds, setMaskSensitive, setAutosaveQuick, onImported }: {
  onToast: (t: string, k?: 'info'|'success'|'error') => void,
  methods: { id: string; name: string }[],
  defaultMethod: string,
  autoClearSeconds: number,
  maskSensitive: boolean,
  autosaveQuick: boolean,
  setDefaultMethod: (v: string) => void,
  setAutoClearSeconds: (v: number) => void,
  setMaskSensitive: (v: boolean) => void,
  setAutosaveQuick: (v: boolean) => void,
  onImported: () => void,
}) {
  const [active, setActive] = React.useState<string | null>(null)
  const [list, setList] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [m1, setM1] = React.useState('')
  const [m2, setM2] = React.useState('')
  const [v1, setV1] = React.useState('')
  const [v2, setV2] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function refresh() {
    try {
      const [a, l] = await Promise.all([
        invoke<string | null>('get_active_fingerprint'),
        invoke<string[]>('list_masters'),
      ])
      setActive(a || null)
      setList(l)
    } catch {}
  }
  React.useEffect(() => { refresh() }, [])

  const rootRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return; if (!rootRef.current.contains(e.target as any)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div ref={rootRef} style={{ position: 'relative', marginLeft: 'auto' }}>
      <button className="btn" onClick={() => setOpen(o => !o)} title="Switch master profile">
        {active ? shortFp(active) : 'No master'}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, marginTop: 4, background: '#111318', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, minWidth: 220, zIndex: 10 }}>
          <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'var(--muted)' }}>Masters</div>
          {list.length === 0 && (<div style={{ padding: 10 }} className="muted">None saved</div>)}
          {list.map(fp => (
            <div key={fp} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', padding: 8, background: active===fp ? 'rgba(59,130,246,0.1)' : undefined }}>
              <div className="password" title={fp}>{shortFp(fp)} {active===fp && <span className="badge" title="Active master">Active</span>}</div>
              <button className="btn small" disabled={active === fp} title="Use this master" onClick={async () => { try { await invoke('set_active_fingerprint', { fp }); setActive(fp); onToast('Active master changed', 'success'); setOpen(false) } catch (e: any) { onToast(String(e), 'error') } }}>Use</button>
              <button className="btn small danger" title="Delete this master" onClick={async () => { if (!confirm('Delete this master?')) return; try { const ok = await invoke<boolean>('delete_master', { fp }); if (ok) { onToast('Master deleted', 'success'); refresh() } else { onToast('Delete failed', 'error') } } catch (e:any) { onToast(String(e), 'error') } }}>Del</button>
            </div>
          ))}
          <div style={{ display: 'grid', gap: 6, padding: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button className="btn" onClick={() => setAddOpen(true)}>Add Master…</button>
            <button className="btn" title="Bind entries without fingerprint to active master" onClick={async () => {
              try { const n = await invoke<number>('bind_unbound_entries'); onToast(`Bound ${n} entries`, 'success'); setOpen(false) } catch (e:any) { onToast(String(e), 'error') }
            }}>Bind legacy entries to active</button>
            <button className="btn" onClick={() => { setSettingsOpen(true); setOpen(false) }}>Settings…</button>
          </div>
        </div>
      )}
      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-master-title" onClick={e => e.stopPropagation()}>
            <h3 id="add-master-title">Add Master</h3>
            <div className="col">
              <label>Master password</label>
              <input type="password" value={m1} onChange={e => setM1(e.target.value)} />
              <label>Confirm master password</label>
              <input type="password" value={m2} onChange={e => setM2(e.target.value)} />
              <label>Viewer password</label>
              <input type="password" value={v1} onChange={e => setV1(e.target.value)} />
              <label>Confirm viewer password</label>
              <input type="password" value={v2} onChange={e => setV2(e.target.value)} />
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn primary" disabled={busy || !m1 || m1!==m2 || !v1 || v1!==v2} onClick={async () => {
                setBusy(true)
                try {
                  const fp = await invoke<string>('setup_set_master', { viewerPassword: v1, masterPassword: m1 })
                  onToast('Master added', 'success'); setAddOpen(false); setM1(''); setM2(''); setV1(''); setV2(''); setActive(fp); refresh()
                } catch (e:any) { onToast('Failed: ' + String(e), 'error') }
                finally { setBusy(false) }
              }}>{busy ? 'Saving…' : 'Save'}</button>
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={e => e.stopPropagation()}>
            <h3 id="settings-title">Settings</h3>
            <SettingsTabs
              methods={methods}
              defaultMethod={defaultMethod}
              autoClearSeconds={autoClearSeconds}
              maskSensitive={maskSensitive}
              autosaveQuick={autosaveQuick}
              setDefaultMethod={setDefaultMethod}
              setAutoClearSeconds={setAutoClearSeconds}
              setMaskSensitive={setMaskSensitive}
              setAutosaveQuick={setAutosaveQuick}
              onToast={onToast}
              onImported={onImported}
              onClose={() => setSettingsOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsTabs({ methods, defaultMethod, autoClearSeconds, maskSensitive, autosaveQuick, setDefaultMethod, setAutoClearSeconds, setMaskSensitive, setAutosaveQuick, onToast, onImported, onClose }:{
  methods: { id: string; name: string }[],
  defaultMethod: string, autoClearSeconds: number, maskSensitive: boolean, autosaveQuick: boolean,
  setDefaultMethod: (v:string)=>void, setAutoClearSeconds:(v:number)=>void, setMaskSensitive:(v:boolean)=>void, setAutosaveQuick:(v:boolean)=>void,
  onToast: (t:string,k?:'info'|'success'|'error')=>void, onImported: ()=>void, onClose: ()=>void,
}) {
  const [tab, setTab] = React.useState<'prefs'|'backup'|'about'>('prefs')
  return (
    <div className="col">
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" onClick={() => setTab('prefs')} aria-pressed={tab==='prefs'}>Preferences</button>
        <button className="btn" onClick={() => setTab('backup')} aria-pressed={tab==='backup'}>Backup</button>
        <button className="btn" onClick={() => setTab('about')} aria-pressed={tab==='about'}>About</button>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
      {tab==='prefs' && (
        <Preferences
          methods={methods}
          defaultMethod={defaultMethod}
          autoClearSeconds={autoClearSeconds}
          maskSensitive={maskSensitive}
          autosaveQuick={autosaveQuick}
          setDefaultMethod={setDefaultMethod}
          setAutoClearSeconds={setAutoClearSeconds}
          setMaskSensitive={setMaskSensitive}
          setAutosaveQuick={setAutosaveQuick}
          onToast={onToast}
        />
      )}
      {tab==='backup' && (
        <Backup onToast={onToast} onImported={onImported} />
      )}
      {tab==='about' && (
        <AboutDoc />
      )}
    </div>
  )
}

function AboutDoc() {
  const nav = (typeof navigator !== 'undefined' && navigator.language || 'en').toLowerCase()
  const isRU = nav.startsWith('ru')
  const isZH = nav.startsWith('zh')
  if (isRU) return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>О Saforia</h3>
      <p className="muted">Saforia — детерминированный генератор паролей. Он соединяет мастер‑пароль (на диске хранится только в зашифрованном виде под viewer‑паролем) и постфикс сервиса, а затем по хэш‑алгоритму получает конечный пароль.</p>
      <h4>Безопасность</h4>
      <ul>
        <li>Мастер хранится только зашифрованно (Argon2id + ChaCha20‑Poly1305 на десктопе; AES‑GCM в web/mock на защищённом origin).</li>
        <li>Viewer не сохраняется; его вводят каждый раз для расшифровки мастера.</li>
        <li>Копирование в буфер обмена — только по действию пользователя, с авто‑очисткой по таймеру (если включено).</li>
      </ul>
      <h4>Настройки</h4>
      <ul>
        <li><b>Default method</b> — метод генерации по умолчанию для консоли и новых записей.</li>
        <li><b>Mask sensitive content</b> — на Wayland/нестабильных платформах скрывает контент.</li>
        <li><b>Autosave in Quick generate</b> — включает “Сохранить этот постфикс” по умолчанию.</li>
        <li><b>Auto‑clear clipboard</b> — задержка авто‑очистки буфера (0 — выкл.).</li>
      </ul>
      <h4>Алгоритмы</h4>
      <ul>
        <li><b>legacy_v1</b>: Base64(MD5(master||postfix)) без “=” в конце.</li>
        <li><b>legacy_v2</b>: Base64(SHA‑256(master||postfix)) с заменой “=”→“.”, “+”→“-”, “/”→“_”.</li>
        <li><b>lenXX_alnum/strong</b>: Итеративный SHA‑256 по “master::postfix::method_id”, маппинг через rejection sampling (алфавит: буквы+цифры или с символами). Длины 10/20/36.</li>
      </ul>
      <p className="muted">Используйте профили для разделения наборов записей по мастерам (переключатель вверху справа). CSV‑импорт позволяет сопоставлять отпечатки drag‑and‑drop.</p>
    </div>
  )
  if (isZH) return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>关于 Saforia</h3>
      <p className="muted">Saforia 是确定性密码生成器：将主密码（磁盘仅加密保存，viewer 密码用于解密）与站点后缀组合，并通过哈希算法生成站点密码。</p>
      <h4>安全模型</h4>
      <ul>
        <li>主密码仅以加密形式保存（桌面 Argon2id + ChaCha20‑Poly1305；在安全上下文的 web/mock 使用 AES‑GCM）。</li>
        <li>viewer 不持久化；每次生成前输入以解密主密码。</li>
        <li>复制操作需用户显式触发；支持延时自动清除剪贴板。</li>
      </ul>
      <h4>偏好设置</h4>
      <ul>
        <li><b>Default method</b>：控制台与新条目的默认方法。</li>
        <li><b>Mask sensitive content</b>：在 Wayland 等平台隐藏敏感内容。</li>
        <li><b>Autosave in Quick generate</b>：默认勾选“保存该后缀”。</li>
        <li><b>Auto‑clear clipboard</b>：剪贴板自动清除延迟（0 关闭）。</li>
      </ul>
      <h4>算法</h4>
      <ul>
        <li><b>legacy_v1</b>：Base64(MD5(master||postfix)) 去除 “=”。</li>
        <li><b>legacy_v2</b>：Base64(SHA‑256(master||postfix))，替换 “=”→“.”，“+”→“-”，“/”→“_”。</li>
        <li><b>lenXX_alnum/strong</b>：对 “master::postfix::method_id” 进行迭代 SHA‑256，并用拒绝采样映射到目标字符集（数字字母或包含符号），长度 10/20/36。</li>
      </ul>
      <p className="muted">使用右上角的配置切换器管理多个主密码（profile）。CSV 导入支持通过拖拽将指纹映射到本地主密码。</p>
    </div>
  )
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>About Saforia</h3>
      <p className="muted">Saforia is a deterministic password generator. It combines a master password (encrypted at rest by a viewer password) with a per‑site postfix, then applies a hash‑based algorithm to derive a site password.</p>
      <h4>Security model</h4>
      <ul>
        <li>Master is stored only encrypted with viewer password (Argon2id + ChaCha20‑Poly1305 on desktop, AES‑GCM in web/mock under secure context).</li>
        <li>Viewer is never persisted; you enter it each time to decrypt the master.</li>
        <li>Clipboard copy is explicit and can auto‑clear after a delay.</li>
      </ul>
      <h4>Preferences</h4>
      <ul>
        <li><b>Default method</b>: Generation method used in the console and for new entries.</li>
        <li><b>Mask sensitive content</b>: On Wayland or where capture blocking is unreliable, keep secrets hidden.</li>
        <li><b>Autosave in Quick generate</b>: If enabled, “Save this postfix” is checked by default.</li>
        <li><b>Auto‑clear clipboard</b>: Seconds until clipboard is cleared (0 disables).</li>
      </ul>
      <h4>Algorithms</h4>
      <ul>
        <li><b>legacy_v1</b>: Base64(MD5(master||postfix)) without padding.</li>
        <li><b>legacy_v2</b>: Base64(SHA‑256(master||postfix)) with replacements “=”→“.”, “+”→“-”, “/”→“_”.</li>
        <li><b>lenXX_alnum/strong</b>: Iterative SHA‑256 over “master::postfix::method_id”, mapped via rejection sampling to target alphabet (alnum or alnum+symbols). Length is 10/20/36.</li>
      </ul>
      <p className="muted">Use pinned profiles to separate sets of entries per master (top‑right switcher). CSV backup allows mapping imported fingerprints to local masters via drag‑and‑drop.</p>
    </div>
  )
}
