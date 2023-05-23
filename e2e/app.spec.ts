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
  await page.getByLabel('Viewer password (required each time)').fill('x')
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByRole('button', { name: /Generating…|Generate/ }).isVisible()
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
  const viewer = page.getByLabel('Viewer password (required each time)')
  await viewer.fill('secret')
  // Click the eye button next to this input
  await viewer.evaluate((el) => {
    const parent = el.closest('.input-with-btns') as HTMLElement | null
    const btn = parent?.querySelector('button') as HTMLButtonElement | null
    btn?.click()
  })
  // After reveal, type should be text
  const typeAttr = await viewer.getAttribute('type')
  expect(typeAttr).toBe('text')
})

test('modal viewer input has reveal', async ({ page }) => {
  // Add entry and open modal
  await page.getByPlaceholder('Label').fill('B')
  await page.getByPlaceholder('Postfix').fill('b')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('button', { name: 'Generate' }).nth(1).click()
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
  await page.getByPlaceholder('Label').fill('Site A')
  await page.getByPlaceholder('Postfix').fill('site-a')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('Site A')).toBeVisible()

  await page.getByRole('button', { name: 'Generate' }).nth(1).click()
  await page.getByRole('textbox').fill('viewer')
  await page.getByRole('button', { name: /^Generate$/ }).click()
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
