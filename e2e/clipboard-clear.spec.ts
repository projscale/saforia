import { test, expect } from '@playwright/test'

test('Clipboard clears after timeout and extend delays it', async ({ page, context }) => {
  await page.goto('/?test=1')

  // Close settings if visible
  const closeBtn = page.getByRole('button', { name: /Close|Закрыть|关闭/ })
  if (await closeBtn.isVisible()) await closeBtn.click()

  // Set auto-clear to short value if exposed in UI (fallback: assume default ~30s)
  const postfix = page.getByRole('textbox', { name: /Postfix|Постфикс|后缀/ }).first()
  await postfix.fill('clipboard.test')
  await page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).last().click()

  const viewer = page.getByRole('textbox', { name: /Viewer/ })
  await viewer.fill('x')
  await page.getByRole('dialog').getByRole('button', { name: /Generate|Сгенерировать|生成/ }).click()

  // Copy from modal
  await page.getByRole('button', { name: /Copy|Копировать|复制/ }).click()

  // Read clipboard (Playwright context grants access in headed/headless)
  const clip1 = await context.clipboard().readText()
  expect(clip1.length).toBeGreaterThan(0)

  // Extend to delay clearing, then wait a bit and ensure still present
  await page.getByRole('button', { name: /Extend|Продлить|延长/ }).click()
  await page.waitForTimeout(1500)
  const clip2 = await context.clipboard().readText()
  expect(clip2).toBe(clip1)

  // Wait for clear (long enough to exceed default clear even after extend)
  await page.waitForTimeout(35000)
  const clip3 = await context.clipboard().readText()
  expect(clip3).not.toBe(clip1)
})
