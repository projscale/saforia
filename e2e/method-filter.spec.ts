import { test, expect } from '@playwright/test'

test('Filter by method shows only matching entries', async ({ page, baseURL }) => {
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
  // Add two entries with different methods
  await page.getByPlaceholder('Label').fill('L1')
  await page.getByPlaceholder('Postfix').fill('l1.t')
  await page.getByRole('combobox').nth(1).selectOption('legacy_v1')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByPlaceholder('Label').fill('L2')
  await page.getByPlaceholder('Postfix').fill('l2.t')
  await page.getByRole('combobox').nth(1).selectOption('len10_alnum')
  await page.getByRole('button', { name: 'Add' }).click()
  // Filter by v1
  await page.getByLabel('Filter by method').selectOption('legacy_v1')
  await expect(page.getByText('L1')).toBeVisible()
  await expect(page.getByText('L2')).toHaveCount(0)
})

