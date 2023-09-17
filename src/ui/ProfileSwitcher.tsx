import React from 'react'
import { invoke } from '../bridge'
import { Preferences } from './screens/Preferences'
import { Backup } from './screens/Backup'
import { on, emit } from './events'
import { useI18n } from './i18n'

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
  const [settingsTab, setSettingsTab] = React.useState<'prefs'|'backup'|'about'>('prefs')
  const [addOpen, setAddOpen] = React.useState(false)
  const [m1, setM1] = React.useState('')
  const [m2, setM2] = React.useState('')
  const [v1, setV1] = React.useState('')
  const [v2, setV2] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const { t } = useI18n()

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

  React.useEffect(() => {
    const off = on('settings:open', (e) => {
      setSettingsTab((e.detail as any) || 'about')
      setSettingsOpen(true)
    })
    return off
  }, [])

  return (
    <div ref={rootRef} style={{ position: 'relative', marginLeft: 'auto' }}>
      <button className="btn" onClick={() => setOpen(o => !o)} title="Switch master profile">
        {active ? shortFp(active) : 'No master'}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, marginTop: 4, background: '#111318', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, minWidth: 220, zIndex: 10 }}>
          <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'var(--muted)' }}>{t('masters')}</div>
          {list.length === 0 && (<div style={{ padding: 10 }} className="muted">{t('noneSaved')}</div>)}
          {list.map(fp => (
            <div key={fp} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', padding: 8, background: active===fp ? 'rgba(59,130,246,0.1)' : undefined }}>
              <div className="password" title={fp}>{shortFp(fp)} {active===fp && <span className="badge" title="Active master">{t('active')}</span>}</div>
              <button className="btn small" disabled={active === fp} title="Use this master" onClick={async () => { try { await invoke('set_active_fingerprint', { fp }); setActive(fp); onToast(t('toastActiveChanged'), 'success'); setOpen(false) } catch (e: any) { onToast(String(e), 'error') } }}>{t('use')}</button>
              <button className="btn small danger" title="Delete this master" onClick={async () => { if (!confirm(t('confirmDeleteMaster'))) return; try { const ok = await invoke<boolean>('delete_master', { fp }); if (ok) { onToast(t('toastMasterDeleted'), 'success'); refresh() } else { onToast(t('toastMasterDeleteFailed'), 'error') } } catch (e:any) { onToast(String(e), 'error') } }}>{t('del')}</button>
            </div>
          ))}
          <div style={{ display: 'grid', gap: 6, padding: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button className="btn" onClick={() => setAddOpen(true)}>{t('addMaster')}</button>
            <button className="btn" title="Bind entries without fingerprint to active master" onClick={async () => {
              try { const n = await invoke<number>('bind_unbound_entries'); onToast(`${t('toastBoundEntriesPrefix')}${n}${t('toastBoundEntriesSuffix')}`, 'success'); setOpen(false) } catch (e:any) { onToast(String(e), 'error') }
            }}>{t('bindLegacy')}</button>
            <button className="btn" onClick={() => { emit('settings:open','prefs'); setOpen(false) }}>{t('settings')}</button>
          </div>
        </div>
      )}
      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-master-title" onClick={e => e.stopPropagation()}>
            <h3 id="add-master-title">{t('addMaster')}</h3>
            <div className="col">
              <label>{t('masterPassword')}</label>
              <input type="password" value={m1} onChange={e => setM1(e.target.value)} />
              <label>{t('confirmMaster')}</label>
              <input type="password" value={m2} onChange={e => setM2(e.target.value)} />
              <label>{t('viewerPassword')}</label>
              <input type="password" value={v1} onChange={e => setV1(e.target.value)} />
              <label>{t('confirmViewer')}</label>
              <input type="password" value={v2} onChange={e => setV2(e.target.value)} />
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn primary" disabled={busy || !m1 || m1!==m2 || !v1 || v1!==v2} onClick={async () => {
                setBusy(true)
                try {
                  const fp = await invoke<string>('setup_set_master', { viewerPassword: v1, masterPassword: m1 })
                  onToast(t('toastMasterSaved'), 'success'); setAddOpen(false); setM1(''); setM2(''); setV1(''); setV2(''); setActive(fp); refresh()
                } catch (e:any) { onToast(t('failedPrefix') + String(e), 'error') }
                finally { setBusy(false) }
              }}>{busy ? 'Saving…' : t('save')}</button>
              <button className="btn" onClick={() => setAddOpen(false)}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={e => e.stopPropagation()}
            tabIndex={-1}
            ref={el => { if (el) el.focus() }}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setSettingsOpen(false) } }}
          >
            <h3 id="settings-title">{t('settingsTitle')}</h3>
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
              tab={settingsTab}
              setTab={setSettingsTab}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsTabs({ methods, defaultMethod, autoClearSeconds, maskSensitive, autosaveQuick, setDefaultMethod, setAutoClearSeconds, setMaskSensitive, setAutosaveQuick, onToast, onImported, onClose, tab, setTab }:{
  methods: { id: string; name: string }[],
  defaultMethod: string, autoClearSeconds: number, maskSensitive: boolean, autosaveQuick: boolean,
  setDefaultMethod: (v:string)=>void, setAutoClearSeconds:(v:number)=>void, setMaskSensitive:(v:boolean)=>void, setAutosaveQuick:(v:boolean)=>void,
  onToast: (t:string,k?:'info'|'success'|'error')=>void, onImported: ()=>void, onClose: ()=>void,
  tab: 'prefs'|'backup'|'about', setTab: (t:'prefs'|'backup'|'about')=>void,
}) {
  const { t } = useI18n()
  return (
    <div className="col">
      <div className="tabs" role="tablist" aria-label="Settings tabs">
        <button id="tab-prefs" role="tab" aria-controls="panel-prefs" aria-selected={tab==='prefs'} className={`tab ${tab==='prefs' ? 'active' : ''}`} onClick={() => setTab('prefs')}>
          <span className="label">{t('tabPreferences')}</span>
        </button>
        <button id="tab-backup" role="tab" aria-controls="panel-backup" aria-selected={tab==='backup'} className={`tab ${tab==='backup' ? 'active' : ''}`} onClick={() => setTab('backup')}>
          <span className="label">{t('tabBackup')}</span>
        </button>
        <button id="tab-about" role="tab" aria-controls="panel-about" aria-selected={tab==='about'} className={`tab ${tab==='about' ? 'active' : ''}`} onClick={() => setTab('about')}>
          <span className="label">{t('tabAbout')}</span>
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn" onClick={onClose}>{t('close')}</button>
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
  const { lang } = useI18n()
  const isRU = lang === 'ru'
  const isZH = lang === 'zh'
  if (isRU) return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>О Saforia</h3>
      <p className="muted">Saforia — детерминированный генератор паролей. Он соединяет мастер‑пароль (на диске хранится только в зашифрованном виде под viewer‑паролем) и постфикс сервиса, а затем по хэш‑алгоритму получает конечный пароль.</p>
      <h4>Безопасность</h4>
      <ul>
        <li>Мастер хранится только зашифрованно (Argon2id + AES‑GCM на десктопе; AES‑GCM в web/mock на защищённом origin; поддержка чтения старых файлов v1 на ChaCha20‑Poly1305).</li>
        <li>Viewer не сохраняется; его вводят каждый раз для расшифровки мастера.</li>
        <li>Копирование в буфер обмена — только по действию пользователя, с авто‑очисткой по таймеру (если включено).</li>
      </ul>
      <h4>Настройки</h4>
      <ul>
        <li><b>Default method</b> — метод генерации по умолчанию.</li>
        <li><b>Mask sensitive content</b> — скрывает секреты на экране (особенно на Wayland).</li>
        <li><b>Block while captured</b> — блокировать действия при записи экрана.</li>
        <li><b>Viewer prompt timeout</b> — автозакрытие окна ввода viewer при бездействии.</li>
        <li><b>Auto‑clear clipboard</b> — авто‑очистка буфера (0 — выкл.).</li>
        <li><b>Auto‑clear output</b> — авто‑скрытие пароля на экране.</li>
        <li><b>Copy after console generate</b> — копировать сразу после генерации в консоли.</li>
        <li><b>Hold‑only reveal</b> — показывать секрет только при удерживании (без кнопки).</li>
        <li><b>Clear clipboard on blur</b> — очищать буфер при сворачивании/потере фокуса.</li>
        <li><b>Show postfix in list</b> — показывать постфикс в таблице (обычно <i>выключено</i>).</li>
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
        <li>主密码仅以加密形式保存（桌面 Argon2id + AES‑GCM；在安全上下文的 web/mock 使用 AES‑GCM；兼容读取旧版 v1（ChaCha20‑Poly1305））。</li>
        <li>viewer 不持久化；每次生成前输入以解密主密码。</li>
        <li>复制操作需用户显式触发；支持延时自动清除剪贴板。</li>
      </ul>
      <h4>偏好设置</h4>
      <ul>
        <li><b>Default method</b>：控制台与新条目的默认方法。</li>
        <li><b>Mask sensitive content</b>：在屏幕上隐藏敏感内容（尤其是 Wayland）。</li>
        <li><b>Block while captured</b>：检测到录屏时禁止操作。</li>
        <li><b>Viewer prompt timeout</b>：无操作后自动关闭 Viewer 提示。</li>
        <li><b>Auto‑clear clipboard</b>：剪贴板自动清除（0 关闭）。</li>
        <li><b>Auto‑clear output</b>：一段时间后隐藏屏幕上的密码。</li>
        <li><b>Copy after console generate</b>：控制台生成后立即复制。</li>
        <li><b>Hold‑only reveal</b>：仅按住时显示（没有切换按钮）。</li>
        <li><b>Clear clipboard on blur</b>：应用失焦/隐藏时清空剪贴板。</li>
        <li><b>Show postfix in list</b>：在列表中显示后缀（通常 <i>关闭</i>）。</li>
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
        <li>Master is stored only encrypted with viewer password (Argon2id + AES‑GCM on desktop; AES‑GCM in web/mock; legacy v1 ChaCha20‑Poly1305 files are supported for reading).</li>
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
