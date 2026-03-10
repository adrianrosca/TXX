# WordPress Skill

Use this skill when the user asks to perform any WordPress-related task: managing posts/pages, WooCommerce operations, plugin management, site health checks, content updates, user management, or any WP REST API operations.

## Environment Setup

- Credentials are in `.env` at the project root
- WordPress sites are managed via Plesk — use the Plesk skill for server-level WordPress operations
- Dependencies: `dotenv`, `playwright` (already in package.json)
- All scripts use ES modules (.mjs extension) with top-level await

### Expected .env Variables

```
WP_SITE_URL=https://example.com
WP_USER=admin
WP_PASS=password
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx  # For REST API auth
WC_CONSUMER_KEY=ck_xxx               # WooCommerce (optional)
WC_CONSUMER_SECRET=cs_xxx            # WooCommerce (optional)
```

## Scripts

All scripts live in `.claude/skills/wordpress/scripts/`. **Always import from `wp-utils.mjs`** instead of rewriting login/API code.

| Script | Purpose | Usage |
|---|---|---|
| `wp-utils.mjs` | Shared utilities: login, REST API, WooCommerce, data export | `import { createBrowser, loginToWordPress, ... } from "./wp-utils.mjs"` |
| `list-posts.mjs` | List all published posts via REST API | `node .claude/skills/wordpress/scripts/list-posts.mjs [siteUrl]` |
| `list-plugins.mjs` | List installed plugins via browser | `node .claude/skills/wordpress/scripts/list-plugins.mjs [siteUrl]` |
| `site-health.mjs` | Check site health, debug info, updates | `node .claude/skills/wordpress/scripts/site-health.mjs [siteUrl] [taskFolder]` |

### Available utility functions in `wp-utils.mjs`

**Browser automation:**
- `createBrowser(opts)` — Launch Playwright browser (1400x900 viewport)
- `loginToWordPress(page, opts?)` — Full WP login flow
- `dismissWpNotices(page)` — Close admin notices/update nags
- `navigateToWpAdmin(page, path, siteUrl?)` — Navigate to wp-admin page
- `screenshot(page, taskFolder, name)` — Full-page screenshot to task folder

**REST API:**
- `wpApiGet(endpoint, params?, opts?)` — GET from WP REST API (returns `{ data, total, totalPages }`)
- `wpApiPost(endpoint, body?, opts?)` — POST to WP REST API
- `wpApiFetchAll(endpoint, params?, opts?)` — Fetch all pages from paginated endpoint

**WooCommerce:**
- `wcApiGet(endpoint, params?, opts?)` — GET from WooCommerce REST API

**Data export:**
- `saveJson(taskFolder, filename, data)` — Save JSON to task folder
- `saveCsv(taskFolder, filename, headers, rows)` — Save CSV to task folder

## Two Approaches to WordPress Automation

### 1. Browser Automation (Playwright) — for wp-admin tasks
Best for: visual tasks, plugin configuration, taking screenshots, complex admin workflows

### 2. WP REST API — for data operations
Best for: reading/writing posts, managing users, bulk operations, data export

## WP REST API Reference

### Authentication
WordPress REST API uses Application Passwords:
```
Authorization: Basic base64(user:appPassword)
```

### Common Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/wp-json/wp/v2/posts` | GET | List posts |
| `/wp-json/wp/v2/posts/{id}` | GET/PUT | Single post |
| `/wp-json/wp/v2/posts` | POST | Create post |
| `/wp-json/wp/v2/pages` | GET | List pages |
| `/wp-json/wp/v2/media` | GET | List media |
| `/wp-json/wp/v2/users` | GET | List users |
| `/wp-json/wp/v2/plugins` | GET | List plugins (requires auth) |
| `/wp-json/wp/v2/settings` | GET | Site settings |

### WooCommerce Endpoints

| Endpoint | Purpose |
|---|---|
| `/wp-json/wc/v3/products` | Products |
| `/wp-json/wc/v3/orders` | Orders |
| `/wp-json/wc/v3/customers` | Customers |
| `/wp-json/wc/v3/coupons` | Coupons |
| `/wp-json/wc/v3/reports` | Reports |

### Pagination
WP REST API returns pagination headers: `X-WP-Total` and `X-WP-TotalPages`.
Use `wpApiFetchAll()` to automatically paginate through all results.

## Server Environment (alphanode2)

Most WordPress sites are hosted on **alphanode2** (`13.51.91.179`, m7i-flex.large, 8GB RAM). SSH via ed25519 key from secrets blob.

```bash
# Extract ed25519 key and connect
ssh -i /tmp/ssh_ed25519 ubuntu@13.51.91.179
```

| Detail | Value |
|--------|-------|
| Site docroot | `/var/www/vhosts/<domain>/httpdocs/` |
| File ownership | `<domain>:psacln` |
| WP-CLI | `/usr/local/bin/wp --path=<docroot> --allow-root` |
| PHP versions | 8.1 (default), 7.4 (cycling4gaza.org), 7.1 (mautic.nxtlearning.se) |
| MariaDB | 10.11, ~4.4GB across 40+ databases |
| Nginx fastcgi cache | `/var/cache/nginx/fastcgi/` |
| DB name | In `wp-config.php`: `grep DB_NAME <docroot>/wp-config.php` |

**Cron jobs**: health-check (5min), backup-sites (3am), wp-update-all (4am), backup-report (5am)

**PHP-FPM services**: `php8.1-fpm`, `php7.4-fpm`, `php7.1-fpm`

## WordPress via Plesk

The Plesk panel provides WordPress Toolkit for server-level WP management:
- URL: `${PLESK_URL}/modules/wp-toolkit/index.php/domain/index`
- Can list all WP installations, show versions, update status, security status
- Can update WP core, plugins, themes in bulk

## wp-admin Key URLs

| URL Pattern | Purpose |
|---|---|
| `/wp-admin/` | Dashboard |
| `/wp-admin/edit.php` | All Posts |
| `/wp-admin/edit.php?post_type=page` | All Pages |
| `/wp-admin/upload.php` | Media Library |
| `/wp-admin/plugins.php` | Installed Plugins |
| `/wp-admin/themes.php` | Themes |
| `/wp-admin/users.php` | Users |
| `/wp-admin/options-general.php` | General Settings |
| `/wp-admin/tools.php` | Tools |
| `/wp-admin/site-health.php` | Site Health |
| `/wp-admin/update-core.php` | Updates |
| `/wp-admin/edit.php?post_type=product` | WooCommerce Products |
| `/wp-admin/admin.php?page=wc-orders` | WooCommerce Orders |
| `/wp-admin/admin.php?page=wc-settings` | WooCommerce Settings |

## WP Admin Selectors

| Selector | Element |
|---|---|
| `#user_login` | Login username |
| `#user_pass` | Login password |
| `#wp-submit` | Login button |
| `#wpadminbar` | Admin toolbar |
| `#adminmenu` | Left sidebar menu |
| `.wrap` | Main content wrapper |
| `#wpbody-content` | Body content area |
| `.notice` | Admin notices |
| `#wp-content-editor-container` | Classic editor |
| `.block-editor` | Gutenberg editor |

## Best Practices

### Screenshot Naming
Same as Plesk: `{NN}-{description}.png`, always `fullPage: true`.

### Data Export
When retrieving data, use `saveJson()` or `saveCsv()` from wp-utils to save to the task folder.

## Debugging WordPress Issues

1. **White Screen of Death**: Check PHP error logs via Plesk logs
2. **Plugin conflicts**: Deactivate all plugins, reactivate one by one
3. **Memory issues**: Check `memory_limit` in PHP settings via Plesk
4. **502 errors**: Usually PHP-FPM issue — check Plesk Services Management
5. **Slow site**: Check for large database queries, unoptimized images, too many plugins
6. **Login issues**: Try `/wp-login.php?action=lostpassword` or use Plesk WP Toolkit
