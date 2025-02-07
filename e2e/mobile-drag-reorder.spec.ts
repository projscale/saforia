import { test, expect } from '@playwright/test'

test.describe('Mobile drag-and-drop reordering', () => {
  test('rows reorder on drag and persist on reload', async ({ page, baseURL }) => {
    await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${baseURL!}/?test=1`)

    // If setup is shown, quickly configure master/viewer
    const setupHeading = page.getByRole('heading', { name: /Initial setup|Первичная настройка|首次设置/ })
    if (await setupHeading.isVisible().catch(() => false)) {
      await page.getByLabel(/Master password|Мастер‑пароль|主密码/).fill('master-123')
      await page.getByLabel(/Confirm master password|Повторите мастер‑пароль|确认主密码/).fill('master-123')
      await page.getByLabel(/Viewer password|Viewer‑пароль|Viewer 密码/).first().fill('viewer-xyz')
      await page.getByLabel(/Confirm viewer password|Повторите viewer‑пароль|确认 Viewer 密码/).fill('viewer-xyz')
      await page.getByRole('button', { name: /Save master|Сохранить мастер|保存主密码/ }).click()
      await expect(page.getByText(/Master password saved|Мастер‑пароль сохранён|主密码已保存/)).toBeVisible()
    }

    // Mobile layout should show search input and list
    const search = page.getByPlaceholder(/Search|Поиск|搜索/)
    await expect(search).toBeVisible()

    // Add three named entries via console (which on mobile is a FAB + sheet)
    const fab = page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).last()

    const names = ['Alpha', 'Bravo', 'Charlie']
    for (const name of names) {
      await fab.click()
      await page.getByRole('textbox', { name: /Postfix|Постфикс|后缀/ }).fill(`${name.toLowerCase()}.m.example`)
      await page.getByRole('textbox', { name: /Label|Метка|标签/ }).fill(name)
      await page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).click()
      const viewer = page.getByRole('textbox', { name: /Viewer/ })
      await viewer.fill('viewer-xyz')
      await page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).click()
      // Close result modal if it appears
      const resultDialog = page.getByRole('dialog', { name: /Generate|Сгенерировать|生成/ })
      if (await resultDialog.isVisible().catch(() => false)) {
        await resultDialog.click() // backdrop click
      }
    }

    const rows = page.locator('.mobile-list .list-item:not(.list-header)')
    await expect(rows).toHaveCount(3)

    // Initial order Alpha, Bravo, Charlie
    await expect(rows.nth(0).getByText('Alpha')).toBeVisible()
    await expect(rows.nth(1).getByText('Bravo')).toBeVisible()
    await expect(rows.nth(2).getByText('Charlie')).toBeVisible()

    // Drag Charlie to the top using the drag handle
    const lastRowBox = await rows.nth(2).boundingBox()
    const firstRowBox = await rows.nth(0).boundingBox()
    if (!lastRowBox || !firstRowBox) throw new Error('Missing bounding boxes for mobile drag test')

    await page.mouse.move(lastRowBox.x + lastRowBox.width - 24, lastRowBox.y + lastRowBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(firstRowBox.x + firstRowBox.width - 24, firstRowBox.y + 4)
    await page.mouse.up()

    // New order should be Charlie, Alpha, Bravo
    await expect(rows.nth(0).getByText('Charlie')).toBeVisible()
    await expect(rows.nth(1).getByText('Alpha')).toBeVisible()
    await expect(rows.nth(2).getByText('Bravo')).toBeVisible()

    // Reload and ensure order persisted
    await page.reload()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByPlaceholder(/Search|Поиск|搜索/)).toBeVisible()

    const rowsAfter = page.locator('.mobile-list .list-item:not(.list-header)')
    await expect(rowsAfter).toHaveCount(3)
    await expect(rowsAfter.nth(0).getByText('Charlie')).toBeVisible()
    await expect(rowsAfter.nth(1).getByText('Alpha')).toBeVisible()
    await expect(rowsAfter.nth(2).getByText('Bravo')).toBeVisible()
  })
})

