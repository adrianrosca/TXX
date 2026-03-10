/**
 * List installed plugins on a WordPress site.
 * Uses browser automation (requires wp-admin access) since the REST API
 * plugin endpoint requires authentication.
 *
 * Usage: node .claude/skills/wordpress/scripts/list-plugins.mjs [siteUrl]
 * Requires: WP_SITE_URL, WP_USER, WP_PASS in .env
 */

import { createBrowser, loginToWordPress, navigateToWpAdmin, WP_SITE_URL } from "./wp-utils.mjs";

const siteUrl = process.argv[2] || WP_SITE_URL;

if (!siteUrl) {
  console.error("Set WP_SITE_URL in .env or pass as argument.");
  process.exit(1);
}

const { browser, page } = await createBrowser({ headless: true });

try {
  await loginToWordPress(page, { siteUrl });
  await navigateToWpAdmin(page, "/wp-admin/plugins.php", siteUrl);

  // Extract plugin data from the plugins table
  const plugins = await page.$$eval("#the-list tr", (rows) =>
    rows.map(row => {
      const name = row.querySelector(".plugin-title strong")?.textContent?.trim();
      const description = row.querySelector(".plugin-description")?.textContent?.trim()?.substring(0, 100);
      const isActive = row.classList.contains("active");
      const version = row.querySelector(".plugin-version-author-uri")?.textContent?.match(/Version ([\d.]+)/)?.[1];
      return name ? { name, version: version || "unknown", active: isActive, description } : null;
    }).filter(Boolean)
  );

  const active = plugins.filter(p => p.active);
  const inactive = plugins.filter(p => !p.active);

  console.log(`=== Active Plugins (${active.length}) ===`);
  for (const p of active) console.log(`  ${p.name} v${p.version}`);

  if (inactive.length > 0) {
    console.log(`\n=== Inactive Plugins (${inactive.length}) ===`);
    for (const p of inactive) console.log(`  ${p.name} v${p.version}`);
  }

  console.log(`\nTotal: ${plugins.length} (${active.length} active, ${inactive.length} inactive)`);
} finally {
  await browser.close();
}
