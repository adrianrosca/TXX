/**
 * List all posts from a WordPress site via REST API.
 *
 * Usage: node .claude/skills/wordpress/scripts/list-posts.mjs [siteUrl]
 * Requires: WP_SITE_URL (or pass as arg), WP_USER, WP_APP_PASSWORD in .env
 */

import { wpApiFetchAll, WP_SITE_URL } from "./wp-utils.mjs";

const siteUrl = process.argv[2] || WP_SITE_URL;

if (!siteUrl) {
  console.error("Usage: node list-posts.mjs [siteUrl]");
  console.error("Or set WP_SITE_URL in .env");
  process.exit(1);
}

try {
  console.log(`Fetching posts from ${siteUrl}...\n`);
  const posts = await wpApiFetchAll("/wp/v2/posts", { status: "publish" }, { siteUrl });

  console.log(`=== Published Posts (${posts.length}) ===`);
  for (const post of posts) {
    console.log(`  [${post.id}] ${post.title.rendered} (${post.date.substring(0, 10)})`);
  }

  console.log(`\nTotal: ${posts.length} posts`);
} catch (e) {
  console.error("Error:", e.message);

  // Fallback: try without auth (public posts only)
  console.log("\nRetrying without authentication (public posts only)...");
  const response = await fetch(`${siteUrl}/wp-json/wp/v2/posts?per_page=100`);
  const posts = await response.json();

  console.log(`=== Public Posts (${posts.length}) ===`);
  for (const post of posts) {
    console.log(`  [${post.id}] ${post.title.rendered} (${post.date.substring(0, 10)})`);
  }
}
