import { expect, test, type Locator, type Page } from '@playwright/test';

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element is not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function hoverListItem(page: Page, index: number) {
  const item = page.locator('[data-side="RIGHT"] ul > li').nth(index);
  const point = await center(item);
  await page.mouse.move(point.x, point.y, { steps: 5 });
  return item;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-side="RIGHT"] ul > li').first().waitFor();
});

test('the add button stays under the pointer when moving onto it', async ({ page }) => {
  await hoverListItem(page, 0);
  const add = page.getByRole('button', { name: 'コメントを追加' });
  const target = await center(add);

  await page.mouse.move(target.x, target.y, { steps: 20 });
  await page.mouse.down();
  await page.mouse.up();

  await expect(page.getByText('R18 にコメント')).toBeVisible();
});

test('dragging straight down the gutter selects the following blocks', async ({ page }) => {
  await hoverListItem(page, 0);
  const add = page.getByRole('button', { name: 'コメントを追加' });
  const start = await center(add);
  await add.hover();
  const third = await center(page.locator('[data-side="RIGHT"] ul > li').nth(2));

  await page.mouse.down();
  await page.mouse.move(start.x, third.y, { steps: 10 });
  await page.mouse.up();

  await expect(page.getByText('R18〜R20 にコメント')).toBeVisible();
});
