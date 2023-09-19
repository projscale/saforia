import { test, expect } from '@playwright/test'

test('Console clears inputs after successful generate', async ({ page }) => {
  await page.goto('/?test=1')

  // Ensure settings are closed
  const closeBtn = page.getByRole('button', { name: /Close|Закрыть|关闭/ })
  if (await closeBtn.isVisible()) await closeBtn.click()

  const postfix = page.getByRole('textbox', { name: /Postfix|Постфикс|后缀/ })
  await postfix.fill('clear.me')
  await page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).last().click()

  // viewer prompt
  const viewer = page.getByRole('textbox', { name: /Viewer/ })
  await viewer.fill('x')
  await page.getByRole('dialog').getByRole('button', { name: /Generate|Сгенерировать|生成/ }).click()

  await expect(postfix).toHaveValue('')
})

