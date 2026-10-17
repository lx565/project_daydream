# Google Apps Script (sheet webhook)

The script lives in Google, not here: open the sheet
https://docs.google.com/spreadsheets/d/17tKH6FBX1vsEFtz0EV7wY_np2WGZOYgZUo1D1kDfzJY/edit
then Extensions → Apps Script. `Code.gs` in this folder is the source of truth; re-paste it from here if the deployed copy is ever lost or overwritten (this is how feedback handling was silently dropped from 2026-09-10).

## Web-app URL
Hardcoded in three places:
- `app/api/feedback/route.ts`
- `app/api/track/birth/route.ts`
- `lib/sheetsWebhook.ts` (used by `app/api/email/report`)

## Updating safely
部署 → 管理部署 → click the pencil on the EXISTING deployment → 版本: 新版本 → 部署.

NEVER use 新增部署: it mints a new URL and silently breaks all three places.

## Sheet tabs written
- `births` (type `birth`)
- `emails` (type `email_report`)
- `feedback` (everything else: feedback)

Caveat: if the sheet already had a differently named feedback tab, the deployed script may name it differently; the repo copy uses `feedback`.

The script returns `{"ok":true}`; `/api/feedback` treats anything else as a failure (the message is still kept in the Vercel KV list `feedback:backup`).
