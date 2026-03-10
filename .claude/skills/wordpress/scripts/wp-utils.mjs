/**
 * WordPress Automation Utilities
 *
 * Reusable functions for WordPress automation via Playwright and REST API.
 *
 * Usage:
 *   import { createBrowser, loginToWordPress, wpApiGet, wpApiPost } from "./wp-utils.mjs";
 */

import "dotenv/config";
import { chromium } from "playwright";

// --- Environment ---

export const WP_SITE_URL = process.env.WP_SITE_URL;
export const WP_USER = process.env.WP_USER;
export const WP_PASS = process.env.WP_PASS;
export const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

// WooCommerce
export const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
export const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;

// --- Browser ---

/**
 * Create a Playwright browser and page with standard settings.
 * @param {Object} opts
 * @param {boolean} [opts.headless=true]
 * @param {number} [opts.width=1400]
 * @param {number} [opts.height=900]
 */
export async function createBrowser({ headless = true, width = 1400, height = 900 } = {}) {
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  return { browser, page };
}

// --- WordPress Login (Browser) ---

/**
 * Log in to WordPress wp-admin via browser.
 * @param {import("playwright").Page} page
 * @param {Object} [opts] - Override credentials
 * @param {string} [opts.siteUrl]
 * @param {string} [opts.user]
 * @param {string} [opts.pass]
 */
export async function loginToWordPress(page, opts = {}) {
  const siteUrl = opts.siteUrl || WP_SITE_URL;
  const user = opts.user || WP_USER;
  const pass = opts.pass || WP_PASS;

  console.log(`Logging in to WordPress at ${siteUrl}...`);
  await page.goto(`${siteUrl}/wp-login.php`);
  await page.waitForLoadState("networkidle");

  await page.fill("#user_login", user);
  await page.fill("#user_pass", pass);
  await page.click("#wp-submit");
  await page.waitForURL("**/wp-admin/**", { timeout: 30000 });
  console.log("Logged in to WordPress.\n");

  // Dismiss any admin notices
  await dismissWpNotices(page);
}

/**
 * Dismiss WordPress admin notices and update nags.
 */
export async function dismissWpNotices(page) {
  await page.evaluate(() => {
    document.querySelectorAll(".notice-dismiss, .update-nag .dismiss").forEach(btn => btn.click());
  }).catch(() => {});
}

// --- WordPress Navigation (Browser) ---

/**
 * Navigate to a wp-admin page and wait for load.
 * @param {string} path - e.g. "/wp-admin/edit.php" or full URL
 */
export async function navigateToWpAdmin(page, path, siteUrl) {
  const base = siteUrl || WP_SITE_URL;
  const url = path.startsWith("http") ? path : `${base}${path}`;
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await dismissWpNotices(page);
}

// --- Screenshots ---

/**
 * Take a full-page screenshot.
 * @param {string} taskFolder - task folder name
 * @param {string} name - screenshot name (without .png)
 */
export async function screenshot(page, taskFolder, name) {
  const path = `c:/Adrian/Code/wp-admin/tasks/${taskFolder}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`Screenshot: ${name}.png`);
  return path;
}

// --- REST API ---

/**
 * Make a GET request to the WordPress REST API.
 * @param {string} endpoint - e.g. "/wp/v2/posts"
 * @param {Object} [params] - Query parameters
 * @param {Object} [opts] - Override credentials
 */
export async function wpApiGet(endpoint, params = {}, opts = {}) {
  const siteUrl = opts.siteUrl || WP_SITE_URL;
  const user = opts.user || WP_USER;
  const appPassword = opts.appPassword || WP_APP_PASSWORD;

  const url = new URL(`${siteUrl}/wp-json${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const headers = {};
  if (user && appPassword) {
    headers["Authorization"] = "Basic " + Buffer.from(`${user}:${appPassword}`).toString("base64");
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`WP API GET ${endpoint} failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    data,
    total: parseInt(response.headers.get("X-WP-Total") || "0"),
    totalPages: parseInt(response.headers.get("X-WP-TotalPages") || "0"),
  };
}

/**
 * Make a POST request to the WordPress REST API.
 * @param {string} endpoint - e.g. "/wp/v2/posts"
 * @param {Object} body - Request body
 * @param {Object} [opts] - Override credentials
 */
export async function wpApiPost(endpoint, body = {}, opts = {}) {
  const siteUrl = opts.siteUrl || WP_SITE_URL;
  const user = opts.user || WP_USER;
  const appPassword = opts.appPassword || WP_APP_PASSWORD;

  const url = `${siteUrl}/wp-json${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
  };
  if (user && appPassword) {
    headers["Authorization"] = "Basic " + Buffer.from(`${user}:${appPassword}`).toString("base64");
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`WP API POST ${endpoint} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch all items from a paginated WP REST API endpoint.
 * @param {string} endpoint - e.g. "/wp/v2/posts"
 * @param {Object} [params] - Base query parameters
 * @param {Object} [opts] - Override credentials
 */
export async function wpApiFetchAll(endpoint, params = {}, opts = {}) {
  let allItems = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const { data, totalPages } = await wpApiGet(endpoint, {
      ...params,
      per_page: 100,
      page: currentPage,
    }, opts);

    allItems = allItems.concat(data);
    hasMore = currentPage < totalPages;
    currentPage++;
  }

  return allItems;
}

// --- WooCommerce API ---

/**
 * Make a GET request to the WooCommerce REST API.
 * @param {string} endpoint - e.g. "/wc/v3/products"
 * @param {Object} [params] - Query parameters
 * @param {Object} [opts] - Override credentials
 */
export async function wcApiGet(endpoint, params = {}, opts = {}) {
  const siteUrl = opts.siteUrl || WP_SITE_URL;
  const key = opts.consumerKey || WC_CONSUMER_KEY;
  const secret = opts.consumerSecret || WC_CONSUMER_SECRET;

  const url = new URL(`${siteUrl}/wp-json${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const headers = {};
  if (key && secret) {
    headers["Authorization"] = "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`WC API GET ${endpoint} failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    data,
    total: parseInt(response.headers.get("X-WP-Total") || "0"),
    totalPages: parseInt(response.headers.get("X-WP-TotalPages") || "0"),
  };
}

// --- Data Export Helpers ---

/**
 * Save data as JSON file in a task folder.
 */
export async function saveJson(taskFolder, filename, data) {
  const { writeFileSync } = await import("fs");
  const path = `c:/Adrian/Code/wp-admin/tasks/${taskFolder}/${filename}`;
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`Saved: ${filename}`);
  return path;
}

/**
 * Save data as CSV file in a task folder.
 * @param {string} taskFolder
 * @param {string} filename
 * @param {string[]} headers - Column headers
 * @param {Array<Object>} rows - Data rows (objects with keys matching headers)
 */
export async function saveCsv(taskFolder, filename, headers, rows) {
  const { writeFileSync } = await import("fs");
  const csvHeader = headers.join(",");
  const csvRows = rows.map(row =>
    headers.map(h => {
      const val = String(row[h] ?? "");
      return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(",")
  );
  const csv = [csvHeader, ...csvRows].join("\n");
  const path = `c:/Adrian/Code/wp-admin/tasks/${taskFolder}/${filename}`;
  writeFileSync(path, csv);
  console.log(`Saved: ${filename}`);
  return path;
}
