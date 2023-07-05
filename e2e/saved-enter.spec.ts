import { test, expect } from '@playwright/test'

test('Saved entry modal submits on Enter', async ({ page, baseURL }) => {
  await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true })
  await page.goto(`${baseURL!}/?test=1`)
  // Setup
  const isSetup = await page.getByRole('heading', { name: 'Initial setup' }).isVisible().catch(() => false)
  if (isSetup) {
    await page.getByLabel('Master password').fill('m')
    await page.getByLabel('Confirm master password').fill('m')
    await page.getByLabel('Viewer password (used to encrypt master)').fill('v')
    await page.getByLabel('Confirm viewer password').fill('v')
    await page.getByRole('button', { name: 'Save master' }).click()
  }
  // Add an entry
  await page.getByPlaceholder('Label').fill('EnterTest')
  await page.getByPlaceholder('Postfix').fill('enter.test')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('button', { name: 'Generate' }).nth(1).click()
  // Fill viewer and press Enter
  const viewer = page.getByLabel('Viewer password')
  await viewer.fill('v')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
})

