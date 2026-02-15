# Cookie Auto-Upload Automation Setup

This guide explains how to automatically extract YouTube cookies and upload them to your server.

## Prerequisites

1. **Chrome with Remote Debugging**: Chrome must be running with remote debugging enabled
2. **SSH Key Authentication**: Password-less SSH login must be configured
3. **Node.js**: Required for the cookie extractor script
4. **YouTube Login**: You must be logged into YouTube in Chrome

## Files Created

- `auto-upload-cookies.bat` - Manual upload script (interactive)
- `auto-upload-cookies-silent.bat` - Silent upload script (for scheduled tasks)
- `setup-scheduled-task.ps1` - PowerShell script to create scheduled task
- `auto-upload.log` - Log file for automated uploads

## Quick Start

### Option 1: Manual Upload (Test First)

1. Start Chrome with remote debugging:
   ```batch
   start-chrome-debug.bat
   ```

2. Make sure you're logged into YouTube in that Chrome window

3. Run the manual upload script:
   ```batch
   auto-upload-cookies.bat
   ```

### Option 2: Automated Upload (Scheduled Task)

1. Open PowerShell as Administrator

2. Navigate to the cookie-extractor folder:
   ```powershell
   cd c:\Users\7plus8\build\ytd\cookie-extractor
   ```

3. Run the setup script:
   ```powershell
   .\setup-scheduled-task.ps1
   ```

   Or customize the interval (e.g., every 4 hours):
   ```powershell
   .\setup-scheduled-task.ps1 -IntervalHours 4
   ```

4. The scheduled task will:
   - Run immediately (first time)
   - Repeat every X hours (default: 6 hours)
   - Extract cookies from Chrome
   - Upload to server via SCP
   - Set proper permissions on server

## How It Works

1. **Cookie Extraction**: Connects to Chrome's remote debugging port (9222) and extracts cookies
2. **Upload**: Uses SCP to upload `youtube_cookies.txt` to `/opt/ytdl/youtube_cookies.txt` on server
3. **Permissions**: Sets ownership to `ytd:ytd` and permissions to `644` on server

## Requirements for Automation

### 1. Keep Chrome Running with Debug Port

For automation to work, Chrome must stay running with the debug port. You can:

**Option A: Add to Windows Startup**
- Press `Win+R`, type `shell:startup`, press Enter
- Create a shortcut to `start-chrome-debug.bat` in that folder

**Option B: Run Manually**
- Double-click `start-chrome-debug.bat` after each reboot
- Keep that Chrome window open

### 2. SSH Key Authentication

The script needs password-less SSH access. If not configured:

```bash
# On Windows (in PowerShell)
ssh-keygen -t ed25519
ssh-copy-id root@172.234.172.191

# Or manually copy the key
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@172.234.172.191 "cat >> ~/.ssh/authorized_keys"
```

### 3. Stay Logged into YouTube

Keep your YouTube session active in the Chrome window. The cookies will be automatically refreshed as you use YouTube normally.

## Monitoring

### Check Logs

View the log file to see upload history:
```batch
type auto-upload.log
```

Or in PowerShell:
```powershell
Get-Content auto-upload.log -Tail 50
```

### Test the Scheduled Task

1. Open Task Scheduler: `Win+R` → `taskschd.msc`
2. Find "YouTube Cookie Auto Upload"
3. Right-click → Run
4. Check the log file for results

### View Task Status

```powershell
Get-ScheduledTask -TaskName "YouTube Cookie Auto Upload" | fl *
```

## Troubleshooting

### Script Says "Cookie extraction failed"

- Make sure Chrome is running with `--remote-debugging-port=9222`
- Verify Chrome is on port 9222: Open http://localhost:9222 in a browser
- Make sure you're logged into YouTube

### Upload Failed

- Check SSH key authentication: `ssh root@172.234.172.191 "echo test"`
- Verify server is accessible
- Check firewall settings

### Permission Errors on Server

- Make sure the ytd user exists on server: `ssh root@172.234.172.191 "id ytd"`
- Check server logs: `ssh root@172.234.172.191 "journalctl -u ytd-worker -n 50"`

## Customization

### Change Upload Interval

Edit the scheduled task:
1. Open Task Scheduler
2. Find "YouTube Cookie Auto Upload"
3. Right-click → Properties → Triggers
4. Edit the trigger and change the repeat interval

Or re-run setup script with different interval:
```powershell
.\setup-scheduled-task.ps1 -IntervalHours 12
```

### Change Output Location

Edit `auto-upload-cookies-silent.bat` and change:
```batch
node extract-youtube-cookies-remote.js --output youtube_cookies.txt
```

### Run on Different Schedule

Instead of interval-based, you can modify the trigger to run:
- Daily at specific time
- On system startup
- On user login
- etc.

Use Task Scheduler GUI to modify the trigger.

## Uninstalling

### Remove Scheduled Task

```powershell
Unregister-ScheduledTask -TaskName "YouTube Cookie Auto Upload" -Confirm:$false
```

Or delete from Task Scheduler GUI.

### Remove Files

Delete the automation scripts:
```batch
del auto-upload-cookies.bat
del auto-upload-cookies-silent.bat
del setup-scheduled-task.ps1
del auto-upload.log
del AUTOMATION_SETUP.md
```

## Security Notes

1. **SSH Keys**: Keep your private key secure
2. **Cookies**: The cookie file contains authentication tokens - protect it
3. **Server Access**: Only use root access temporarily, consider creating a dedicated upload user
4. **Log Files**: The log may contain sensitive paths - review before sharing

## Advanced: Run as Windows Service

For even more reliability, consider converting this to a Windows Service that:
- Starts automatically on boot
- Keeps Chrome running with debug port
- Monitors and uploads cookies continuously

This requires additional tools like NSSM (Non-Sucking Service Manager).
