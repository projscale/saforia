import { test, expect } from '@playwright/test'

test('Hold-only-reveal removes toggle button', async ({ page }) => {
  await page.goto('/?test=1')

  // Open settings via switcher
  const switcher = page.getByRole('button').last()
  await switcher.click()
  await page.getByRole('button', { name: /Settings|Настройки|设置/ }).click()

  // Enable hold_only_reveal
  const row = page.getByText(/Hold.*reveal|Только удерживание|仅按住显示/)
  await expect(row).toBeVisible()
  const select = row.locator('xpath=..').getByRole('combobox').first()
  await select.selectOption({ label: /Yes|Да|是/ })

  // Close
  await page.getByRole('button', { name: /Close|Закрыть|关闭/ }).click()

  // Use console to generate a password
  const postfix = page.getByRole('textbox', { name: /Postfix|Постфикс|后缀/ })
  await postfix.fill('hold.reveal')
  const genBtn = page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).last()
  await genBtn.click()
  const viewer = page.getByRole('textbox', { name: /Viewer|Viewer‑пароль/ })
  await viewer.fill('x')
  await page.getByRole('dialog').getByRole('button', { name: /Generate|Сгенерировать|生成/ }).click()

  // Now in output row, ensure there is no toggle Reveal/Hide button
  const toggle = page.getByRole('button', { name: /Reveal|Hide|Показать|Скрыть|显示|隐藏/ })
  await expect(toggle).toHaveCount(0)
})

