import { test, expect } from '@playwright/test'

test('Saved pagination shows multiple pages and navigates', async ({ page, baseURL }) => {
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
  // Add many entries to exceed one page
  for (let i = 0; i < 45; i++) {
    await page.getByPlaceholder('Label').fill(`E${i}`)
    await page.getByPlaceholder('Postfix').fill(`e${i}.t`)
    await page.getByRole('button', { name: 'Add' }).click()
  }
  // Expect pagination controls
  await expect(page.getByText(/Page \d+ of \d+/)).toBeVisible()
  const next = page.getByRole('button', { name: 'Next page' })
  await expect(next).toBeEnabled()
  await next.click()
  await expect(page.getByText(/Page 2 of/)).toBeVisible()
  const prev = page.getByRole('button', { name: 'Previous page' })
  await prev.click()
  await expect(page.getByText(/Page 1 of/)).toBeVisible()
})

