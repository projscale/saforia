import { test, expect } from '@playwright/test'

test('setup mismatch hints are aria-live', async ({ page, baseURL }) => {
  await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true })
  await page.goto(`${baseURL!}/?test=1`)
  await expect(page.getByRole('heading', { name: 'Initial setup' })).toBeVisible()
  await page.getByLabel('Master password').fill('m1')
  await page.getByLabel('Confirm master password').fill('m2')
  const mm = page.getByText('Master passwords do not match')
  await expect(mm).toBeVisible()
  await expect(mm).toHaveAttribute('aria-live', /polite/i)

  await page.getByLabel('Viewer password (used to encrypt master)').fill('v1')
  await page.getByLabel('Confirm viewer password').fill('v2')
  const vm = page.getByText('Viewer passwords do not match')
  await expect(vm).toBeVisible()
  await expect(vm).toHaveAttribute('aria-live', /polite/i)
})

