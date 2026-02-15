@echo off
REM Silent version for scheduled tasks - logs to file instead of console

set LOGFILE=%~dp0auto-upload.log
cd /d "%~dp0"

echo ======================================== >> "%LOGFILE%"
echo [%date% %time%] Starting cookie extraction >> "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"

REM Create input file with just Enter keypress
echo. > nul_input.txt

REM Extract cookies
node extract-youtube-cookies-remote.js --output youtube_cookies.txt < nul_input.txt >> "%LOGFILE%" 2>&1

if not exist youtube_cookies.txt (
    echo [%date% %time%] ERROR: Cookie extraction failed >> "%LOGFILE%"
    del nul_input.txt 2>nul
    exit /b 1
)

echo [%date% %time%] Cookies extracted successfully >> "%LOGFILE%"

REM Upload to server
scp youtube_cookies.txt root@172.234.172.191:/opt/ytdl/youtube_cookies.txt >> "%LOGFILE%" 2>&1

if %ERRORLEVEL% neq 0 (
    echo [%date% %time%] ERROR: Upload failed >> "%LOGFILE%"
    del nul_input.txt 2>nul
    exit /b 1
)

echo [%date% %time%] Upload successful >> "%LOGFILE%"

REM Set permissions
ssh root@172.234.172.191 "chown ytd:ytd /opt/ytdl/youtube_cookies.txt && chmod 644 /opt/ytdl/youtube_cookies.txt" >> "%LOGFILE%" 2>&1

echo [%date% %time%] SUCCESS! Cookies uploaded and configured >> "%LOGFILE%"

del nul_input.txt 2>nul
