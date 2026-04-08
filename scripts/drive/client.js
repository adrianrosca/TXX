/**
 * Authenticated Google client — fetches tokens from dp-brain
 *
 * Set BRAIN_URL and BRAIN_AUTH env vars, or uses defaults:
 *   BRAIN_URL  = https://brain.digitalplattform.dev
 *   BRAIN_AUTH = Basic auth header value (user:pass)
 */

import { google } from 'googleapis';

const BRAIN_URL  = process.env.BRAIN_URL  || 'https://brain.digitalplattform.dev';
const BRAIN_AUTH = process.env.BRAIN_AUTH || '';

async function fetchBrainToken(service = 'drive') {
  const url = `${BRAIN_URL}/api/google/token?service=${service}`;
  const headers = {};
  if (BRAIN_AUTH) headers['Authorization'] = `Basic ${Buffer.from(BRAIN_AUTH).toString('base64')}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get token from brain (${res.status}): ${body}`);
  }
  return res.json();
}

export async function getAuthClient() {
  const { access_token } = await fetchBrainToken('drive');
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token });
  return auth;
}

export async function getDriveClient() {
  return google.drive({ version: 'v3', auth: await getAuthClient() });
}
