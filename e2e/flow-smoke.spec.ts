import { test, expect } from '@playwright/test'

test('Quick save on generate → generate from Saved', async ({ page, baseURL }) => {
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
  await page.getByLabel('Postfix').fill('myapp.com')
  await page.getByLabel('Save this postfix').check()
  await page.getByLabel('Label').fill('MyApp')
  await page.getByLabel('Viewer password').first().fill('v')
  await page.getByRole('button', { name: /^Generate$|^Generating…$/ }).first().click()
  await expect(page.getByText('MyApp')).toBeVisible()
  await page.getByRole('button', { name: 'Generate and copy password' }).first().click()
  await page.getByRole('dialog', { name: 'Viewer password' }).getByLabel('Viewer password').fill('v')
  await page.getByRole('dialog').getByRole('button', { name: /^Generate$|^Generating…$/ }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
})

