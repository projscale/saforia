import { test, expect } from '@playwright/test'

test('pin/unpin entry affects ordering and icon', async ({ page, baseURL }) => {
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
  // Add two entries
  await page.getByPlaceholder('Label').fill('A')
  await page.getByPlaceholder('Postfix').fill('a.test')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByPlaceholder('Label').fill('B')
  await page.getByPlaceholder('Postfix').fill('b.test')
  await page.getByRole('button', { name: 'Add' }).click()
  // Pin the second (top) or pin the first visible 'A'
  const firstRow = page.locator('.list .list-item').first()
  const secondRow = page.locator('.list .list-item').nth(1)
  const labelFirstBefore = await firstRow.locator('div').first().innerText()
  // Click the star on the second row to pin it above the first
  await secondRow.getByRole('button', { name: /Pin|Unpin/ }).click()
  const labelFirstAfter = await page.locator('.list .list-item').first().locator('div').first().innerText()
  expect(labelFirstAfter).not.toEqual(labelFirstBefore)
  // Unpin restores order
  await page.locator('.list .list-item').first().getByRole('button', { name: /Unpin/ }).click()
})

