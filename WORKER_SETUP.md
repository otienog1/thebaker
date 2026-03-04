# YouTube Cookie Extractor - Redis Worker Setup

This worker service listens for cookie generation requests from your backend servers via Redis, extracts YouTube cookies, and automatically distributes them to the requesting servers.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Backend Server │         │  Backend Server │         │  Backend Server │
│    (Server 1)   │         │    (Server 2)   │         │    (Server 3)   │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │ Redis Request             │ Redis Request             │
         │ (missing cookies)         │ (bot challenge)           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                              ┌──────▼──────┐
                              │    Redis    │
                              │   Server    │
                              └──────┬──────┘
                                     │
                         ┌───────────▼────────────┐
                         │  Cookie Worker         │
                         │  (This Application)    │
                         │                        │
                         │  1. Listen for jobs    │
                         │  2. Launch Chrome      │
                         │  3. Extract cookies    │
                         │  4. SCP to server      │
                         │  5. Fix permissions    │
                         │  6. Restart services   │
                         │  7. Cleanup & wait     │
                         └────────────────────────┘
```

## Prerequisites

1. **Node.js** (v14 or higher)
2. **Chrome/Chromium** browser installed
3. **Redis server** running (shared with your backend servers)
4. **SSH access** to all backend servers
5. **npm packages** installed

## Installation

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `puppeteer` - Browser automation
- `ioredis` - Redis client
- `node-ssh` - SSH/SCP file transfer
- `dotenv` - Environment variables

### 2. Configure Environment Variables

Edit [.env.local](.env.local) with your Redis credentials (already configured):

```env
# Redis Configuration (Shared by all servers)
REDIS_HOST=57.159.27.119
REDIS_PORT=6379
REDIS_USERNAME=mdlworker
REDIS_PASSWORD=tAS7YHDkYRe3sOXjHagnZzFfw0bsY7YM
REDIS_DB=0

# Chrome Configuration
CHROME_DEBUG_PORT=9222
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe  # Windows
# CHROME_PATH=/usr/bin/chromium  # Linux

# Worker Configuration
WORKER_CONCURRENCY=1
JOB_TIMEOUT=300000
MAX_RETRIES=3
LOG_LEVEL=info
COOKIE_OUTPUT_FILE=youtube_cookies.txt
```

### 3. Configure Backend Servers

Edit [servers.json](servers.json) with your backend server details:

```json
{
  "servers": [
    {
      "id": "backend-1",
      "host": "172.234.172.191",
      "port": 22,
      "username": "root",
      "password": "YOUR_SERVER_PASSWORD",
      "cookiePath": "/opt/ytdl/youtube_cookies.txt",
      "cookieOwner": "ytdl",
      "cookieGroup": "ytdl",
      "cookiePermissions": "600",
      "services": [
        "ytdl-worker.service"
      ]
    }
  ]
}
```

**Configuration Fields:**
- `id` - Unique identifier for the server (must match the ID used in Redis requests)
- `host` - Server IP address or hostname
- `port` - SSH port (usually 22)
- `username` - SSH username
- `authMethod` - Authentication method: "password" or "privateKey"
- `password` - SSH password (for password auth)
- `privateKeyPath` - Path to private key file (for key-based auth, e.g., "~/.ssh/id_rsa")
- `cookiePath` - Full path where cookies should be saved on the server
- `cookieOwner` - User that should own the cookie file
- `cookieGroup` - Group that should own the cookie file
- `cookiePermissions` - File permissions (use "600" for security)
- `services` - Array of systemd services to restart after cookie deployment

## Usage

### Start the Worker

```bash
node cookie-worker.js
```

You should see:
```
======================================================================
  YouTube Cookie Extractor - Redis Worker
======================================================================

ℹ Configuration:
ℹ   Redis: 57.159.27.119:6379
ℹ   Queue: youtube:cookie:requests
ℹ   Servers: 3
ℹ   Chrome: C:\Program Files\Google\Chrome\Application\chrome.exe

✓ Connected to Redis
✓ Loaded 3 server configurations
✓ Worker started - listening for jobs...
```

### How It Works

1. **Backend Server Detects Issue**
   - Missing cookie file
   - YouTube "verify you're not a bot" challenge
   - Authentication error

2. **Backend Sends Redis Request**
   ```javascript
   // Backend server code
   await redis.lpush('youtube:cookie:requests', JSON.stringify({
     serverId: 'backend-1',
     requestId: 'req-12345',
     timestamp: Date.now()
   }));
   ```

3. **Worker Processes Request**
   - Receives job from Redis queue
   - Launches Chrome with a unique profile
   - Opens YouTube and waits for manual login (10 seconds)
   - Extracts cookies
   - Saves to Netscape format

4. **Worker Deploys Cookies**
   - Connects to backend server via SSH (supports password or private key auth)
   - Uploads cookie file via SCP
   - Changes ownership: `chown ytdl:ytdl youtube_cookies.txt`
   - Sets permissions: `chmod 600 youtube_cookies.txt` (secure permissions)
   - Restarts services: `systemctl restart ytdl-worker.service`

5. **Worker Cleanup**
   - Closes Chrome
   - Deletes Chrome profile directory
   - Deletes local cookie file
   - Publishes success/failure notification to Redis
   - Waits for next job

### Backend Server Integration

Your backend servers should send requests like this:

```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: '57.159.27.119',
  port: 6379,
  username: 'mdlworker',
  password: 'tAS7YHDkYRe3sOXjHagnZzFfw0bsY7YM',
  db: 0
});

// Send cookie request
async function requestCookieRefresh() {
  const requestId = `req-${Date.now()}`;

  await redis.lpush('youtube:cookie:requests', JSON.stringify({
    serverId: 'backend-1',  // Must match ID in servers.json
    requestId: requestId,
    timestamp: Date.now()
  }));

  console.log('Cookie refresh requested:', requestId);

  // Subscribe to response
  const subscriber = new Redis({
    host: '57.159.27.119',
    port: 6379,
    username: 'mdlworker',
    password: 'tAS7YHDkYRe3sOXjHagnZzFfw0bsY7YM',
    db: 0
  });

  subscriber.subscribe('youtube:cookie:response:backend-1');

  subscriber.on('message', (channel, message) => {
    const response = JSON.parse(message);
    if (response.requestId === requestId) {
      if (response.success) {
        console.log('Cookies updated successfully!');
      } else {
        console.error('Cookie update failed:', response.error);
      }
      subscriber.disconnect();
    }
  });
}

// Call when error occurs
try {
  // Your YouTube download code
} catch (error) {
  if (error.message.includes('Sign in to confirm you're not a bot')) {
    await requestCookieRefresh();
  }
}
```

## Running as a Service

### Windows (NSSM)

1. Download NSSM: https://nssm.cc/download
2. Install service:
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
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /path/to/thebaker/cookie-worker.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable cookie-worker
sudo systemctl start cookie-worker
sudo systemctl status cookie-worker
```

View logs:
```bash
sudo journalctl -u cookie-worker -f
```

## Monitoring

### Check Worker Status
```bash
# View real-time logs
node cookie-worker.js

# Check Redis queue length
redis-cli -h 57.159.27.119 -p 6379 -a tAS7YHDkYRe3sOXjHagnZzFfw0bsY7YM llen youtube:cookie:requests
```

### Test Manual Request
```bash
# Send test job to Redis
redis-cli -h 57.159.27.119 -p 6379 -a tAS7YHDkYRe3sOXjHagnZzFfw0bsY7YM lpush youtube:cookie:requests '{"serverId":"backend-1","requestId":"test-123","timestamp":1234567890}'
```

## Troubleshooting

### Worker Not Connecting to Redis
- Verify Redis credentials in `.env.local`
- Check firewall allows connection to port 6379
- Test connection: `redis-cli -h 57.159.27.119 -p 6379 -a PASSWORD ping`

### Chrome Fails to Launch
- Verify `CHROME_PATH` in `.env.local` points to valid Chrome executable
- On Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- On Linux: `/usr/bin/chromium` or `/usr/bin/google-chrome`

### SSH Connection Failed
- Verify server credentials in `servers.json`
- Test SSH manually: `ssh root@172.234.172.191`
- Check firewall allows SSH on port 22

### Services Not Restarting
- Verify service names in `servers.json` match actual systemd services
- Test manually: `ssh root@172.234.172.191 "systemctl status ytdl-worker.service"`
- Check service user has permissions to restart services

### Cookies Not Working on Server
- Check file permissions: `ls -l /opt/ytdl/youtube_cookies.txt`
- Verify ownership: should be `ytdl:ytdl` or your configured owner
- Check cookie format: should be Netscape format with proper headers

## User Authentication

The worker intelligently handles YouTube authentication:

1. **Chrome launches** and navigates to YouTube
2. **Worker checks authentication** by looking for:
   - Authentication cookies (SSID, SAPISID, etc.)
   - User profile icon/avatar on the page

3. **If NOT authenticated:**
   - Worker displays a prominent warning in the console
   - Chrome window stays open waiting for you to log in
   - Worker checks every 5 seconds if you've logged in
   - Maximum wait time: 5 minutes
   - Once logged in, cookie extraction proceeds automatically

4. **If already authenticated:**
   - Worker immediately extracts cookies
   - No waiting required

**Important:** Keep the Chrome window visible so you can log in when prompted. The worker will wait for you to complete the login process before extracting cookies.

## Security Notes

- **servers.json** contains sensitive credentials - add to `.gitignore`
- Consider using SSH key-based authentication instead of passwords
- Restrict Redis access with username/password
- Use secure passwords for all services
- Regularly rotate credentials

## File Structure

```
thebaker/
├── cookie-worker.js           # Main worker service
├── servers.json               # Server configurations (SENSITIVE)
├── .env.local                 # Environment variables (SENSITIVE)
├── package.json               # Dependencies
├── chrome-profiles/           # Temporary Chrome profiles (auto-created/deleted)
└── WORKER_SETUP.md           # This file
```

## Support

If you encounter issues:
1. Check the worker logs for error messages
2. Verify all configurations in `.env.local` and `servers.json`
3. Test individual components (Redis, SSH, Chrome) separately
4. Check backend server logs for request/response issues
