import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    (window as any).SAFORIA_MOCK = true
  })
  await page.goto(`${baseURL!}/?test=1`)
  // If initial setup is shown, complete it to unlock main UI
  const setupVisible = await page.getByRole('heading', { name: 'Initial setup' }).isVisible().catch(() => false)
  if (setupVisible) {
    await page.getByLabel('Master password').fill('master-auto')
    await page.getByLabel('Confirm master password').fill('master-auto')
    await page.getByLabel('Viewer password (used to encrypt master)').fill('viewer-auto')
    await page.getByLabel('Confirm viewer password').fill('viewer-auto')
    await page.getByRole('button', { name: 'Save master' }).click()
    await page.getByText('Master password saved').waitFor({ timeout: 3000 })
  }
})

test('quick generate → hold to reveal', async ({ page }) => {
  await page.evaluate(() => { (window as any).SAFORIA_GENERATE_DELAY = true })
  await page.getByLabel('Postfix').fill('example')
  await page.getByRole('button', { name: /^Generate$|^Generating…$/ }).first().click()
  await page.getByRole('dialog', { name: 'Viewer password' }).getByLabel('Viewer password').fill('viewer-auto')
  await page.getByRole('dialog').getByRole('button', { name: /^Generate$|^Generating…$/ }).click()
  // Reveal by hold
  const hold = page.getByRole('button', { name: /Hold to reveal|Release to hide/ })
  await hold.dispatchEvent('pointerdown')
  await page.waitForTimeout(250)
  const pwText = await page.locator('.password').first().innerText()
  expect(pwText.length).toBeGreaterThan(0)
  await hold.dispatchEvent('pointerup')
})

test('viewer inputs have reveal toggles', async ({ page }) => {
  await page.getByLabel('Postfix').fill('ex2')
  await page.getByRole('button', { name: /^Generate$|^Generating…$/ }).first().click()
  const viewer = page.getByRole('dialog', { name: 'Viewer password' }).getByLabel('Viewer password')
  await viewer.fill('secret')
  await viewer.evaluate((el) => { const btn = (el.closest('.input-with-btns') as HTMLElement).querySelector('button') as HTMLButtonElement; btn.click() })
  const typeAttr = await viewer.getAttribute('type')
  expect(typeAttr).toBe('text')
})

test('modal viewer input has reveal', async ({ page }) => {
  // Save an entry via console and open modal
  await page.getByLabel('Postfix').fill('b.test')
  await page.getByLabel('Save this postfix').check()
  await page.getByLabel('Label').fill('B')
  await page.getByRole('button', { name: /^Generate$|^Generating…$/ }).first().click()
  await page.getByRole('dialog', { name: 'Viewer password' }).getByLabel('Viewer password').fill('viewer-auto')
  await page.getByRole('dialog').getByRole('button', { name: /^Generate$|^Generating…$/ }).click()
  await page.getByText('B').waitFor()
  // Open modal for this saved entry
  const row = page.locator('.list .list-item', { hasText: 'B' })
  await row.getByRole('button', { name: 'Generate' }).click()
  const inp = page.getByLabel('Viewer password')
  await inp.fill('vv')
  await inp.evaluate((el) => { const btn = (el.closest('.input-with-btns') as HTMLElement).querySelector('button') as HTMLButtonElement; btn.click() })
  const typeAttr = await inp.getAttribute('type')
  expect(typeAttr).toBe('text')
  // Close by Escape
  await page.keyboard.press('Escape')
  // Expect modal to disappear
  await expect(page.getByRole('heading', { name: 'Viewer password' })).toHaveCount(0)
})

test('fingerprint viewer has reveal', async ({ page }) => {
  const fpViewer = page.getByLabel('Viewer password')
  await fpViewer.fill('viewer-auto')
  await fpViewer.evaluate((el) => { const btn = (el.closest('.input-with-btns') as HTMLElement).querySelector('button') as HTMLButtonElement; btn.click() })
  const typeAttr = await fpViewer.getAttribute('type')
  expect(typeAttr).toBe('text')
})

test('add entry and generate saved', async ({ page }) => {
  await page.getByLabel('Postfix').fill('site-a')
  await page.getByLabel('Save this postfix').check()
  await page.getByLabel('Label').fill('Site A')
  await page.getByLabel('Viewer password').first().fill('viewer-auto')
  await page.getByRole('button', { name: /^Generate$|^Generating…$/ }).first().click()
  await expect(page.getByText('Site A')).toBeVisible()

  const row = page.locator('.list .list-item', { hasText: 'Site A' })
  await row.getByRole('button', { name: 'Generate' }).click()
  await page.getByRole('dialog', { name: 'Viewer password' }).getByLabel('Viewer password').fill('viewer-auto')
  await page.getByRole('dialog').getByRole('button', { name: /^Generate$/ }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
})

test('preferences: default method + clipboard auto-clear', async ({ page }) => {
  await page.getByRole('combobox').nth(2).selectOption('len10_alnum')
  await page.getByLabel('Auto-clear clipboard (seconds, 0 = off)').fill('5')
  await expect(page.getByRole('combobox').nth(2)).toHaveValue('len10_alnum')
})

test('backup export/import (mock)', async ({ page }) => {
  await page.getByLabel('Export to path').fill('/tmp/test.safe')
  await page.getByRole('button', { name: 'Export' }).click()
  await expect(page.getByText('Exported successfully')).toBeVisible()

  await page.getByLabel('Import from path').fill('/tmp/test.safe')
  await page.getByRole('button', { name: /^Import$/ }).click()
  await expect(page.getByText('Imported')).toBeVisible()
})
