import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("a review permalink reproduces the same generated review in another browser context", async ({ browser }) => {
  const sourceContext = await browser.newContext();
  const sourcePage = await sourceContext.newPage();
  await sourcePage.goto("/");
  await sourcePage.getByRole("combobox", { name: "Movie title" }).fill("tdk");
  await sourcePage.getByRole("button", { name: "Roast it" }).click();
  const openLink = sourcePage.getByRole("link", { name: "Open shareable review" });
  await expect(openLink).toBeVisible({ timeout: 10_000 });
  const href = await openLink.getAttribute("href");
  if (!href) throw new Error("The generated review did not expose a permalink.");
  const sourceReview = {
    body: await sourcePage.getByRole("status", { name: "Review text" }).textContent(),
    rating: await sourcePage.locator(".review-stars").getAttribute("aria-label"),
    username: await sourcePage.locator(".review-user-meta strong").textContent(),
    avatar: await sourcePage.locator(".review-avatar").textContent(),
    poster: await sourcePage.locator(".poster-tile").getAttribute("aria-label"),
  };

  const destinationContext = await browser.newContext();
  const destinationPage = await destinationContext.newPage();
  await destinationPage.goto(new URL(href, sourcePage.url()).toString());
  await expect(destinationPage.locator(".review-card")).toBeVisible({ timeout: 10_000 });
  await expect(destinationPage.getByRole("status", { name: "Review text" })).toHaveText(sourceReview.body ?? "");
  await expect(destinationPage.locator(".review-stars")).toHaveAttribute("aria-label", sourceReview.rating ?? "");
  await expect(destinationPage.locator(".review-user-meta strong")).toHaveText(sourceReview.username ?? "");
  await expect(destinationPage.locator(".review-avatar")).toHaveText(sourceReview.avatar ?? "");
  await expect(destinationPage.locator(".poster-tile")).toHaveAttribute("aria-label", sourceReview.poster ?? "");
  const [download] = await Promise.all([
    destinationPage.waitForEvent("download"),
    destinationPage.getByRole("button", { name: "Save Image" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("the-dark-knight-metacritic-al.png");
  const imagePath = await download.path();
  if (!imagePath) throw new Error("The PNG download did not produce a file.");
  const png = await readFile(imagePath);
  expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  expect(png.readUInt32BE(16)).toBe(2160);
  await sourceContext.close();
  await destinationContext.close();
});
