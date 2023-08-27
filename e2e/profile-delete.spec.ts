import { test, expect } from '@playwright/test'

test('Profile switcher delete master with confirm', async ({ page, baseURL }) => {
  await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true })
  await page.goto(`${baseURL!}/?test=1`)
  // Setup first master
  const setupVisible = await page.getByRole('heading', { name: 'Initial setup' }).isVisible().catch(() => false)
  if (setupVisible) {
    await page.getByLabel('Master password').fill('m')
    await page.getByLabel('Confirm master password').fill('m')
    await page.getByLabel('Viewer password (used to encrypt master)').fill('v')
    await page.getByLabel('Confirm viewer password').fill('v')
    await page.getByRole('button', { name: 'Save master' }).click()
  }
  // Add second master
  const switcherBtn = page.getByRole('button', { name: /No master|…|[0-9a-f]/i }).last()
  await switcherBtn.click()
  await page.getByRole('button', { name: 'Add Master…' }).click()
  await page.getByLabel('Master password').fill('m2')
  await page.getByLabel('Confirm master password').fill('m2')
  await page.getByLabel('Viewer password').fill('v2')
  await page.getByLabel('Confirm viewer password').fill('v2')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Master added')).toBeVisible()

  // Delete one master (mock confirm)
  await switcherBtn.click()
  await page.evaluate(() => { (window as any).confirm = () => true })
  await page.getByRole('button', { name: 'Del' }).first().click()
  await expect(page.getByText('Master deleted')).toBeVisible()
})

