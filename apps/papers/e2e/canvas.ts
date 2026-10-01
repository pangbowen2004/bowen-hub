import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** 从实际画布识别墨绿论文节点，再用真实浏览器鼠标点击。 */
async function paperPixel(page: Page, canvas: Locator) {
  const png = await canvas.screenshot({ scale: "css" });
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const buffer = document.createElement("canvas");
    buffer.width = image.width;
    buffer.height = image.height;
    const context = buffer.getContext("2d");
    if (!context) throw Error("No 2D screenshot decoder");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let count = 0,
      x = 0,
      y = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const r = pixels[offset] ?? 0,
        g = pixels[offset + 1] ?? 0,
        b = pixels[offset + 2] ?? 0;
      if (r < 120 && g - r > 12 && g - b > 5) {
        count++;
        const pixel = offset / 4;
        x += pixel % image.width;
        y += Math.floor(pixel / image.width);
      }
    }
    return count ? { x: x / count, y: y / count } : null;
  }, png.toString("base64"));
}
export async function clickPaintedPaper(page: Page, canvas: Locator, hoverLabel?: string) {
  let previous: { x: number; y: number } | null = null;
  let position: { x: number; y: number } | null = null;
  let stable = 0;
  await expect
    .poll(
      async () => {
        position = await paperPixel(page, canvas);
        if (
          position &&
          previous &&
          Math.hypot(position.x - previous.x, position.y - previous.y) < 0.5
        )
          stable++;
        else stable = 0;
        previous = position;
        return stable;
      },
      {
        timeout: 20000,
        intervals: [100, 250, 500],
        message: "wait for a stable painted paper node before physical mouse click",
      },
    )
    .toBeGreaterThanOrEqual(2);
  if (!position) throw Error("Painted paper node not found");
  const box = await canvas.boundingBox();
  if (!box) throw Error("Canvas bounds unavailable");
  const point = position as { x: number; y: number };
  await page.mouse.move(box.x + point.x, box.y + point.y);
  if (hoverLabel) await expect(canvas.getByText(hoverLabel, { exact: true })).toBeVisible();
  else
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  await page.mouse.click(box.x + point.x, box.y + point.y);
}
