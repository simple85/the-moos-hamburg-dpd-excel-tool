// @ts-check
const { expect, test } = require("@playwright/test");

// Every page of the site; each one is checked for the basics a visitor would notice.
const PAGES = ["/"];

for (const path of PAGES) {
  test.describe(path, () => {
    test("loads with a title and without script errors", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));

      const res = await page.goto(path);

      expect(res?.status()).toBe(200);
      expect((await page.title()).trim()).not.toBe("");
      await expect(page.locator("h1").first()).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("has no broken internal links or images", async ({ page, request }) => {
      await page.goto(path);
      const base = new URL(page.url());

      const urls = await page.evaluate(() => [
        ...[...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
        ...[...document.querySelectorAll("img[src]")].map((i) => i.getAttribute("src")),
        ...[...document.querySelectorAll('link[rel="stylesheet"][href], script[src]')].map((e) => e.getAttribute("href") || e.getAttribute("src")),
      ]);
      const internal = [...new Set(urls)]
        .filter((u) => u && !/^(https?:|mailto:|tel:|#|javascript:|data:)/.test(u))
        .map((u) => new URL(u, base).pathname);

      for (const url of internal) {
        const res = await request.get(url);
        expect(res.status(), `${url} linked from ${path}`).toBeLessThan(400);
      }
    });

    test("fits the screen without horizontal scrolling", async ({ page }) => {
      await page.goto(path);

      // try to scroll sideways the way a visitor would; the page must not move
      const scrolledX = await page.evaluate(async () => {
        window.scrollTo(500, 0);
        await new Promise((r) => requestAnimationFrame(r));
        return window.scrollX;
      });
      expect(scrolledX).toBe(0);
    });
  });
}
