# Multi-Account Cookie Setup

## Problem
Using the same YouTube account cookies across multiple servers (different IPs) triggers YouTube's anti-bot detection because it appears as if one account is being accessed from multiple locations simultaneously.

## Solution
Each server now uses a **separate YouTube account** with its own Chrome profile for cookie generation.

## Configuration

### servers.json
Each server has a `chromeProfile` field that specifies which Chrome profile to use:

```json
{
  "id": "backend-1",
  "chromeProfile": "account-1",  // Uses chrome-profiles/account-1/
  ...
}
```

### Chrome Profiles
- **backend-1** → `chrome-profiles/account-1/` → Account 1
- **backend-2** → `chrome-profiles/account-2/` → Account 2
- **backend-3** → `chrome-profiles/account-3/` → Account 3

## Setup Instructions

### First Time Setup (Per Server)

1. **Start cookie worker**:
   ```bash
   cd thebaker
   node cookie-worker.js
   ```

2. **Trigger cookie refresh** for a specific server to set up its account.

3. **Chrome will open** for that server's profile (e.g., `account-1`).

4. **Sign in to YouTube** with a UNIQUE account for that server:
   - backend-1: Use YouTube Account #1
   - backend-2: Use YouTube Account #2
   - backend-3: Use YouTube Account #3

5. **Press ENTER** in the terminal to generate cookies.

6. **Repeat** for each server (you'll need to trigger refresh for each server ID).

## Important Notes

- ✅ **Use 3 different YouTube accounts** - one for each server
- ✅ **Keep Chrome profiles separate** - never mix them
- ✅ **Each account stays logged in** - Chrome profile persists login state
- ⚠️ **Never share accounts between servers** - this defeats the purpose
- ⚠️ **Cookie files are still deployed to the same path** on each server (`/opt/ytdl/youtube_cookies.txt`)

## How It Works

1. Cookie refresh job is queued for `backend-1`
2. Worker reads `servers.json` and finds `chromeProfile: "account-1"`
3. Opens Chrome with profile `chrome-profiles/account-1/`
4. Account 1 login is preserved in this profile
5. Generates cookies from Account 1
6. Deploys cookies to backend-1 server

Same process happens independently for backend-2 (Account 2) and backend-3 (Account 3).

## Benefits

✅ **No more bot detection** - Each IP uses a different account
✅ **Independent sessions** - One account getting flagged doesn't affect others
✅ **Persistent logins** - Each profile remembers its login
✅ **Scalable** - Can add more servers/accounts easily
