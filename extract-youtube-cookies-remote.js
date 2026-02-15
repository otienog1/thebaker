#!/usr/bin/env node

/**
 * YouTube Cookie Extractor - Remote Debugging Mode
 *
 * This version connects to your already-running Chrome browser,
 * so you can use your normal Chrome with all your logins already active.
 *
 * Usage:
 *   1. Start Chrome with remote debugging:
 *      chrome.exe --remote-debugging-port=9222
 *   2. Log into YouTube in that Chrome window
 *   3. Run this script: node extract-youtube-cookies-remote.js
 *
 * Author: YouTube Downloader Team
 * License: MIT
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const helpFlag = args.includes('--help') || args.includes('-h');
const outputIndex = args.indexOf('--output') !== -1 ? args.indexOf('--output') : args.indexOf('-o');
const portIndex = args.indexOf('--port') !== -1 ? args.indexOf('--port') : args.indexOf('-p');
const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : 'youtube_cookies.txt';
const debugPort = portIndex !== -1 ? args[portIndex + 1] : '9222';

const COOKIE_FILE = path.resolve(outputFile);
const YOUTUBE_URL = 'https://www.youtube.com';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function showHelp() {
  console.log(`
${colors.bold}${colors.cyan}YouTube Cookie Extractor - Remote Debugging Mode${colors.reset}
${colors.yellow}Connect to your already-running Chrome browser to extract cookies${colors.reset}

${colors.bold}USAGE:${colors.reset}
  1. Start Chrome with remote debugging:
     ${colors.cyan}Windows:${colors.reset}
       "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\\chrome-debug"

     ${colors.cyan}Mac:${colors.reset}
       /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

     ${colors.cyan}Linux:${colors.reset}
       google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

  2. Log into YouTube in that Chrome window

  3. Run this script:
     node extract-youtube-cookies-remote.js

${colors.bold}OPTIONS:${colors.reset}
  -o, --output <file>    Output file path (default: youtube_cookies.txt)
  -p, --port <port>      Remote debugging port (default: 9222)
  -h, --help            Show this help message

${colors.bold}EXAMPLES:${colors.reset}
  ${colors.cyan}# Use default settings${colors.reset}
  node extract-youtube-cookies-remote.js

  ${colors.cyan}# Custom output file${colors.reset}
  node extract-youtube-cookies-remote.js -o my-cookies.txt

  ${colors.cyan}# Custom debugging port${colors.reset}
  node extract-youtube-cookies-remote.js -p 9223

${colors.bold}ADVANTAGES:${colors.reset}
  ✓ Uses your normal Chrome with existing logins
  ✓ No "browser may not be secure" errors
  ✓ No need to log in again
  ✓ Works with 2FA, Google Workspace accounts, etc.
  ✓ Can see what the script is doing

${colors.bold}TROUBLESHOOTING:${colors.reset}
  If connection fails:
  - Make sure Chrome was started with --remote-debugging-port=9222
  - Check that port 9222 is not blocked by firewall
  - Try a different port with -p flag
`);
  process.exit(0);
}

if (helpFlag) {
  showHelp();
}

async function extractCookies() {
  log('\n' + '='.repeat(70), colors.cyan);
  log(`${colors.bold}  YouTube Cookie Extractor - Remote Debugging Mode${colors.reset}`, colors.cyan);
  log('='.repeat(70) + '\n', colors.cyan);

  log(`Output file: ${COOKIE_FILE}`, colors.blue);
  log(`Debug port: ${debugPort}\n`, colors.blue);

  let browser;

  try {
    log('Connecting to Chrome...', colors.yellow);

    // Connect to existing Chrome instance
    const browserURL = `http://127.0.0.1:${debugPort}`;

    try {
      browser = await puppeteer.connect({
        browserURL: browserURL,
        defaultViewport: null,
      });

      log(`✓ Connected to Chrome on port ${debugPort}`, colors.green);
    } catch (error) {
      throw new Error(
        `Failed to connect to Chrome on port ${debugPort}.\n\n` +
        `Did you start Chrome with remote debugging?\n` +
        `Try this command:\n\n` +
        `Windows:\n` +
        `  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=${debugPort} --user-data-dir="C:\\chrome-debug"\n\n` +
        `Mac:\n` +
        `  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=${debugPort} --user-data-dir=/tmp/chrome-debug\n\n` +
        `Linux:\n` +
        `  google-chrome --remote-debugging-port=${debugPort} --user-data-dir=/tmp/chrome-debug\n`
      );
    }

    // Get all pages
    const pages = await browser.pages();
    let page;

    // Try to find YouTube page, or create new one
    const youtubePage = pages.find(p => p.url().includes('youtube.com'));

    if (youtubePage) {
      page = youtubePage;
      log(`✓ Found existing YouTube tab`, colors.green);
    } else {
      // Create new page and navigate to YouTube
      page = await browser.newPage();
      log('Opening YouTube...', colors.yellow);
      await page.goto(YOUTUBE_URL, { waitUntil: 'networkidle2' });
    }

    log('\n' + '='.repeat(70), colors.green);
    log(`${colors.bold}  ACTION REQUIRED${colors.reset}`, colors.green);
    log('='.repeat(70), colors.green);
    log('\nCheck your Chrome window:', colors.bold);
    log('  ✓ If you\'re already logged into YouTube - just press ENTER below', colors.green);
    log('  ✓ If not logged in - log in now, then press ENTER\n', colors.yellow);

    // Wait for user confirmation
    await new Promise((resolve) => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      readline.question(`${colors.bold}Press ENTER when ready to extract cookies: ${colors.reset}`, () => {
        readline.close();
        resolve();
      });
    });

    log('\nExtracting cookies...', colors.yellow);

    // Get cookies from the page
    const cookies = await page.cookies();

    if (cookies.length === 0) {
      throw new Error('No cookies found!');
    }

    // Filter YouTube/Google cookies
    const youtubeCookies = cookies.filter(cookie =>
      cookie.domain.includes('youtube.com') ||
      cookie.domain.includes('google.com')
    );

    if (youtubeCookies.length === 0) {
      throw new Error('No YouTube cookies found! Make sure you\'re on YouTube and logged in.');
    }

    log(`✓ Found ${youtubeCookies.length} YouTube/Google cookies`, colors.green);

    // Convert to Netscape format
    const netscapeCookies = convertToNetscapeFormat(youtubeCookies);

    // Save to file
    fs.writeFileSync(COOKIE_FILE, netscapeCookies);

    log('\n' + '='.repeat(70), colors.green);
    log(`${colors.bold}  ✓ SUCCESS! Cookies saved successfully${colors.reset}`, colors.green);
    log('='.repeat(70), colors.green);

    log(`\n${colors.bold}Cookie Details:${colors.reset}`);
    log(`  File: ${COOKIE_FILE}`, colors.blue);
    log(`  Total cookies: ${youtubeCookies.length}`, colors.blue);
    log(`  Format: Netscape (yt-dlp compatible)`, colors.blue);

    // Show important cookies
    const importantCookies = ['SSID', 'APISID', 'SAPISID', 'LOGIN_INFO', '__Secure-1PSID', '__Secure-3PSID'];
    const foundImportant = youtubeCookies.filter(c => importantCookies.includes(c.name));

    if (foundImportant.length > 0) {
      log(`  Auth cookies: ${foundImportant.map(c => c.name).join(', ')}`, colors.green);
    }

    log(`\n${colors.bold}Next Steps:${colors.reset}`);
    log(`  ${colors.cyan}1. Use with yt-dlp:${colors.reset}`);
    log(`     yt-dlp --cookies ${path.basename(COOKIE_FILE)} https://youtube.com/shorts/VIDEO_ID`);
    log(`\n  ${colors.cyan}2. Upload to server:${colors.reset}`);
    log(`     scp ${path.basename(COOKIE_FILE)} root@172.234.172.191:/opt/ytdl/`);
    log(`\n${colors.yellow}Note: You can close Chrome now, or keep using it normally.${colors.reset}\n`);

  } catch (error) {
    log('\n' + '='.repeat(70), colors.red);
    log(`${colors.bold}  ✗ ERROR: Failed to extract cookies${colors.reset}`, colors.red);
    log('='.repeat(70), colors.red);
    log(`\n${error.message}\n`, colors.red);
    process.exit(1);
  } finally {
    if (browser) {
      // Disconnect but don't close Chrome
      browser.disconnect();
      log('Disconnected from Chrome (Chrome is still running)\n', colors.yellow);
    }
  }
}

/**
 * Convert Puppeteer cookies to Netscape format
 */
function convertToNetscapeFormat(cookies) {
  const header = '# Netscape HTTP Cookie File\n# This file is generated by YouTube Cookie Extractor\n# https://github.com/yt-dlp/yt-dlp#authentication-with-cookies\n\n';

  const lines = cookies.map(cookie => {
    const domain = cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain;
    const flag = 'TRUE';
    const path = cookie.path || '/';
    const secure = cookie.secure ? 'TRUE' : 'FALSE';
    // Convert expires: -1 (session cookie) to 0, otherwise use the timestamp
    const expiration = cookie.expires && cookie.expires > 0 ? Math.floor(cookie.expires) : '0';
    const name = cookie.name;
    const value = cookie.value;

    return `${domain}\t${flag}\t${path}\t${secure}\t${expiration}\t${name}\t${value}`;
  });

  return header + lines.join('\n') + '\n';
}

// Run the extractor
extractCookies().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
