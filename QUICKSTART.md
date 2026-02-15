# Quick Start - YouTube Cookie Extractor

Extract YouTube cookies in 3 minutes.

## Step 1: Install

```bash
cd cookie-extractor
npm install
```

Wait for Puppeteer to download Chromium (~300MB).

## Step 2: Run

```bash
node extract-youtube-cookies.js
```

## Step 3: Log In

1. Browser window opens showing YouTube
2. Click "Sign In" (top right)
3. Log in with your Google account
4. Wait for homepage to load
5. Go back to terminal and press ENTER

## Step 4: Done!

Cookies saved to `youtube_cookies.txt`

## Use with yt-dlp

```bash
yt-dlp --cookies youtube_cookies.txt https://youtube.com/shorts/VIDEO_ID
```

## Use with Your Server

```bash
# Upload to server
scp youtube_cookies.txt root@your-server:/opt/app/

# Set permissions
ssh root@your-server "chmod 600 /opt/app/youtube_cookies.txt"

# Restart your service
ssh root@your-server "systemctl restart your-service"
```

## Troubleshooting

**"No cookies found"**
- Make sure you actually logged in
- Wait for page to fully load before pressing ENTER

**"Chromium not found"**
```bash
npm install puppeteer --force
```

## Cookie Lifetime

Cookies last 30-90 days. Re-run when they expire.

## Options

```bash
# Custom output file
node extract-youtube-cookies.js -o my-cookies.txt

# Show help
node extract-youtube-cookies.js --help
```

## That's It!

See [README.md](README.md) for full documentation.
