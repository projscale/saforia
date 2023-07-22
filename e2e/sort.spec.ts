import { test, expect } from '@playwright/test'

test('Saved list sorting recent vs alpha', async ({ page, baseURL }) => {
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
  // Add entries: Zeta then Alpha
  await page.getByPlaceholder('Label').fill('Zeta')
  await page.getByPlaceholder('Postfix').fill('z.t')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByPlaceholder('Label').fill('Alpha')
  await page.getByPlaceholder('Postfix').fill('a.t')
  await page.getByRole('button', { name: 'Add' }).click()
  const firstRecent = await page.locator('.list .list-item').first().innerText()
  // Switch to A→Z
  await page.getByLabel('Sort').selectOption('alpha')
  const firstAlpha = await page.locator('.list .list-item').first().innerText()
  expect(firstRecent).not.toEqual(firstAlpha)
  expect(firstAlpha).toContain('Alpha')
})

