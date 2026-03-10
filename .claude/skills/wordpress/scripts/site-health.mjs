/**
 * Check WordPress site health and status.
 * Uses browser automation to access wp-admin Site Health page.
 *
 * Usage: node .claude/skills/wordpress/scripts/site-health.mjs [siteUrl] [taskFolder]
 * Requires: WP_SITE_URL, WP_USER, WP_PASS in .env
 */

import { createBrowser, loginToWordPress, navigateToWpAdmin, screenshot, WP_SITE_URL } from "./wp-utils.mjs";

const siteUrl = process.argv[2] || WP_SITE_URL;
const taskFolder = process.argv[3] || "site-health";

if (!siteUrl) {
  console.error("Set WP_SITE_URL in .env or pass as argument.");
  process.exit(1);
}

const { browser, page } = await createBrowser({ headless: true });

try {
  await loginToWordPress(page, { siteUrl });

  // 1. Site Health page
  console.log("=== Site Health Status ===");
  await navigateToWpAdmin(page, "/wp-admin/site-health.php", siteUrl);
  await page.waitForTimeout(3000); // Wait for health checks to run
  await screenshot(page, taskFolder, "01-site-health");

  const healthText = await page.locator("#wpbody-content").textContent().catch(() => "");
  console.log(healthText?.substring(0, 3000));

  // 2. Site Health Info
  console.log("\n=== Site Health Info ===");
  await navigateToWpAdmin(page, "/wp-admin/site-health.php?tab=debug", siteUrl);
  await page.waitForTimeout(2000);
  await screenshot(page, taskFolder, "02-site-health-info");

  // 3. Updates page
  console.log("\n=== Available Updates ===");
  await navigateToWpAdmin(page, "/wp-admin/update-core.php", siteUrl);
  await screenshot(page, taskFolder, "03-updates");

  const updateText = await page.locator("#wpbody-content").textContent().catch(() => "");
  console.log(updateText?.substring(0, 2000));

  console.log("\n=== Health check complete ===");
} finally {
  await browser.close();
}
