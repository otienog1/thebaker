# Quick Start Guide - Cookie Worker

Get your cookie worker up and running in 5 minutes!

## Step 1: Install Dependencies (1 minute)

```bash
npm install
```

## Step 2: Configure Servers (2 minutes)

Edit `servers.json` and add your backend server details:

```json
{
  "servers": [
    {
      "id": "backend-1",
      "host": "172.234.172.191",
      "port": 22,
      "username": "root",
      "authMethod": "password",
      "password": "YOUR_PASSWORD",
      "cookiePath": "/opt/ytdl/youtube_cookies.txt",
      "cookieOwner": "root",
      "cookieGroup": "root",
      "cookiePermissions": "600",
      "services": ["ytdl-worker.service"]
    },
    {
      "id": "backend-2",
      "host": "34.57.68.120",
      "port": 22,
      "username": "7plus8",
      "authMethod": "privateKey",
      "privateKeyPath": "~/.ssh/google_compute_engine",
      "cookiePath": "/opt/ytdl/youtube_cookies.txt",
      "cookieOwner": "7plus8",
      "cookieGroup": "7plus8",
      "cookiePermissions": "600",
      "services": ["ytdl-worker.service"]
    }
  ]
}
```

**Authentication Methods:**
- **Password auth**: Set `authMethod: "password"` and provide `password`
- **Private key auth**: Set `authMethod: "privateKey"` and provide `privateKeyPath`
- Use `~/.ssh/keyname` for paths (~ will be expanded automatically)

## Step 3: Test Connection (1 minute)

```bash
node test-worker.js
```

This will verify:
- Redis connection works
- SSH connections to all servers work
- Directories and services exist

## Step 4: Start Worker (1 minute)

```bash
node cookie-worker.js
```

You should see:
```
✓ Connected to Redis
✓ Worker started - listening for jobs...
```

## Step 5: Send Test Job (Optional)

In another terminal:

```bash
node test-worker.js
# Select "yes" when asked to send test job
# Choose your server
```

Or manually:

```bash
redis-cli -h 57.159.27.119 -p 6379 -a tAS7YHDkYRe3sOXjHagnZzFfw0bsY7YM \
  lpush youtube:cookie:requests '{"serverId":"backend-1","requestId":"test-123","timestamp":1234567890}'
```

## What Happens Next?

1. Worker receives the job
2. Chrome launches automatically
3. Worker checks if you're logged into YouTube
4. **If NOT logged in:**
   - Console shows a warning message
   - Chrome stays open waiting for you to log in
   - Worker checks every 5 seconds until you complete login (max 5 minutes)
5. **Once authenticated:** Worker extracts cookies
6. Uploads to your server via SSH (supports password or private key)
7. Sets secure permissions (chmod 600) and ownership
8. Restarts backend services
9. Cleans up Chrome profile and waits for next job

## Backend Integration

Add this to your backend server (where yt-dlp runs):

```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: '57.159.27.119',
  port: 6379,
  username: 'mdlworker',
  password: 'tAS7YHDkYRe3sOXjHagnZzFfw0bsY7YM',
  db: 0
});

// When you get cookie error:
try {
  // Your yt-dlp code
} catch (error) {
  if (error.message.includes('Sign in to confirm')) {
    // Request new cookies
    await redis.lpush('youtube:cookie:requests', JSON.stringify({
      serverId: 'backend-1',  // Your server ID from servers.json
      requestId: `req-${Date.now()}`,
      timestamp: Date.now()
    }));

    console.log('Cookie refresh requested');
  }
}
```

See [backend-integration-example.js](backend-integration-example.js) for complete examples.

## Running 24/7

### Windows (NSSM)
```cmd
nssm install CookieWorker "C:\Program Files\nodejs\node.exe" "C:\path\to\cookie-worker.js"
nssm start CookieWorker
```

### Linux (systemd)
```bash
sudo nano /etc/systemd/system/cookie-worker.service
# Paste service configuration from WORKER_SETUP.md
sudo systemctl enable cookie-worker
sudo systemctl start cookie-worker
```

## Troubleshooting

**Worker won't connect to Redis?**
- Check `.env.local` has correct Redis credentials
- Test: `redis-cli -h 57.159.27.119 -p 6379 -a PASSWORD ping`

**SSH connection fails?**
- Verify server credentials in `servers.json`
- Test: `ssh root@YOUR_SERVER_IP`

**Chrome won't launch?**
- Check `CHROME_PATH` in `.env.local`
- Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- Linux: `/usr/bin/chromium`

**Cookies don't work on server?**
- Check file exists: `ls -l /opt/ytdl/youtube_cookies.txt`
- Check ownership: should match `cookieOwner:cookieGroup`
- Check format: should start with `# Netscape HTTP Cookie File`

## Next Steps

- Read [WORKER_SETUP.md](WORKER_SETUP.md) for detailed documentation
- Check [backend-integration-example.js](backend-integration-example.js) for integration patterns
- Monitor logs: `journalctl -u cookie-worker -f` (Linux) or view NSSM logs (Windows)

## Support

If you need help:
1. Check worker logs for error messages
2. Run `node test-worker.js` to verify setup
3. Test each component separately (Redis, SSH, Chrome)
