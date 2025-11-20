import { test, expect } from '@playwright/test'

test('Extend adds time to auto-close timer', async ({ page }) => {
  await page.goto('/?test=1')

  const closeBtn = page.getByRole('button', { name: /Close|Закрыть|关闭/ })
  if (await closeBtn.isVisible()) await closeBtn.click()

  const postfix = page.getByRole('textbox', { name: /Postfix|Постфикс|后缀/ }).first()
  await postfix.fill('timer.test')
  await page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).last().click()

  const viewer = page.getByRole('textbox', { name: /Viewer/ })
  await viewer.fill('x')
  await page.getByRole('dialog').getByRole('button', { name: /Generate|Сгенерировать|生成/ }).click()

  const timerText = page.getByText(/Auto-close in|Авто|自动关闭/)
  await expect(timerText).toBeVisible()

  const before = await timerText.textContent()
  await page.getByRole('button', { name: /Extend|Продлить|延长/ }).click()
  const after = await timerText.textContent()

  // After extend, the seconds should be greater (reset upwards)
  const num = (s?: string | null) => (s?.match(/(\d+)/)?.[1] ? parseInt(s!.match(/(\d+)/)![1], 10) : 0)
  expect(num(after)).toBeGreaterThan(num(before))
})
