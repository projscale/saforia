import { test, expect } from '@playwright/test'

test.describe('Drag-and-drop reordering', () => {
  test('saved entries follow pointer and persist order', async ({ page, baseURL }) => {
    await page.addInitScript(() => { (window as any).SAFORIA_MOCK = true })
    await page.goto(`${baseURL!}/?test=1`)

    // Ensure unified view is visible (after setup in mock mode)
    // If setup appears, quickly configure a dummy master/viewer.
    const setupHeading = page.getByRole('heading', { name: /Initial setup|Первичная настройка|首次设置/ })
    if (await setupHeading.isVisible().catch(() => false)) {
      await page.getByLabel(/Master password|Мастер‑пароль|主密码/).fill('master-123')
      await page.getByLabel(/Confirm master password|Повторите мастер‑пароль|确认主密码/).fill('master-123')
      await page.getByLabel(/Viewer password|Viewer‑пароль|Viewer 密码/).first().fill('viewer-xyz')
      await page.getByLabel(/Confirm viewer password|Повторите viewer‑пароль|确认 Viewer 密码/).fill('viewer-xyz')
      await page.getByRole('button', { name: /Save master|Сохранить мастер|保存主密码/ }).click()
      await expect(page.getByText(/Master password saved|Мастер‑пароль сохранён|主密码已保存/)).toBeVisible()
    }

    const search = page.getByPlaceholder(/Search|Поиск|搜索/)
    await expect(search).toBeVisible()

    const save = page.getByRole('checkbox', { name: /Save|Сохранить|保存/ })
    await save.check()
    const postfix = page.getByRole('textbox', { name: /Postfix|Постфикс|后缀/ })
    const label = page.getByRole('textbox', { name: /Label|Метка|标签/ })
    const gen = page.getByRole('button', { name: /Generate|Сгенерировать|生成/ }).last()

    // Create three named entries so we can assert order
    const names = ['Alpha', 'Bravo', 'Charlie']
    for (const name of names) {
      await postfix.fill(`${name.toLowerCase()}.example`)
      await label.fill(name)
      await gen.click()
      const viewer = page.getByRole('textbox', { name: /Viewer/ })
      await viewer.fill('viewer-xyz')
      await page.getByRole('dialog').getByRole('button', { name: /Generate|Сгенерировать|生成/ }).click()
    }

    // Check initial visual order (Alpha, Bravo, Charlie)
    const rows = page.locator('.list-item:not(.list-header)')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0).getByText('Alpha')).toBeVisible()
    await expect(rows.nth(1).getByText('Bravo')).toBeVisible()
    await expect(rows.nth(2).getByText('Charlie')).toBeVisible()

    // Drag bottom entry (Charlie) to the top using the handle
    const handleOfCharlie = rows.nth(2).getByRole('button', { name: /Drag to reorder|Перетащите, чтобы изменить порядок|拖动以重新排序/ })
    const box = await rows.nth(2).boundingBox()
    const targetBox = await rows.nth(0).boundingBox()
    if (!box || !targetBox) throw new Error('Missing bounding boxes for drag test')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2 - 4)
    await page.mouse.up()

    // New order should be Charlie, Alpha, Bravo
    await expect(rows.nth(0).getByText('Charlie')).toBeVisible()
    await expect(rows.nth(1).getByText('Alpha')).toBeVisible()
    await expect(rows.nth(2).getByText('Bravo')).toBeVisible()

    // Reload page, order should persist
    await page.reload()
    await expect(page.getByPlaceholder(/Search|Поиск|搜索/)).toBeVisible()

    const rowsAfter = page.locator('.list-item:not(.list-header)')
    await expect(rowsAfter).toHaveCount(3)
    await expect(rowsAfter.nth(0).getByText('Charlie')).toBeVisible()
    await expect(rowsAfter.nth(1).getByText('Alpha')).toBeVisible()
    await expect(rowsAfter.nth(2).getByText('Bravo')).toBeVisible()
  })
})
