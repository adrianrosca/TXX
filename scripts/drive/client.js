/**
 * Authenticated Google Drive client — reused by all scripts
 */

import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../../');
const CREDENTIALS_PATH = resolve(ROOT, 'credentials.json');
const TOKEN_PATH = resolve(ROOT, 'token.json');

export function getAuthClient() {
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret } = credentials.web;
  const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));

  const auth = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:8765/oauth/callback'
  );
  auth.setCredentials(token);

  // Auto-save refreshed tokens
  auth.on('tokens', (tokens) => {
    const current = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
    const updated = { ...current, ...tokens };
    writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
  });

  return auth;
}

export function getDriveClient() {
  return google.drive({ version: 'v3', auth: getAuthClient() });
}
