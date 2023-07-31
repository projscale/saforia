import { test, expect } from '@playwright/test'

test('QuickGenerate ViewerPrompt disables submit until postfix and viewer are provided', async ({ page, baseURL }) => {
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
  // No postfix yet
  const genBtn = page.getByRole('button', { name: /Generate|Generating…/ })
  await expect(genBtn).toBeDisabled()
  // With postfix but no viewer
  await page.getByLabel('Postfix').fill('vp.test')
  await expect(genBtn).toBeDisabled()
  // Fill viewer
  await page.getByLabel('Viewer password').fill('v')
  await expect(genBtn).toBeEnabled()
})

test('Fingerprint ViewerPrompt disables submit until viewer is provided', async ({ page, baseURL }) => {
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
  const showBtn = page.getByRole('button', { name: /^Show$|^…$/ })
  await expect(showBtn).toBeDisabled()
  await page.getByLabel('Viewer password').fill('v')
  await expect(showBtn).toBeEnabled()
})

