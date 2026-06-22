// @ts-check
const path = require("path");
const { expect, test } = require("@playwright/test");

const fixture = (name) => path.join(__dirname, "fixtures", name);

test("builds the courier report from a DPD export", async ({ page }) => {
  await page.goto("/");

  await page.setInputFiles("#file-input", fixture("THE_MOOS_sample.xlsx"));

  await expect(page.locator("#results-area")).toBeVisible();
  const stats = page.locator("#stats-bar");
  await expect(stats).toContainText("Filtrelenen4");
  await expect(stats).toContainText("Hariç tutulan2");
  await expect(stats).toContainText("Kuryeler2");

  const ali = page.locator(".courier-block", { hasText: "Ali Kaya" });
  await expect(ali.locator(".total")).toHaveText("3 teslimat");
  await expect(ali.locator("tbody tr").first()).toContainText("3"); // tour 3 sorts before tour 12
  await expect(page.locator(".courier-block", { hasText: "Ben Müller" }).locator(".total")).toHaveText("1 teslimat");
});

test("collapses and expands a courier", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("#file-input", fixture("THE_MOOS_sample.xlsx"));

  const header = page.locator("#ch-0");
  await header.click();
  await expect(page.locator("#ct-0")).toBeHidden();
  await header.click();
  await expect(page.locator("#ct-0")).toBeVisible();
});

test("downloads the summary as Excel", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("#file-input", fixture("THE_MOOS_sample.xlsx"));

  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#btn-download")]);

  expect(download.suggestedFilename()).toBe("kurye_raporu.xlsx");
});

test("explains which columns are missing", async ({ page }) => {
  await page.goto("/");

  await page.setInputFiles("#file-input", fixture("wrong-columns.xlsx"));

  await expect(page.locator("#error-msg")).toHaveText(/Gerekli sütunlar eksik/);
  await expect(page.locator("#results-area")).toBeHidden();
});

test("starts over with a new file", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("#file-input", fixture("THE_MOOS_sample.xlsx"));

  await page.click("#btn-reset");

  await expect(page.locator("#upload-area")).toBeVisible();
  await expect(page.locator("#results-area")).toBeHidden();
});
