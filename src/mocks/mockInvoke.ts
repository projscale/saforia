// Minimal mock of Tauri invoke for UI smoke tests.
// Provides generation parity with legacy v1/v2 and lenXX_(alnum|strong)

type Entry = { id: string; label: string; postfix: string; method_id: string; created_at: number }

const state = {
  master: 'mock_master_password',
  hasMaster: false,
  entries: [] as Entry[],
  prefs: { default_method: 'len36_strong', auto_clear_seconds: 30, mask_sensitive: false },
}

function md5Base64NoPad(input: Uint8Array): string {
  // Minimal MD5 via Web Crypto not available; use a small JS md5 implementation?
  // For simplicity in mock, leverage SubtleCrypto for SHA-256 only and stub MD5 using a precomputed table not feasible.
  // Instead, rely on a small inline implementation (RFC 1321) trimmed for mock.
  const md5 = (function(){
    function rhex(n:number){const s="0123456789abcdef";let j,e="";for(j=0;j<4;j++)e+=s.charAt((n>>>(j*8+4))&15)+s.charAt((n>>>(j*8))&15);return e}
    function str2blks_MD5(str:string){const nblk=((str.length+8>>6)+1)*16;const blks=new Array(nblk);let i;for(i=0;i<nblk;i++)blks[i]=0;for(i=0;i<str.length;i++)blks[i>>2]|=str.charCodeAt(i)<<((i%4)*8);blks[i>>2]|=128<<((i%4)*8);blks[nblk-2]=str.length*8;return blks}
    function add(x:number,y:number){const l=(x&65535)+(y&65535);const m=(x>>16)+(y>>16)+(l>>16);return m<<16|(l&65535)}
    function rol(x:number,n:number){return x<<n|x>>>32-n}
    function cmn(q:number,a:number,b:number,x:number,s:number,t:number){return add(rol(add(add(a,q),add(x,t)),s),b)}
    function ff(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(b&c|~b&d,a,b,x,s,t)}
    function gg(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(b&d|c&~b,a,b,x,s,t)}
    function hh(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(b^c^d,a,b,x,s,t)}
    function ii(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(c^(b|~d),a,b,x,s,t)}
    function md51(s:string){const x=str2blks_MD5(s);let a=1732584193,b=-271733879,c=-1732584194,d=271733878;for(let i=0;i<x.length;i+=16){const olda=a,oldb=b,oldc=c,oldd=d;a=ff(a,b,c,d,x[i+0],7,-680876936);d=ff(d,a,b,c,x[i+1],12,-389564586);c=ff(c,d,a,b,x[i+2],17,606105819);b=ff(b,c,d,a,x[i+3],22,-1044525330);a=ff(a,b,c,d,x[i+4],7,-176418897);d=ff(d,a,b,c,x[i+5],12,1200080426);c=ff(c,d,a,b,x[i+6],17,-1473231341);b=ff(b,c,d,a,x[i+7],22,-45705983);a=ff(a,b,c,d,x[i+8],7,1770035416);d=ff(d,a,b,c,x[i+9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,-42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);a=ff(a,b,c,d,x[i+12],7,1804603682);d=ff(d,a,b,c,x[i+13],12,-40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);b=ff(b,c,d,a,x[i+15],22,1236535329);a=gg(a,b,c,d,x[i+1],5,-165796510);d=gg(d,a,b,c,x[i+6],9,-1069501632);c=gg(c,d,a,b,x[i+11],14,643717713);b=gg(b,c,d,a,x[i+0],20,-373897302);a=gg(a,b,c,d,x[i+5],5,-701558691);d=gg(d,a,b,c,x[i+10],9,38016083);c=gg(c,d,a,b,x[i+15],14,-660478335);b=gg(b,c,d,a,x[i+4],20,-405537848);a=gg(a,b,c,d,x[i+9],5,568446438);d=gg(d,a,b,c,x[i+14],9,-1019803690);c=gg(c,d,a,b,x[i+3],14,-187363961);b=gg(b,c,d,a,x[i+8],20,1163531501);a=gg(a,b,c,d,x[i+13],5,-1444681467);d=gg(d,a,b,c,x[i+2],9,-51403784);c=gg(c,d,a,b,x[i+7],14,1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);a=hh(a,b,c,d,x[i+5],4,-378558);d=hh(d,a,b,c,x[i+8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16,1839030562);b=hh(b,c,d,a,x[i+14],23,-35309556);a=hh(a,b,c,d,x[i+1],4,-1530992060);d=hh(d,a,b,c,x[i+4],11,1272893353);c=hh(c,d,a,b,x[i+7],16,-155497632);b=hh(b,c,d,a,x[i+10],23,-1094730640);a=hh(a,b,c,d,x[i+13],4,681279174);d=hh(d,a,b,c,x[i+0],11,-358537222);c=hh(c,d,a,b,x[i+3],16,-722521979);b=hh(b,c,d,a,x[i+6],23,76029189);a=ii(a,b,c,d,x[i+0],6,-198630844);d=ii(d,a,b,c,x[i+7],10,1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);b=ii(b,c,d,a,x[i+5],21,-57434055);a=ii(a,b,c,d,x[i+12],6,1700485571);d=ii(d,a,b,c,x[i+3],10,-1894986606);c=ii(c,d,a,b,x[i+10],15,-1051523);b=ii(b,c,d,a,x[i+1],21,-2054922799);a=add(a,olda);b=add(b,oldb);c=add(c,oldc);d=add(d,oldd)}return rhex(a)+rhex(b)+rhex(c)+rhex(d)}
    return function(s:string){return md51(s)}
  })()
  const hex = md5(new TextDecoder().decode(input))
  const b = new Uint8Array(hex.match(/.{2}/g)!.map(h=>parseInt(h,16)))
  return btoa(String.fromCharCode(...b)).replace(/=+$/,'')
}

function sha256Bytes(msgBytes: Uint8Array): Uint8Array {
  // Minimal SHA-256 implementation (public domain)
  const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ])
  function rotr(n: number, x: number) { return (x >>> n) | (x << (32 - n)) }
  function ch(x: number, y: number, z: number) { return (x & y) ^ (~x & z) }
  function maj(x: number, y: number, z: number) { return (x & y) ^ (x & z) ^ (y & z) }
  function s0(x: number) { return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x) }
  function s1(x: number) { return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x) }
  function g0(x: number) { return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3) }
  function g1(x: number) { return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10) }

  const h = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19])

  const ml = msgBytes.length * 8
  const withOne = new Uint8Array(msgBytes.length + 1)
  withOne.set(msgBytes)
  withOne[msgBytes.length] = 0x80
  let k = (56 - (withOne.length % 64) + 64) % 64
  const padded = new Uint8Array(withOne.length + k + 8)
  padded.set(withOne)
  const dv = new DataView(padded.buffer)
  dv.setUint32(padded.length - 8, Math.floor(ml / 2 ** 32))
  dv.setUint32(padded.length - 4, ml >>> 0)

  const w = new Uint32Array(64)
  for (let i = 0; i < padded.length; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4)
    for (let j = 16; j < 64; j++) w[j] = (g1(w[j-2]) + w[j-7] + g0(w[j-15]) + w[j-16]) >>> 0
    let a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7]
    for (let j = 0; j < 64; j++) {
      const t1 = (hh + s1(e) + ch(e,f,g) + K[j] + w[j]) >>> 0
      const t2 = (s0(a) + maj(a,b,c)) >>> 0
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }
    h[0] = (h[0] + a) >>> 0
    h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0
    h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0
    h[5] = (h[5] + f) >>> 0
    h[6] = (h[6] + g) >>> 0
    h[7] = (h[7] + hh) >>> 0
  }
  const out = new Uint8Array(32)
  const dv2 = new DataView(out.buffer)
  for (let i=0;i<8;i++) dv2.setUint32(i*4, h[i])
  return out
}

function b64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data)).replace(/=/g,'.').replace(/\+/g,'-').replace(/\//g,'_')
}

async function generate(master: string, postfix: string, methodId: string): Promise<string> {
  if (methodId === 'legacy_v1') {
    const v = md5Base64NoPad(new TextEncoder().encode(master + postfix))
    return v
  }
  if (methodId === 'legacy_v2') {
    const d = sha256Bytes(new TextEncoder().encode(master + postfix))
    return b64url(d)
  }
  const parts = methodId.split('_')
  const len = parseInt(parts[0].slice(3)) || 36
  const strong = parts[1] === 'strong'
  const alnum = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const strongAlpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.?/<>~'
  const alpha = strong ? strongAlpha : alnum
  const seed = new TextEncoder().encode(`${master}::${postfix}::${methodId}`)
  let digest = sha256Bytes(seed)
  const stream: number[] = Array.from(digest)
  let counter = 1
  while (stream.length < len*2) {
    const last = stream.slice(Math.max(0, stream.length-32))
    const base = new Uint8Array([...last, ...new Uint8Array(new Uint32Array([counter]).buffer)])
    const h = sha256Bytes(base)
    stream.push(...Array.from(h))
    counter++
  }
  const out: string[] = []
  const m = alpha.length
  const limit = Math.floor(255 / m) * m
  let i = 0
  while (out.length < len) {
    const v = stream[i++]
    if (v < limit) out.push(alpha[v % m])
  }
  return out.join('')
}

function newId() { return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2,10)}` }

export async function mockInvoke<T = any>(cmd: string, args: any = {}): Promise<T> {
  const anyWin: any = (globalThis as any)
  switch (cmd) {
    case 'has_master': return state.hasMaster as unknown as T
    case 'setup_set_master': state.master = args.masterPassword || state.master; state.hasMaster = true; return (undefined as unknown) as T
    case 'master_fingerprint': {
      // Just return md5 hex of master (approx via mock algorithm)
      const hex = (function(){
        const td = new TextDecoder()
        const enc = new TextEncoder()
        const h = md5Base64NoPad(enc.encode(state.master))
        // Convert b64 back to hex for display similarity (not exact md5 hex). Use fallback string.
        return h
      })()
      return hex as T
    }
    case 'list_entries': return [...state.entries] as T
    case 'add_entry': {
      const e: Entry = { id: newId(), label: args.label, postfix: args.postfix, method_id: args.methodId, created_at: Math.floor(Date.now()/1000) }
      state.entries.unshift(e)
      return e as T
    }
    case 'delete_entry': {
      state.entries = state.entries.filter(e => e.id !== args.id)
      return true as T
    }
    case 'generate_saved': {
      const e = state.entries.find(x => x.id === args.id)
      if (!e) throw new Error('Entry not found')
      if (anyWin?.SAFORIA_FAIL_GENERATE) throw new Error('mock generate failed')
      return await generate(state.master, e.postfix, e.method_id) as T
    }
    case 'generate_password': {
      if (anyWin?.SAFORIA_FAIL_GENERATE) throw new Error('mock generate failed')
      if (anyWin?.SAFORIA_GENERATE_DELAY) await new Promise(r => setTimeout(r, 250))
      return await generate(state.master, args.postfix, args.methodId) as T
    }
    case 'enable_content_protection': return true as T
    case 'storage_paths': return ["/mock/data", "/mock/data/master.enc"] as unknown as T
    case 'is_screen_captured': return false as T
    case 'platform_info': return { os: 'web', wayland: false } as T
    case 'clear_clipboard_native': return false as T
    case 'write_clipboard_native': return true as T
    case 'get_prefs': return state.prefs as T
    case 'set_prefs': {
      if (anyWin?.SAFORIA_FAIL_PREFS) throw new Error('mock prefs failed')
      if (typeof args.defaultMethod === 'string') state.prefs.default_method = args.defaultMethod
      if (typeof args.autoClearSeconds === 'number') state.prefs.auto_clear_seconds = args.autoClearSeconds
      if (typeof args.maskSensitive === 'boolean') state.prefs.mask_sensitive = args.maskSensitive
      return state.prefs as T
    }
    case 'export_entries': {
      if (anyWin?.SAFORIA_FAIL_EXPORT) throw new Error('mock export failed')
      return (undefined as unknown) as T
    }
    case 'import_entries': {
      if (anyWin?.SAFORIA_FAIL_IMPORT) throw new Error('mock import failed')
      return 0 as T
    }
    case 'export_entries_fail': throw new Error('mock export failed') as any
    case 'import_entries_fail': throw new Error('mock import failed') as any
    default:
      throw new Error(`Unknown mock cmd: ${cmd}`)
  }
}
