@echo off
REM Auto Cookie Extractor and Uploader for YouTube Downloader
REM This script extracts cookies and uploads them to the server

echo ========================================
echo YouTube Cookie Auto-Upload
echo ========================================
echo.
echo [%date% %time%] Starting cookie extraction...

REM Change to script directory
cd /d "%~dp0"

REM Extract cookies (assuming Chrome is already running with debug port)
echo [%date% %time%] Extracting cookies from Chrome...
node extract-youtube-cookies-remote.js --output youtube_cookies.txt < nul

REM Check if extraction was successful
if not exist youtube_cookies.txt (
    echo [%date% %time%] ERROR: Cookie extraction failed!
    echo [%date% %time%] Make sure Chrome is running with remote debugging:
    echo    chrome.exe --remote-debugging-port=9222
    exit /b 1
)

echo [%date% %time%] Cookies extracted successfully

REM Upload to server
echo [%date% %time%] Uploading cookies to server...
scp youtube_cookies.txt root@172.234.172.191:/opt/ytdl/youtube_cookies.txt

if %ERRORLEVEL% neq 0 (
    echo [%date% %time%] ERROR: Upload failed!
    exit /b 1
)

echo [%date% %time%] Upload successful

REM Set permissions on server
echo [%date% %time%] Setting file permissions on server...
ssh root@172.234.172.191 "chown ytd:ytd /opt/ytdl/youtube_cookies.txt && chmod 644 /opt/ytdl/youtube_cookies.txt"

if %ERRORLEVEL% neq 0 (
    echo [%date% %time%] ERROR: Failed to set permissions!
    exit /b 1
)

echo [%date% %time%] Permissions set successfully
echo.
echo ========================================
echo SUCCESS! Cookies uploaded and configured
echo ========================================
echo.
