import { test, expect } from '@playwright/test'

test('Profile switcher add master and switch active', async ({ page, baseURL }) => {
  await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true })
  await page.goto(`${baseURL!}/?test=1`)
  // Complete setup (first master)
  const setupVisible = await page.getByRole('heading', { name: 'Initial setup' }).isVisible().catch(() => false)
  if (setupVisible) {
    await page.getByLabel('Master password').fill('m')
    await page.getByLabel('Confirm master password').fill('m')
    await page.getByLabel('Viewer password (used to encrypt master)').fill('v')
    await page.getByLabel('Confirm viewer password').fill('v')
    await page.getByRole('button', { name: 'Save master' }).click()
  }

  // Open profile switcher dropdown
  const switcherBtn = page.getByRole('button', { name: /No master|…|[0-9a-f]/i }).last()
  await switcherBtn.click()
  const initialUseCount = await page.getByRole('button', { name: 'Use' }).count()

  // Add second master
  await page.getByRole('button', { name: 'Add Master…' }).click()
  await page.getByLabel('Master password').fill('m2')
  await page.getByLabel('Confirm master password').fill('m2')
  await page.getByLabel('Viewer password').fill('v2')
  await page.getByLabel('Confirm viewer password').fill('v2')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Master added')).toBeVisible()

  // Re-open dropdown and verify count increased
  await switcherBtn.click()
  const afterUseCount = await page.getByRole('button', { name: 'Use' }).count()
  expect(afterUseCount).toBeGreaterThan(initialUseCount)

  // Switch to the other profile (click any enabled Use)
  const enabledUse = page.getByRole('button', { name: 'Use' }).filter({ has: page.locator(':not([disabled])') })
  await enabledUse.first().click()
  await expect(page.getByText('Active master changed')).toBeVisible()
})

