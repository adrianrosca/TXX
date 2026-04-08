/**
 * TXX Master Plan — Google Drive sync
 * Syncs all markdown + output files to a "TXX Master Plan" folder on Drive
 *
 * Usage:
 *   npm run sync          — full sync (create/update)
 *   npm run sync:dry      — preview changes without uploading
 */

import { google } from 'googleapis';
import { readFileSync, statSync, readdirSync } from 'fs';
import { resolve, extname, basename } from 'path';

const ROOT = process.cwd();
const DRY_RUN = process.argv.includes('--dry-run');
const DRIVE_ROOT_FOLDER = 'TXX Master Plan';

// Files/folders to sync (relative to ROOT)
const SYNC_PATHS = [
  '00-summary',
  '01-txx-architecture',
  '02-ux-first-process',
  '03-ai-workflow',
  '_output/presentations',
];

const ALLOWED_EXTENSIONS = new Set(['.md', '.html', '.pdf', '.pptx', '.py', '.txt']);

// ── Auth (via dp-brain) ──────────────────────────────────────────────────────

import { getAuthClient } from './client.js';

const auth = await getAuthClient();
const drive = google.drive({ version: 'v3', auth });

// ── Drive helpers ─────────────────────────────────────────────────────────────

async function findOrCreateFolder(name, parentId = null) {
  if (DRY_RUN) {
    console.log(`  [DRY] Would find/create folder: ${name}`);
    return `dry-${name}`;
  }

  const query = [
    `mimeType='application/vnd.google-apps.folder'`,
    `name='${name}'`,
    `trashed=false`,
    parentId ? `'${parentId}' in parents` : `'root' in parents`,
  ].join(' and ');

  const res = await drive.files.list({ q: query, fields: 'files(id, name)' });

  if (res.data.files.length > 0) return res.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : ['root'],
    },
    fields: 'id',
  });

  console.log(`  Created folder: ${name}`);
  return folder.data.id;
}

async function findFile(name, parentId) {
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
  });
  return res.data.files[0] || null;
}

async function uploadFile(localPath, parentId) {
  const name = basename(localPath);

  if (DRY_RUN) {
    console.log(`  [DRY] Would upload: ${name}`);
    return;
  }

  const content = readFileSync(localPath);
  const existing = await findFile(name, parentId);

  if (existing) {
    const localMtime = statSync(localPath).mtime;
    const driveMtime = new Date(existing.modifiedTime);

    if (localMtime <= driveMtime) {
      console.log(`  Skipped (up to date): ${name}`);
      return;
    }

    await drive.files.update({
      fileId: existing.id,
      media: { body: content },
      fields: 'id',
    });
    console.log(`  Updated: ${name}`);
  } else {
    await drive.files.create({
      requestBody: { name, parents: [parentId] },
      media: { body: content },
      fields: 'id',
    });
    console.log(`  Uploaded: ${name}`);
  }
}

async function deleteFile(fileId, name) {
  if (DRY_RUN) {
    console.log(`  [DRY] Would delete: ${name}`);
    return;
  }
  await drive.files.delete({ fileId });
  console.log(`  Deleted: ${name}`);
}

// ── Sync logic ────────────────────────────────────────────────────────────────

async function syncDirectory(localDir, driveFolderId) {
  const entries = readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath = resolve(localDir, entry.name);

    if (entry.isDirectory()) {
      const subFolderId = await findOrCreateFolder(entry.name, driveFolderId);
      await syncDirectory(localPath, subFolderId);
    } else if (ALLOWED_EXTENSIONS.has(extname(entry.name))) {
      await uploadFile(localPath, driveFolderId);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nTXX Master Plan — Google Drive Sync`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  const rootFolderId = await findOrCreateFolder(DRIVE_ROOT_FOLDER);
  console.log(`Drive folder: ${DRIVE_ROOT_FOLDER} (${rootFolderId})\n`);

  for (const syncPath of SYNC_PATHS) {
    const localPath = resolve(ROOT, syncPath);
    const folderName = syncPath.replace('_output/', '');
    console.log(`Syncing: ${syncPath}`);
    const folderId = await findOrCreateFolder(folderName, rootFolderId);
    await syncDirectory(localPath, folderId);
  }

  console.log('\nSync complete.\n');
}

main().catch((err) => {
  console.error('\nSync failed:', err.message);
  if (err.message.includes('token')) {
    console.error('Token may be expired. Run: npm run auth\n');
  }
  process.exit(1);
});
