import { test, expect } from '@playwright/test'

test('Autosave preference toggles default Save checkbox in Quick generate', async ({ page, baseURL }) => {
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
  // Initially off
  const saveCb = page.getByLabel('Save this postfix')
  const checked0 = await saveCb.isChecked()
  // Toggle in preferences
  await page.getByLabel('Autosave in Quick generate').selectOption('yes')
  // After toggling, navigate focus to quick area to force render, then check
  await page.getByLabel('Postfix').click()
  const checked1 = await saveCb.isChecked()
  expect(checked1).toBeTruthy()
  // Turn off again
  await page.getByLabel('Autosave in Quick generate').selectOption('no')
  await page.getByLabel('Postfix').click()
  const checked2 = await saveCb.isChecked()
  expect(checked2).toBeFalsy()
})

