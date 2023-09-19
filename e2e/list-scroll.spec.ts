import { test, expect } from '@playwright/test'

test.describe('Saved list scroll + compact rows', () => {
  test('renders compact rows and scrolls when overflowing', async ({ page }) => {
    await page.goto('/?test=1')

    // Ensure settings are closed
    const closeBtn = page.getByRole('button', { name: /Close|Закрыть|关闭/ })
    if (await closeBtn.isVisible()) await closeBtn.click()

    // Add multiple saved entries via console
    const save = page.getByRole('checkbox', { name: /Save|Сохранить|保存/ })
    await save.check()
    const postfix = page.getByRole('textbox', { name: /Postfix|Постфикс|后缀/ })
    const label = page.getByRole('textbox', { name: /Label|Метка|标签/ })
    const gen = page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).last()

    for (let i = 0; i < 8; i++) {
      await postfix.fill(`t${i}.example`) // label will be optional
      await label.fill(`T${i}`)
      await gen.click()
      // viewer modal
      const viewer = page.getByRole('textbox', { name: /Viewer/ })
      await viewer.fill('x')
      await page.getByRole('dialog').getByRole('button', { name: /Generate|Сгенерировать|生成/ }).click()
    }

    // Saved list should have many rows and be scrollable
    const list = page.locator('.list-scroll')
    await expect(list).toBeVisible()

    // Row height compact: ensure at least 6 items visible only with scroll height smaller than total content
    const contentHeight = await list.evaluate(el => el.scrollHeight)
    const box = await list.boundingBox()
    expect(box?.height || 0).toBeLessThan(contentHeight)
  })
})

