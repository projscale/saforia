import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page, baseURL }) => {
  await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true })
  await page.goto(`${baseURL!}/?test=1`)
  const setupVisible = await page.getByRole('heading', { name: 'Initial setup' }).isVisible().catch(() => false)
  if (setupVisible) {
    await page.getByLabel('Master password').fill('m')
    await page.getByLabel('Confirm master password').fill('m')
    await page.getByLabel('Viewer password (used to encrypt master)').fill('v')
    await page.getByLabel('Confirm viewer password').fill('v')
    await page.getByRole('button', { name: 'Save master' }).click()
  }
})

test('Generate button sets aria-busy during operation', async ({ page }) => {
  await page.evaluate(() => { (window as any).SAFORIA_GENERATE_DELAY = true })
  await page.getByLabel('Postfix').fill('ex')
  await page.getByLabel('Viewer password').first().fill('x')
  const genBtn = page.getByRole('button', { name: /Generate|Generating…/ }).first()
  await genBtn.click()
  await expect(genBtn).toHaveAttribute('aria-busy', 'true')
})

test('Backup buttons set aria-busy during operation', async ({ page }) => {
  await page.evaluate(() => { (window as any).SAFORIA_EXPORT_DELAY = true; (window as any).SAFORIA_IMPORT_DELAY = true })
  const expBtn = page.getByRole('button', { name: /Export|Exporting…/ })
  const impBtn = page.getByRole('button', { name: /Import|Importing…/ })
  await page.getByLabel('Export to path').fill('/tmp/x.safe')
  await expBtn.click()
  await expect(expBtn).toHaveAttribute('aria-busy', 'true')
  await page.getByLabel('Import from path').fill('/tmp/x.safe')
  await impBtn.click()
  await expect(impBtn).toHaveAttribute('aria-busy', 'true')
})

test('Preferences and Backup controls have aria-describedby hints', async ({ page }) => {
  // Preferences default method select
  const prefSelect = page.getByRole('combobox').nth(2)
  const descId = await prefSelect.getAttribute('aria-describedby')
  expect(descId).toBeTruthy()
  const hintText = await page.locator(`#${descId!}`).innerText()
  expect(hintText).toContain('Affects Quick generate')
  // Backup export path
  const expInput = page.getByLabel('Export to path')
  const expDesc = await expInput.getAttribute('aria-describedby')
  expect(expDesc).toBeTruthy()
  const expHint = await page.locator(`#${expDesc!}`).innerText()
  expect(expHint).toContain('Exports saved postfixes')
  // Fingerprint viewer
  const fpInput = page.getByLabel('Viewer password').nth(2)
  const fpDesc = await fpInput.getAttribute('aria-describedby')
  expect(fpDesc).toBeTruthy()
  const fpHint = await page.locator(`#${fpDesc!}`).innerText()
  expect(fpHint).toContain('verify the current master password')
})
