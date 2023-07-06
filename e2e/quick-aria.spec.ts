import { test, expect } from '@playwright/test'

test('Quick Generate viewer has aria-describedby hint', async ({ page, baseURL }) => {
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
  const viewer = page.getByLabel('Viewer password (required each time)')
  const descId = await viewer.getAttribute('aria-describedby')
  expect(descId).toBeTruthy()
  const text = await page.locator(`#${descId!}`).innerText()
  expect(text.toLowerCase()).toContain('required')
})

