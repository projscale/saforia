import { test, expect } from '@playwright/test'

test.describe('Mobile layout: fixed row height + scroll', () => {
  test('method column hidden; rows 32px; scroll when overflowing', async ({ page }) => {
    await page.goto('/?test=1')
    await page.setViewportSize({ width: 375, height: 667 })

    // Ensure settings closed
    const closeBtn = page.getByRole('button', { name: /Close|Закрыть|关闭/ })
    if (await closeBtn.isVisible()) await closeBtn.click()

    // Method column hidden in header on mobile
    const methodHidden = await page.evaluate(() => {
      const header = document.querySelector('.list-header') as HTMLElement | null
      if (!header) return null
      const child = header.children[1] as HTMLElement | undefined
      if (!child) return null
      return getComputedStyle(child).display === 'none'
    })
    expect(methodHidden).toBe(true)

    // Fixed row height
    const rowH = await page.evaluate(() => {
      const row = document.querySelector('.list-item:not(.list-header)') as HTMLElement | null
      const r = row?.getBoundingClientRect()
      return r ? Math.round(r.height) : null
    })
    expect(rowH).toBe(32)

    // Add multiple entries to cause overflow
    const save = page.getByRole('checkbox', { name: /Save|Сохранить|保存/ })
    await save.check()
    const postfix = page.getByRole('textbox', { name: /Postfix|Постфикс|后缀/ })
    const label = page.getByRole('textbox', { name: /Label|Метка|标签/ })
    const gen = page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).last()

    for (let i = 0; i < 7; i++) {
      await postfix.fill(`m${i}.ex`)
      await label.fill(`M${i}`)
      await gen.click()
      const viewer = page.getByRole('textbox', { name: /Viewer|Viewer‑пароль/ })
      await viewer.fill('x')
      await page.getByRole('dialog').getByRole('button', { name: /Generate|Сгенерировать|生成/ }).click()
    }

    // Scroll should be active and row height stays 32
    const result = await page.evaluate(() => {
      const list = document.querySelector('.list-scroll') as HTMLElement | null
      const row = document.querySelector('.list-item:not(.list-header)') as HTMLElement | null
      if (!list || !row) return null
      const lb = list.getBoundingClientRect()
      const rb = row.getBoundingClientRect()
      return { listH: Math.round(lb.height), scrollH: list.scrollHeight, diff: list.scrollHeight - Math.round(lb.height), rowH: Math.round(rb.height) }
    })
    expect(result?.rowH).toBe(32)
    expect((result?.diff ?? 0) > 0).toBeTruthy()
  })
})

