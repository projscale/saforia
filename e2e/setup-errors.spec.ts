import { test, expect } from '@playwright/test'

test('setup failure shows alert and stays on setup screen', async ({ page, baseURL }) => {
  await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true; (window as any).SAFORIA_FAIL_SETUP = true })
  await page.goto(`${baseURL!}/?test=1`)
  await expect(page.getByRole('heading', { name: 'Initial setup' })).toBeVisible()
  await page.getByLabel('Master password').fill('mm')
  await page.getByLabel('Confirm master password').fill('mm')
  await page.getByLabel('Viewer password (used to encrypt master)').fill('vv')
  await page.getByLabel('Confirm viewer password').fill('vv')
  const btn = page.getByRole('button', { name: /Save master|Saving…/ })
  await btn.click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quick generate' })).toHaveCount(0)
})

