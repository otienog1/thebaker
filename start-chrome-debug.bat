@echo off
echo ======================================================================
echo   Starting Chrome in Remote Debugging Mode
echo ======================================================================
echo.
echo Chrome will start with remote debugging enabled on port 9222
echo You can use your normal Chrome with all your saved logins!
echo.
echo After Chrome opens:
echo   1. Go to YouTube and log in (if not already logged in)
echo   2. Run: node extract-youtube-cookies-remote.js
echo.
echo ======================================================================
echo.

REM Start Chrome with remote debugging
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug-profile"
