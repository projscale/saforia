import { test, expect } from '@playwright/test'

test('modal focus trap cycles with Tab/Shift+Tab', async ({ page, baseURL }) => {
  await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true })
  await page.goto(`${baseURL!}/?test=1`)
  // complete setup
  await page.getByLabel('Master password').fill('m')
  await page.getByLabel('Confirm master password').fill('m')
  await page.getByLabel('Viewer password (used to encrypt master)').fill('v')
  await page.getByLabel('Confirm viewer password').fill('v')
  await page.getByRole('button', { name: 'Save master' }).click()

  // add one entry and open modal
  await page.getByPlaceholder('Label').fill('C')
  await page.getByPlaceholder('Postfix').fill('c')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('button', { name: 'Generate' }).nth(1).click()

  const input = page.getByLabel('Viewer password')
  await expect(input).toBeFocused()
  // Tab should move to first button (Generate)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Generate' }).nth(2)).toBeFocused()
  // Tab should move to Cancel button
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused()
  // Tab should cycle back to input
  await page.keyboard.press('Tab')
  await expect(input).toBeFocused()
  // Shift+Tab from input cycles to Cancel
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused()
})

