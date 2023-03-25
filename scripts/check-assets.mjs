#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const base = path.join(root, 'src-tauri', 'icons')
const required = ['icon.icns', 'icon.ico', 'icon.png']

let ok = true
for (const f of required) {
  const p = path.join(base, f)
  if (!fs.existsSync(p)) {
    ok = false
    console.warn(`[WARN] Missing icon asset: ${path.relative(root, p)} (run: npm run tauri:icons)`) 
  }
}

if (ok) {
  console.log('All required icon assets present in src-tauri/icons')
  process.exit(0)
} else {
  process.exit(1)
}

