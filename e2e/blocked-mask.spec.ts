import { test, expect } from '@playwright/test'

test('Blocked while masked: disable generate/copy actions', async ({ page }) => {
  await page.goto('/?test=1')

  // Open settings via switcher
  const switcher = page.getByRole('button').last()
  await switcher.click()
  await page.getByRole('button', { name: /Settings|Настройки|设置/ }).click()

  // Enable maskSensitive (Yes)
  const label = page.getByText(/Mask sensitive|Скрывать чувствительные|隐藏敏感/)
  await expect(label).toBeVisible()
  const select = label.locator('xpath=..').getByRole('combobox').first()
  await select.selectOption({ label: /Yes|Да|是/ })

  // Close
  await page.getByRole('button', { name: /Close|Закрыть|关闭/ }).click()

  // Console generate should be disabled
  const genBtn = page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).last()
  // Fill postfix to meet other constraints
  const postfix = page.getByRole('textbox', { name: /Postfix|Постфикс|后缀/ })
  await postfix.fill('blocked.test')
  await expect(genBtn).toBeDisabled()

  // Saved row generate should be disabled as well
  const rowGen = page.locator('.list-item:not(.list-header) .icon-btn').first()
  await expect(rowGen).toBeDisabled()
})

