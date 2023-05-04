import { test, expect } from '@playwright/test'

test('empty state hint is shown before adding entries', async ({ page, baseURL }) => {
  await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true })
  await page.goto(`${baseURL!}/?test=1`)
  // finish setup
  await page.getByLabel('Master password').fill('m')
  await page.getByLabel('Confirm master password').fill('m')
  await page.getByLabel('Viewer password (used to encrypt master)').fill('v')
  await page.getByLabel('Confirm viewer password').fill('v')
  await page.getByRole('button', { name: 'Save master' }).click()
  await expect(page.getByText('No saved postfixes yet. Use the form above')).toBeVisible()
})

test('generation failure shows error toast', async ({ page, baseURL }) => {
  await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true; (window as any).SAFORIA_FAIL_GENERATE = true })
  await page.goto(`${baseURL!}/?test=1`)
  // finish setup
  await page.getByLabel('Master password').fill('m')
  await page.getByLabel('Confirm master password').fill('m')
  await page.getByLabel('Viewer password (used to encrypt master)').fill('v')
  await page.getByLabel('Confirm viewer password').fill('v')
  await page.getByRole('button', { name: 'Save master' }).click()
  await page.getByLabel('Postfix').fill('x')
  await page.getByLabel('Viewer password (required each time)').fill('x')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByText(/Failed to generate/)).toBeVisible()
})

test('prefs failure shows error toast', async ({ page, baseURL }) => {
  await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true; (window as any).SAFORIA_FAIL_PREFS = true })
  await page.goto(`${baseURL!}/?test=1`)
  // finish setup
  await page.getByLabel('Master password').fill('m')
  await page.getByLabel('Confirm master password').fill('m')
  await page.getByLabel('Viewer password (used to encrypt master)').fill('v')
  await page.getByLabel('Confirm viewer password').fill('v')
  await page.getByRole('button', { name: 'Save master' }).click()
  await page.getByRole('combobox').nth(2).selectOption('len10_alnum')
  await expect(page.getByText(/mock prefs failed|Failed/i)).toBeVisible()
})

