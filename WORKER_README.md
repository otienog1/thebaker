# YouTube Cookie Extractor - Redis Worker Service

Automated cookie extraction and distribution system for your YouTube backend servers.

## Overview

This worker service listens for cookie generation requests from your backend servers via Redis, extracts YouTube cookies using Chrome, and automatically distributes them to the requesting servers via SSH.

### How It Works

```
Backend Error → Redis Request → Worker Receives → Chrome Launches → Cookies Extracted
   ↓                                                                         ↓
Service Restart ← Permissions Fixed ← File Uploaded via SSH ← ─────────────┘
```

## Features

- **Automatic Cookie Extraction** - Launches Chrome and extracts YouTube authentication cookies
- **Redis Queue Management** - Listens for requests from multiple backend servers
- **Automated Distribution** - Transfers cookies via SSH/SCP to requesting servers
- **Permission Management** - Automatically sets correct ownership and permissions
- **Service Restart** - Restarts backend services after cookie deployment
- **Cleanup** - Removes Chrome profiles and temporary files after each job
- **Error Handling** - Retries and notifications for failed operations
- **Multi-Server Support** - Handles requests from multiple backend servers

## Project Structure

```
thebaker/
├── cookie-worker.js                    # Main worker service
├── test-worker.js                      # Test script for setup verification
├── backend-integration-example.js      # Backend integration examples
├── servers.json                        # Server configurations (SENSITIVE)
├── .env.local                          # Environment variables (SENSITIVE)
├── package.json                        # Dependencies
├── WORKER_SETUP.md                     # Detailed setup guide
├── QUICK_START_WORKER.md               # Quick start guide
└── chrome-profiles/                    # Temporary profiles (auto-created/deleted)
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Servers
Edit `servers.json` with your backend server details:
```json
{
  "servers": [
    {
      "id": "backend-1",
      "host": "172.234.172.191",
      "port": 22,
      "username": "root",
      "password": "YOUR_PASSWORD",
      "cookiePath": "/opt/ytdl/youtube_cookies.txt",
      "cookieOwner": "ytdl",
      "cookieGroup": "ytdl",
      "cookiePermissions": "600",
      "services": ["ytdl-worker.service"]
    }
  ]
}
```

### 3. Test Setup
```bash
node test-worker.js
```

### 4. Start Worker
```bash
node cookie-worker.js
```

See [QUICK_START_WORKER.md](QUICK_START_WORKER.md) for detailed instructions.

## Backend Integration

Your backend servers should send Redis requests when they encounter cookie issues:

```javascript
const Redis = require('ioredis');

// Connect to Redis
const redis = new Redis({
  host: '57.159.27.119',
  port: 6379,
  username: 'mdlworker',
  password: 'tAS7YHDkYRe3sOXjHagnZzFfw0bsY7YM',
  db: 0
});

// Request cookie refresh
async function requestCookieRefresh() {
  await redis.lpush('youtube:cookie:requests', JSON.stringify({
    serverId: 'backend-1',
    requestId: `req-${Date.now()}`,
    timestamp: Date.now()
  }));
}

// Use in your error handler
try {
  // Your yt-dlp download code
} catch (error) {
  if (error.message.includes('Sign in to confirm you\'re not a bot')) {
    await requestCookieRefresh();
  }
}
```

See [backend-integration-example.js](backend-integration-example.js) for complete patterns.

## Configuration

### Environment Variables (.env.local)

```env
# Redis Configuration
REDIS_HOST=57.159.27.119
REDIS_PORT=6379
REDIS_USERNAME=mdlworker
REDIS_PASSWORD=tAS7YHDkYRe3sOXjHagnZzFfw0bsY7YM
REDIS_DB=0

# Chrome Configuration
CHROME_DEBUG_PORT=9222
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

# Worker Configuration
WORKER_CONCURRENCY=1
JOB_TIMEOUT=300000
MAX_RETRIES=3
LOG_LEVEL=info
```

### Server Configuration (servers.json)

Each server entry requires:
- `id` - Unique identifier (used in Redis requests)
- `host` - Server IP or hostname
- `port` - SSH port (default 22)
- `username` - SSH username
- `password` - SSH password (or use privateKey)
- `cookiePath` - Full path to cookie file on server
- `cookieOwner` - User that should own the file
- `cookieGroup` - Group that should own the file
- `cookiePermissions` - File permissions (e.g., "644")
- `services` - Array of systemd services to restart

## Workflow

1. **Backend Detects Issue**
   - Missing cookie file
   - YouTube authentication error
   - "Verify you're not a bot" challenge

2. **Backend Sends Request**
   ```javascript
   redis.lpush('youtube:cookie:requests', jobData)
   ```

3. **Worker Processes Job**
   - Receives request from Redis queue
   - Creates unique Chrome profile
   - Launches Chrome (headless=false)
   - Opens YouTube
   - Waits 10 seconds for login if needed
   - Extracts cookies

4. **Worker Deploys Cookies**
   - Connects to server via SSH
   - Uploads cookie file via SCP
   - Changes ownership: `chown ytdl:ytdl cookies.txt`
   - Sets permissions: `chmod 644 cookies.txt`
   - Restarts services: `systemctl restart ytdl-worker.service`

5. **Worker Cleanup**
   - Closes Chrome
   - Deletes Chrome profile
   - Removes local cookie file
   - Publishes success/failure to Redis
   - Waits for next job

## Running as a Service

### Windows (NSSM)
```cmd
nssm install CookieWorker "C:\Program Files\nodejs\node.exe" "C:\path\to\cookie-worker.js"
nssm set CookieWorker AppDirectory "C:\path\to\thebaker"
nssm start CookieWorker
```

### Linux (systemd)
Create `/etc/systemd/system/cookie-worker.service`:
```ini
[Unit]
Description=YouTube Cookie Extractor Worker
After=network.target redis.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/thebaker
ExecStart=/usr/bin/node /path/to/thebaker/cookie-worker.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable cookie-worker
sudo systemctl start cookie-worker
```

## Monitoring

### View Worker Logs
```bash
# If running in terminal
node cookie-worker.js

# If running as systemd service
sudo journalctl -u cookie-worker -f
```

### Check Queue Status
```bash
redis-cli -h 57.159.27.119 -p 6379 -a PASSWORD llen youtube:cookie:requests
```

### Manual Test
```bash
node test-worker.js
```

## Security

- ⚠️ `servers.json` contains SSH passwords - **DO NOT commit to git**
- ⚠️ `.env.local` contains Redis credentials - **DO NOT commit to git**
- ✅ Both files are in `.gitignore`
- Consider using SSH key-based auth instead of passwords
- Use strong passwords for all services
- Restrict Redis access with firewall rules

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Worker can't connect to Redis | Check Redis credentials in `.env.local`<br>Test: `redis-cli -h HOST -p PORT -a PASS ping` |
| SSH connection fails | Verify credentials in `servers.json`<br>Test: `ssh user@host` |
| Chrome won't launch | Check `CHROME_PATH` in `.env.local`<br>Verify Chrome is installed |
| Services won't restart | Check service names in `servers.json`<br>Verify user has sudo/systemctl access |
| Cookies don't work | Check file permissions on server<br>Verify Netscape format (starts with `# Netscape`) |

## Files Created by Worker

- `chrome-profiles/worker-{timestamp}/` - Temporary Chrome profile (deleted after job)
- `youtube_cookies.txt` - Local cookie file (deleted after upload)

## Redis Channels

- **Request Queue**: `youtube:cookie:requests` - Backend servers push jobs here
- **Response Channel**: `youtube:cookie:response:{serverId}` - Worker publishes results here

## Documentation

- [QUICK_START_WORKER.md](QUICK_START_WORKER.md) - Get started in 5 minutes
- [WORKER_SETUP.md](WORKER_SETUP.md) - Detailed setup and configuration
- [backend-integration-example.js](backend-integration-example.js) - Integration patterns

## Requirements

- Node.js v14+
- Chrome/Chromium browser
- Redis server (shared with backends)
- SSH access to backend servers
- Systemd (for service management on servers)

## License

MIT

## Support

For issues or questions:
1. Run `node test-worker.js` to verify setup
2. Check worker logs for error details
3. Verify each component works independently (Redis, SSH, Chrome)
