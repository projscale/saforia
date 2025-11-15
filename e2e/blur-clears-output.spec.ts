import { test, expect } from '@playwright/test'

test('Output hides on window blur', async ({ page }) => {
  await page.goto('/?test=1')

  // Close settings if open
  const closeBtn = page.getByRole('button', { name: /Close|Закрыть|关闭/ })
  if (await closeBtn.isVisible()) await closeBtn.click()

  // Generate once
  const postfix = page.getByRole('textbox', { name: /Postfix|Постфикс|后缀/ }).first()
  await postfix.fill('blur-test')
  await page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).last().click()

  const viewer = page.getByRole('textbox', { name: /Viewer/ })
  await viewer.fill('x')
  await page.getByRole('dialog').getByRole('button', { name: /Generate|Сгенерировать|生成/ }).click()

  // Modal should be visible
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()

  // Fire blur and ensure modal closes and output is gone
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(modal).toBeHidden()
})
