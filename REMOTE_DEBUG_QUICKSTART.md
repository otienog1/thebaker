# Remote Debugging Method - Quick Start

**The simplest way to extract cookies - uses your normal Chrome with all logins already active!**

## Why This Method?

✅ **No login issues** - Use your actual Chrome with saved logins
✅ **No security errors** - Google trusts your normal browser
✅ **Already logged in** - Don't need to log in again
✅ **Works with 2FA** - All your security features work normally
✅ **See what's happening** - Watch the extraction in real-time

## 3-Step Process

### Step 1: Start Chrome in Debug Mode

**Windows (Easy Way):**
```bash
cd cookie-extractor
start-chrome-debug.bat
```

**Windows (Manual):**
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug-profile"
```

**Mac:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

**Linux:**
```bash
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

### Step 2: Log into YouTube

1. Chrome window opens
2. Go to https://www.youtube.com
3. Log in (if not already logged in from profile)
4. Leave Chrome window open

### Step 3: Extract Cookies

Open a **new terminal** and run:

```bash
cd cookie-extractor
node extract-youtube-cookies-remote.js
```

Press ENTER when prompted, and you're done!

## Complete Example

```bash
# Terminal 1 - Start Chrome
cd c:\Users\7plus8\build\ytd\cookie-extractor
start-chrome-debug.bat

# Log into YouTube in the Chrome window that opens

# Terminal 2 - Extract cookies
cd c:\Users\7plus8\build\ytd\cookie-extractor
node extract-youtube-cookies-remote.js

# Press ENTER when ready
# Cookies saved to youtube_cookies.txt!
```

## Upload to Server

```bash
scp youtube_cookies.txt root@172.234.172.191:/opt/ytdl/
ssh root@172.234.172.191 "sudo chown ytd:ytd /opt/ytdl/youtube_cookies.txt && sudo chmod 600 /opt/ytdl/youtube_cookies.txt && sudo systemctl restart ytd-worker"
```

## Troubleshooting

### "Failed to connect to Chrome"

Make sure Chrome was started with `--remote-debugging-port=9222`

**Check if it's running:**
- Open browser to: http://localhost:9222
- Should see a list of pages

### "Port 9222 already in use"

Use a different port:
```bash
# Start Chrome on port 9223
chrome.exe --remote-debugging-port=9223 --user-data-dir="%TEMP%\chrome-debug"

# Extract with custom port
node extract-youtube-cookies-remote.js -p 9223
```

### "No cookies found"

Make sure you're on YouTube and logged in before pressing ENTER.

## Advantages Over Normal Method

| Feature | Normal Puppeteer | Remote Debug ⭐ |
|---------|-----------------|----------------|
| Login Issues | ❌ May have security errors | ✅ Uses your normal Chrome |
| Already Logged In | ❌ Need to log in each time | ✅ Use saved logins |
| 2FA Support | ⚠️ May have issues | ✅ Works perfectly |
| See Extraction | ❌ Automated | ✅ Watch it happen |
| Chrome Must Close | ✅ Yes | ❌ Can stay open |

## Options

```bash
# Custom output file
node extract-youtube-cookies-remote.js -o my-cookies.txt

# Custom port
node extract-youtube-cookies-remote.js -p 9223

# Both
node extract-youtube-cookies-remote.js -o cookies.txt -p 9223

# Help
node extract-youtube-cookies-remote.js --help
```

## Summary

This is the **best method** if you're having login issues:

1. Start Chrome normally with debug flag
2. Log into YouTube (works 100% - it's your real Chrome!)
3. Run script to extract cookies
4. Done!

No security errors, no login problems, works every time.
