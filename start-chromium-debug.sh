#!/bin/bash

echo "======================================================================"
echo "   Starting Chromium in Remote Debugging Mode"
echo "======================================================================"
echo ""
echo "Chromium will start with remote debugging enabled on port 9222"
echo ""
echo "After Chromium opens:"
echo "   1. Go to YouTube and log in"
echo "   2. Run: node extract-youtube-cookies-remote.js"
echo ""
echo "======================================================================"
echo ""

# Your specific Chromium path from 'which chromium'
CHROME_PATH="/snap/bin/chromium"

# Using a local folder in your Home directory to avoid Snap permission issues
DEBUG_PROFILE="$HOME/chromium-debug-profile"

# Start Chromium
"$CHROME_PATH" --remote-debugging-port=9222 --user-data-dir="$DEBUG_PROFILE"