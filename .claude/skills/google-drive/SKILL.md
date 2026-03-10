---
name: google-drive
description: CRUD operations on Google Drive via the ClaudeAccess OAuth app
---

## Summary

- Read, upload, update, delete files and folders on Google Drive
- App: **ClaudeAccess** (project `claudeaccess-489708`)
- Auth: OAuth 2.0 web client, token stored in `txx-master-plan/token.json`
- Scripts: `c:/Adrian/Code/txx–master-plan/scripts/drive/`

## Secrets

System: `gd` | Env: `prod` | Decrypt: `%%KexFlex123`

```bash
cd /c/Adrian/Code/dp && DECRYPT_KEY="%%KexFlex123" npx tsx dp-tools/src/secrets/cli.ts get gd prod
```

Keys:
- `GOOGLE_CLIENT_ID` — OAuth client ID
- `GOOGLE_CLIENT_SECRET` — OAuth client secret
- `GOOGLE_REFRESH_TOKEN` — long-lived refresh token (re-run auth if expired)

## Connection details

| Field | Value |
|---|---|
| Project | claudeaccess-489708 |
| OAuth client | TXX Drive Client (web app) |
| Redirect URI | http://localhost:8765/oauth/callback |
| Scope | https://www.googleapis.com/auth/drive |
| Credentials file | `txx-master-plan/credentials.json` (gitignored) |
| Token file | `txx-master-plan/token.json` (gitignored) |

## Re-auth (if token expires)

```bash
cd /c/Adrian/Code/txx–master-plan
npm run auth
```

## CRUD operations

Scripts live in `c:/Adrian/Code/txx–master-plan/scripts/drive/`.

### List files in a folder
```js
const res = await drive.files.list({
  q: `'<folderId>' in parents and trashed=false`,
  fields: 'files(id, name, mimeType, modifiedTime)',
});
```

### Upload a file
```js
await drive.files.create({
  requestBody: { name: 'filename.md', parents: ['<folderId>'] },
  media: { body: fileContent },
  fields: 'id',
});
```

### Update a file
```js
await drive.files.update({
  fileId: '<fileId>',
  media: { body: newContent },
  fields: 'id',
});
```

### Delete a file
```js
await drive.files.delete({ fileId: '<fileId>' });
```

### Create a folder
```js
await drive.files.create({
  requestBody: {
    name: 'Folder Name',
    mimeType: 'application/vnd.google-apps.folder',
    parents: ['<parentId>'],
  },
  fields: 'id',
});
```

## Notes

- `client.js` exports `getDriveClient()` — use this in any new script
- Token auto-refreshes via OAuth2 `tokens` event
- `credentials.json` and `token.json` are gitignored — never commit them
