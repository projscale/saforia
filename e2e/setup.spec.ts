import { test, expect } from '@playwright/test'

test('first run shows setup only, then unlocks app after saving master', async ({ page, baseURL }) => {
  await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true })
  await page.goto(`${baseURL!}/?test=1`)

  // Setup card visible, Generate button disabled initially
  await expect(page.getByRole('heading', { name: 'Initial setup' })).toBeVisible()
  await page.getByLabel('Master password').fill('master-123')
  await page.getByLabel('Viewer password (used to encrypt master)').fill('viewer-xyz')
  await page.getByRole('button', { name: 'Save master' }).click()

  await expect(page.getByText('Master password saved')).toBeVisible()

  // After saving, the main app sections should become visible
  await expect(page.getByRole('heading', { name: 'Quick generate' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Saved postfixes' })).toBeVisible()
})

