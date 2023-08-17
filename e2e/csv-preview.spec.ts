import { test, expect } from '@playwright/test'

test('CSV preview modal shows imported fingerprints and local masters', async ({ page, baseURL }) => {
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
  // Add one entry via unified console so preview has data
  await page.getByLabel('Postfix').fill('csv.test')
  await page.getByLabel('Save this postfix').check()
  await page.getByLabel('Label').fill('CSV Item')
  await page.getByLabel('Viewer password').first().fill('v')
  await page.getByRole('button', { name: /^Generate$|^Generating…$/ }).first().click()
  await expect(page.getByText('CSV Item')).toBeVisible()

  // Open CSV preview modal (mock ignores path and summarizes current state)
  await page.getByLabel('Import CSV from path').fill('/tmp/in.csv')
  await page.getByRole('button', { name: 'Preview CSV import' }).click()
  await expect(page.getByRole('heading', { name: 'Map imported fingerprints' })).toBeVisible()
  // Expect imported fingerprints section and local masters badges present
  await expect(page.getByText(/Imported fingerprints/i)).toBeVisible()
  await expect(page.getByText(/Local masters/i)).toBeVisible()
})

