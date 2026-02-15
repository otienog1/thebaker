# YouTube Cookie Extractor

**A standalone tool to extract YouTube authentication cookies for use with yt-dlp**

This tool uses Puppeteer to open a browser, lets you log into YouTube manually, then extracts and saves your authentication cookies in Netscape format for use with yt-dlp or any other tool that needs YouTube cookies.

## Why Do You Need This?

YouTube requires authentication for many videos, especially:
- Age-restricted content
- Private/unlisted videos
- YouTube Shorts (in some regions)
- Videos with certain copyright protections

When using `yt-dlp` or similar tools, you'll see errors like:
```
Sign in to confirm you're not a bot
ERROR: This video requires authentication
```

This tool solves that by extracting your browser's YouTube cookies so yt-dlp can authenticate as you.

## Features

✅ **Standalone** - Works with any yt-dlp project, not tied to any specific application
✅ **Simple** - Just run, log in, press ENTER
✅ **Secure** - Uses your own Google account, no third-party services
✅ **Universal** - Works on Windows, Mac, and Linux
✅ **yt-dlp compatible** - Saves in standard Netscape cookie format
✅ **CLI options** - Customize output file path

## Installation

### Prerequisites

- Node.js 14+ installed
- npm (comes with Node.js)

### Install

```bash
# Clone or download this directory
cd cookie-extractor

# Install dependencies (Puppeteer + Chromium)
npm install
```

## Usage

### Basic Usage

```bash
node extract-youtube-cookies.js
```

**What happens:**
1. A Chrome browser window opens showing YouTube
2. You manually log in with your Google account
3. After logging in, return to terminal and press ENTER
4. Cookies are saved to `youtube_cookies.txt`

### Custom Output File

```bash
node extract-youtube-cookies.js -o /path/to/my-cookies.txt
```

### Show Help

```bash
node extract-youtube-cookies.js --help
```

or

```bash
npm run help
```

## Using the Cookies

### With yt-dlp (Command Line)

```bash
yt-dlp --cookies youtube_cookies.txt https://youtube.com/shorts/VIDEO_ID
```

### With Python + yt-dlp

```python
import yt_dlp

ydl_opts = {
    'cookiefile': 'youtube_cookies.txt',
    'quiet': False,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download(['https://youtube.com/shorts/VIDEO_ID'])
```

### With FastAPI/Python Backend

```python
from app.services.youtube_service import YouTubeService

youtube_service = YouTubeService(cookies_file='youtube_cookies.txt')
video_info = await youtube_service.get_video_info(url)
```

## Security

### Protect Your Cookie File

The cookie file contains your YouTube authentication. Treat it like a password!

```bash
# Set restrictive permissions (Linux/Mac)
chmod 600 youtube_cookies.txt

# Add to .gitignore
echo "youtube_cookies.txt" >> .gitignore
echo "*.txt" >> .gitignore  # Or ignore all .txt files
```

### Cookie Lifetime

- YouTube cookies typically last **30-90 days**
- Re-run this script when cookies expire
- You'll know they expired when yt-dlp starts showing authentication errors again

## CLI Options

```
-o, --output <file>    Output file path (default: youtube_cookies.txt)
-h, --help            Show help message
```

## Examples

### Extract to Default File

```bash
node extract-youtube-cookies.js
```

Output: `youtube_cookies.txt` in current directory

### Extract to Custom Location

```bash
node extract-youtube-cookies.js -o ~/my-project/cookies.txt
```

### Extract for Server

```bash
# Extract locally
node extract-youtube-cookies.js -o server-cookies.txt

# Upload to server
scp server-cookies.txt user@server:/opt/app/youtube_cookies.txt

# Set permissions on server
ssh user@server "chmod 600 /opt/app/youtube_cookies.txt"
```

## Troubleshooting

### "No cookies found"

**Cause**: You didn't log in before pressing ENTER

**Solution**:
- Make sure you click "Sign In" on YouTube
- Actually log in with your Google account
- Wait for the homepage to fully load
- Then press ENTER in terminal

### "This browser or app may not be secure" (Google Login)

**Cause**: Google detects automated browser / outdated Chromium

**Solution**: The script now automatically uses your system's Chrome browser (which is more up-to-date). Make sure you have Chrome installed:
- **Windows**: Install from https://www.google.com/chrome/
- **Mac**: Install from https://www.google.com/chrome/
- **Linux**: `sudo apt-get install google-chrome-stable`

The script will automatically detect and use it.

**Alternative**: If you still get blocked, you can manually extract cookies using a browser extension:
1. Install "Get cookies.txt LOCALLY" extension for Chrome/Edge
2. Go to YouTube and log in
3. Click the extension icon → Export cookies
4. Save as `youtube_cookies.txt`

### "Chromium revision is not downloaded"

**Cause**: Puppeteer's Chromium wasn't installed

**Solution**:
```bash
npm install puppeteer --force
```

### "Error: Failed to launch the browser"

**Cause**: Missing system dependencies (Linux only)

**Solution** (Ubuntu/Debian):
```bash
sudo apt-get install -y \
  ca-certificates fonts-liberation \
  libappindicator3-1 libasound2 libatk-bridge2.0-0 \
  libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
  libexpat1 libfontconfig1 libgbm1 libgcc1 \
  libglib2.0-0 libgtk-3-0 libnspr4 libnss3 \
  libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
  libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
  libxcursor1 libxdamage1 libxext6 libxfixes3 \
  libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
  lsb-release wget xdg-utils
```

### Cookies Expire Quickly

**Cause**: Using 2-Factor Authentication

**Solution**:
- Use an app-specific password
- Or generate cookies more frequently

### Can't Run on Headless Server

**Solution 1** - Extract locally and upload:
```bash
# On your computer
node extract-youtube-cookies.js
scp youtube_cookies.txt user@server:/path/to/cookies.txt
```

**Solution 2** - Use Xvfb (virtual display):
```bash
# On server
sudo apt-get install xvfb
xvfb-run -a node extract-youtube-cookies.js
```

## How It Works

1. **Launches Chrome** - Uses your system Chrome (latest version) if available, or bundled Chromium
2. **Navigates to YouTube** - Goes to https://www.youtube.com
3. **Waits for login** - You manually log in
4. **Extracts cookies** - Gets all cookies from the browser
5. **Filters YouTube cookies** - Only keeps youtube.com and google.com cookies
6. **Converts format** - Converts to Netscape format (yt-dlp standard)
7. **Saves to file** - Writes to youtube_cookies.txt

**Note:** The script automatically uses your system's installed Chrome browser (which has the latest features and is less likely to be flagged by Google) if available. If not found, it falls back to Puppeteer's bundled Chromium.

## Cookie Format

The tool saves cookies in **Netscape HTTP Cookie File** format:

```
# Netscape HTTP Cookie File
.youtube.com    TRUE    /    TRUE    1234567890    SSID    value...
.youtube.com    TRUE    /    TRUE    1234567890    APISID    value...
```

This format is supported by:
- yt-dlp
- youtube-dl
- curl
- wget
- Most HTTP libraries

## Use Cases

### 1. YouTube Downloader Application

```bash
# Extract cookies once
node extract-youtube-cookies.js -o /opt/app/youtube_cookies.txt

# Use in your yt-dlp application
# Cookies are automatically used by yt-dlp
```

### 2. Automated Video Processing

```bash
# Cron job to refresh cookies monthly
0 0 1 * * cd /opt/cookie-extractor && node extract-youtube-cookies.js
```

### 3. Multiple Projects

```bash
# Extract once, use everywhere
node extract-youtube-cookies.js -o ~/youtube_cookies.txt

# Link to different projects
ln -s ~/youtube_cookies.txt /project1/cookies.txt
ln -s ~/youtube_cookies.txt /project2/cookies.txt
```

### 4. Testing

```bash
# Extract test cookies
node extract-youtube-cookies.js -o test-cookies.txt

# Test yt-dlp
yt-dlp --cookies test-cookies.txt https://youtube.com/shorts/TEST_ID
```

## Integration Examples

### FastAPI + Celery (Python)

```python
# In your youtube service
class YouTubeService:
    def __init__(self, cookies_file='/path/to/youtube_cookies.txt'):
        self.cookies_file = cookies_file

    async def download_video(self, url: str):
        ydl_opts = {
            'cookiefile': self.cookies_file,
            'outtmpl': '%(id)s.%(ext)s',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.download([url])
```

### Node.js + yt-dlp

```javascript
const { execFile } = require('child_process');

function downloadVideo(url, cookieFile = 'youtube_cookies.txt') {
  return new Promise((resolve, reject) => {
    execFile('yt-dlp', [
      '--cookies', cookieFile,
      url
    ], (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
```

### Docker Container

```dockerfile
FROM node:18

# Copy cookie extractor
COPY cookie-extractor /app/cookie-extractor
WORKDIR /app/cookie-extractor

# Install dependencies
RUN npm install

# Extract cookies (you need to run this manually once)
# Then copy cookies into container
COPY youtube_cookies.txt /app/cookies.txt

CMD ["node", "extract-youtube-cookies.js"]
```

## Development

### Project Structure

```
cookie-extractor/
├── extract-youtube-cookies.js   # Main script
├── package.json                  # Dependencies
├── README.md                     # This file
└── .gitignore                   # Ignore node_modules, cookies
```

### Dependencies

- **puppeteer** (^21.11.0) - Browser automation
  - Includes Chromium browser
  - ~300MB download on first install

## Alternatives

### Browser Extensions

- **Get cookies.txt** (Chrome/Firefox extension)
- **cookies.txt** (Export cookies manually)

**Pros**: No code needed
**Cons**: Manual process, need to export regularly

### This Tool (Puppeteer)

**Pros**:
- Automated
- Scriptable
- Can run on servers (with Xvfb)
- Can be integrated into CI/CD

**Cons**:
- Requires Node.js
- ~300MB for Chromium

## FAQ

**Q: Do I need to run this every time I download a video?**
A: No! Run it once, cookies last 30-90 days.

**Q: Is this safe?**
A: Yes, you're logging in with your own account. The tool just saves your cookies.

**Q: Can I use this for multiple YouTube accounts?**
A: Yes, extract cookies for each account to different files:
```bash
node extract-youtube-cookies.js -o account1-cookies.txt
node extract-youtube-cookies.js -o account2-cookies.txt
```

**Q: Does this work with YouTube Music?**
A: Yes, YouTube and YouTube Music share authentication.

**Q: Can I run this on a server without a display?**
A: Yes, use Xvfb (virtual display) or extract locally and upload.

**Q: What if I have 2FA enabled?**
A: It works fine, just complete the 2FA in the browser when logging in.

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! This is a standalone tool that can benefit many projects.

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Open an issue on GitHub
- See [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp#authentication-with-cookies)

## Credits

- Built for use with [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- Uses [Puppeteer](https://pptr.dev/) for browser automation
- Inspired by the need for reliable YouTube authentication

---

**Made with ❤️ for the yt-dlp community**
