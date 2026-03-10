/**
 * Google Drive OAuth setup — run once to generate token.json
 * Usage: npm run auth
 */

import { google } from 'googleapis';
import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = process.cwd();
const CREDENTIALS_PATH = resolve(ROOT, 'credentials.json');
const TOKEN_PATH = resolve(ROOT, 'token.json');
const REDIRECT_URI = 'http://localhost:8765/oauth/callback';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
const { client_id, client_secret } = credentials.web;

const oauth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n Opening browser for Google authorization...');
console.log('If it does not open, visit this URL manually:\n');
console.log(authUrl);
console.log('\n Waiting for OAuth callback on http://localhost:8765 ...\n');

// Open browser (Windows)
const { exec } = await import('child_process');
exec(`start "" "${authUrl}"`);

// Local server to capture the callback code
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');

  if (url.pathname !== '/oauth/callback') {
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.end(`<h2>Authorization failed: ${error}</h2>`);
    console.error('Authorization failed:', error);
    server.close();
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

    res.end(`
      <h2 style="font-family:sans-serif;color:green"> Authorization successful!</h2>
      <p>token.json saved. You can close this tab and run <code>npm run sync</code></p>
    `);

    console.log(' token.json saved to project root.');
    console.log(' Run: npm run sync\n');
  } catch (err) {
    res.end(`<h2>Error: ${err.message}</h2>`);
    console.error('Token exchange failed:', err.message);
  }

  server.close();
});

server.listen(8765);
