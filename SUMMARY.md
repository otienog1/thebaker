# Cookie Extractor - Summary

## What Is This?

A **standalone Node.js tool** that extracts YouTube authentication cookies using Puppeteer. Works with any yt-dlp project.

## Why You Need It

YouTube blocks downloads with errors like:
```
Sign in to confirm you're not a bot
ERROR: This video requires authentication
```

This tool solves that by extracting your browser's YouTube cookies so yt-dlp can authenticate as you.

## Quick Start (3 Minutes)

```bash
# 1. Install
cd cookie-extractor
npm install

# 2. Extract cookies
node extract-youtube-cookies.js

# 3. Browser opens → Log into YouTube → Press ENTER
# Done! Cookies saved to youtube_cookies.txt
```

## Use with yt-dlp

```bash
yt-dlp --cookies youtube_cookies.txt https://youtube.com/shorts/VIDEO_ID
```

## Use with Python

```python
ydl_opts = {
    'cookiefile': 'youtube_cookies.txt',
}
```

## Upload to Server

```bash
scp youtube_cookies.txt root@server:/opt/app/
ssh root@server "chmod 600 /opt/app/youtube_cookies.txt"
ssh root@server "systemctl restart your-service"
```

## Features

✅ **Standalone** - Works with ANY yt-dlp project
✅ **Simple** - Just run, log in, press ENTER
✅ **Universal** - Windows, Mac, Linux
✅ **CLI Options** - Custom output file (`-o file.txt`)
✅ **Netscape Format** - Standard cookie format
✅ **Secure** - Uses your own Google account

## vs Local Proxy

| Feature | Cookie Extractor ⭐ | Local Proxy |
|---------|-------------------|-------------|
| Setup Time | 3 minutes | 10+ minutes |
| Port Forwarding | ❌ Not needed | ✅ Required |
| ISP Restrictions | ❌ No issues | ⚠️ May be blocked |
| Cookie Lifetime | 30-90 days | N/A |
| Maintenance | Re-run every 2-3 months | Run 24/7 |
| Complexity | Low | Medium-High |

**Recommendation:** Use cookie extractor unless you have specific needs for a proxy.

## CLI Options

```bash
# Default output
node extract-youtube-cookies.js

# Custom output file
node extract-youtube-cookies.js -o /path/to/cookies.txt

# Show help
node extract-youtube-cookies.js --help
```

## Cookie Lifetime

- Cookies last **30-90 days**
- You'll know they expired when yt-dlp shows auth errors again
- Just re-run the tool (takes 2-3 minutes)

## Security

```bash
# Protect cookie file (Linux/Mac)
chmod 600 youtube_cookies.txt

# Add to .gitignore
echo "youtube_cookies.txt" >> .gitignore
```

## Common Use Cases

### 1. YouTube Downloader App

```bash
# Extract once
node extract-youtube-cookies.js -o /opt/app/youtube_cookies.txt

# App uses cookies automatically
# Re-run every 30-90 days when cookies expire
```

### 2. Development/Testing

```bash
# Extract to project directory
cd my-project
node /path/to/cookie-extractor/extract-youtube-cookies.js

# Test immediately
yt-dlp --cookies youtube_cookies.txt https://youtube.com/shorts/TEST
```

### 3. Multiple Servers

```bash
# Extract once
node extract-youtube-cookies.js

# Upload to multiple servers
scp youtube_cookies.txt server1:/opt/app/
scp youtube_cookies.txt server2:/opt/app/
scp youtube_cookies.txt server3:/opt/app/
```

### 4. CI/CD Pipeline

```bash
# Extract locally
node extract-youtube-cookies.js -o prod-cookies.txt

# Store as secret in CI/CD
# Deploy with your application
```

## How It Works

```
1. Launches Chrome with Puppeteer
   ↓
2. Opens YouTube.com
   ↓
3. You log in manually
   ↓
4. Extracts all cookies
   ↓
5. Filters YouTube/Google cookies
   ↓
6. Converts to Netscape format
   ↓
7. Saves to file
```

## Troubleshooting

### "No cookies found"
- Make sure you actually logged in
- Wait for page to fully load
- Then press ENTER

### "Chromium not downloaded"
```bash
npm install puppeteer --force
```

### Can't run on server
Extract locally and upload:
```bash
node extract-youtube-cookies.js
scp youtube_cookies.txt user@server:/path/
```

## Integration Examples

### FastAPI/Python Backend

```python
from app.services.youtube_service import YouTubeService

service = YouTubeService(cookies_file='youtube_cookies.txt')
video_info = await service.get_video_info(url)
```

### Node.js Backend

```javascript
const ytdlp = require('youtube-dl-exec')

ytdlp('https://youtube.com/shorts/ID', {
  cookies: 'youtube_cookies.txt'
})
```

### Command Line

```bash
yt-dlp \
  --cookies youtube_cookies.txt \
  --output "%(id)s.%(ext)s" \
  https://youtube.com/shorts/VIDEO_ID
```

## Files

```
cookie-extractor/
├── extract-youtube-cookies.js  # Main script (260 lines)
├── package.json                # Dependencies
├── README.md                   # Full documentation (500+ lines)
├── QUICKSTART.md               # 3-minute guide
├── SUMMARY.md                  # This file
└── .gitignore                 # Protect cookies
```

## Dependencies

- **Node.js** 14+
- **puppeteer** 21.11.0 (includes Chromium ~300MB)

## FAQ

**Q: Do I run this every time?**
A: No! Once every 30-90 days.

**Q: Is this safe?**
A: Yes, you log in with your own account. Tool just saves cookies.

**Q: Can I use with multiple accounts?**
A: Yes, extract to different files:
```bash
node extract-youtube-cookies.js -o account1.txt
node extract-youtube-cookies.js -o account2.txt
```

**Q: Does this work with YouTube Music?**
A: Yes, they share authentication.

**Q: What about 2FA?**
A: Works fine, just complete 2FA when logging in.

## Documentation

- [QUICKSTART.md](QUICKSTART.md) - 3-minute setup
- [README.md](README.md) - Complete guide with examples
- Run `node extract-youtube-cookies.js --help` for CLI help

## Why Standalone?

This tool is **completely independent** so it can be used with:
- Any yt-dlp project
- youtube-dl projects
- Any tool that needs YouTube cookies
- Multiple projects simultaneously

No dependency on specific backend or frontend frameworks.

## Cost

**FREE** - Uses your own Google account, no third-party services.

## Summary

**Simplest solution for YouTube authentication:**
1. Run script (3 minutes)
2. Cookies last 30-90 days
3. Re-run when expired
4. Works everywhere

Perfect for projects that need reliable YouTube downloads without complex proxy setups.

---

Get started: [QUICKSTART.md](QUICKSTART.md)
