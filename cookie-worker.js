#!/usr/bin/env node

/**
 * YouTube Cookie Extractor - Redis Worker Service (Single Window Mode)
 */

require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');
const puppeteer = require('puppeteer');
const { NodeSSH } = require('node-ssh');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const config = {
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
    },
    chrome: {
        path: process.env.CHROME_PATH,
        debugPort: parseInt(process.env.CHROME_DEBUG_PORT || '9222'),
    },
    worker: {
        queueName: 'youtube:cookie:requests',
    },
    cookieFile: process.env.COOKIE_OUTPUT_FILE || 'youtube_cookies.txt',
};

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
    console.log(`${colors.cyan}[${new Date().toLocaleTimeString()}]${colors.reset} ${color}${message}${colors.reset}`);
}

/**
 * Kills any existing Chrome process and launches a new one with the specified profile
 * This ensures clean profile switching between jobs
 */
async function ensureChromeRunning(profileDir) {
    const port = config.chrome.debugPort;
    const browserURL = `http://127.0.0.1:${port}/json/version`;

    // Always kill existing Chrome to ensure clean profile switch
    try {
        const response = await fetch(browserURL);
        if (response.ok) {
            log('Closing existing Chrome instance for profile switch...', colors.yellow);

            // Kill Chrome process
            if (process.platform === 'win32') {
                spawn('taskkill', ['/F', '/IM', 'chrome.exe'], { stdio: 'ignore' });
            } else {
                spawn('pkill', ['-f', 'chrome.*remote-debugging'], { stdio: 'ignore' });
            }

            // Wait for Chrome to fully close
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    } catch (e) {
        // Chrome not running, that's fine
    }

    log('Launching Chrome with new profile...', colors.yellow);

    let chromePath = config.chrome.path;
    if (!chromePath) {
        chromePath = process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
    }

    const args = [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profileDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--start-maximized',
        'https://www.youtube.com'
    ];

    const chromeProcess = spawn(chromePath, args, { detached: true, stdio: 'ignore' });
    chromeProcess.unref();

    // Wait for the debug interface to initialize
    await new Promise(resolve => setTimeout(resolve, 4000));
}

function waitForKeyPress(query) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

/**
 * Hybrid Extractor: Connects to the single window and grabs cookies
 */
/**
 * Hybrid Extractor: Connects to the single window and grabs cookies
 */
async function extractYouTubeCookies(profileDir) {
    const port = config.chrome.debugPort;
    const browserURL = `http://127.0.0.1:${port}`;

    await ensureChromeRunning(profileDir);

    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: browserURL,
            defaultViewport: null,
        });

        // Small delay and retry to ensure pages are populated
        let pages = await browser.pages();
        if (pages.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            pages = await browser.pages();
        }

        // Fix: Ensure we actually found a page
        if (pages.length === 0) {
            log('No open tabs found. Creating new YouTube tab...', colors.yellow);
            const newPage = await browser.newPage();
            await newPage.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });
            pages = [newPage];
        }

        // Look for existing YouTube tab
        let page = pages.find(p => p && p.url && p.url().includes('youtube.com'));

        // If no YouTube tab, take the first available tab and navigate
        if (!page) {
            page = pages[0];
            log('Navigating existing tab to YouTube...', colors.yellow);
            await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });
        }

        log('\n' + '='.repeat(50), colors.green);
        log('  ACTION REQUIRED: Check the Chrome Window', colors.bold);
        log('  1. Sign in if necessary.', colors.yellow);
        log('  2. Press ENTER here to generate cookies.', colors.yellow);
        log('='.repeat(50) + '\n', colors.green);

        await waitForKeyPress(`${colors.bold}Press ENTER when ready: ${colors.reset}`);

        // Ensure page is fully loaded before extracting cookies
        // Add delay and retry logic to avoid "Requesting main frame too early" error
        let cookies;
        let retries = 3;
        while (retries > 0) {
            try {
                // Wait a bit to ensure page is stable
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Verify page is still valid
                if (!page.url()) {
                    throw new Error('Page not ready');
                }

                cookies = await page.cookies();
                break; // Success, exit retry loop
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                log(`Retrying cookie extraction (${3 - retries}/3)...`, colors.yellow);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        const youtubeCookies = cookies.filter(c => c.domain.includes('youtube.com') || c.domain.includes('google.com'));

        if (youtubeCookies.length === 0) throw new Error('No YouTube/Google cookies found.');

        const netscapeContent = convertToNetscapeFormat(youtubeCookies);
        const filePath = path.resolve(config.cookieFile);
        await fs.writeFile(filePath, netscapeContent);

        return filePath;
    } finally {
        if (browser) {
            await browser.disconnect();
            log('Disconnected from Chrome. Process complete.', colors.blue);
        }
    }
}

function convertToNetscapeFormat(cookies) {
    const header = '# Netscape HTTP Cookie File\n# Generated by YouTube Cookie Extractor\n\n';
    const lines = cookies.map(c => {
        const domain = c.domain.startsWith('.') ? c.domain : '.' + c.domain;
        const expiration = c.expires && c.expires > 0 ? Math.floor(c.expires) : '0';
        return `${domain}\tTRUE\t${c.path || '/'}\t${c.secure ? 'TRUE' : 'FALSE'}\t${expiration}\t${c.name}\t${c.value}`;
    });
    return header + lines.join('\n') + '\n';
}

async function transferCookiesToServer(cookieFile, serverConfig) {
    const ssh = new NodeSSH();
    // A temporary location the SSH user definitely has access to
    const tempRemotePath = `/tmp/youtube_cookies_${Date.now()}.txt`;

    try {
        const sshOptions = {
            host: serverConfig.host,
            port: serverConfig.port,
            username: serverConfig.username,
        };

        if (serverConfig.authMethod === 'privateKey') {
            const keyPath = serverConfig.privateKeyPath.startsWith('~/')
                ? path.join(require('os').homedir(), serverConfig.privateKeyPath.slice(2))
                : serverConfig.privateKeyPath;
            sshOptions.privateKey = await fs.readFile(keyPath, 'utf8');
        } else {
            sshOptions.password = serverConfig.password;
        }

        await ssh.connect(sshOptions);
        log(`Connected to ${serverConfig.host}.`, colors.yellow);

        // Step A: Upload to /tmp using standard SFTP (No permission issues here)
        log(`Uploading to temporary path: ${tempRemotePath}`, colors.yellow);
        await ssh.putFile(cookieFile, tempRemotePath);

        // Step B: Move to final destination using sudo (Bypasses folder restrictions)
        log(`Moving file to protected destination: ${serverConfig.cookiePath}`, colors.yellow);
        const moveResult = await ssh.execCommand(`sudo mv ${tempRemotePath} ${serverConfig.cookiePath}`);

        if (moveResult.code !== 0) {
            throw new Error(`Failed to move cookie file: ${moveResult.stderr}`);
        }

        // Step C: Fix ownership (Ensures the backend app can read it)
        if (serverConfig.cookieOwner) {
            log(`Setting ownership to ${serverConfig.cookieOwner}...`, colors.yellow);
            await ssh.execCommand(`sudo chown ${serverConfig.cookieOwner}:${serverConfig.cookieOwner} ${serverConfig.cookiePath}`);
        }

        // Step D: Restart the YouTube services
        if (serverConfig.services) {
            for (const service of serverConfig.services) {
                log(`Restarting service: ${service}...`, colors.yellow);
                await ssh.execCommand(`sudo systemctl restart ${service}`);
            }
        }

        log(`✓ Deployment to ${serverConfig.host} finished.`, colors.green);
    } catch (error) {
        log(`Transfer Error: ${error.message}`, colors.red);
        throw error;
    } finally {
        ssh.dispose();
    }
}

function logSuccess(msg) { log(`✓ ${msg}`, colors.green); }

async function startWorker() {
    log('YouTube Cookie Worker Active (Single Window Mode)', colors.bold + colors.cyan);
    const redis = new Redis(config.redis);
    let servers = JSON.parse(fsSync.readFileSync('servers.json', 'utf8')).servers;

    while (true) {
        try {
            const result = await redis.brpop(config.worker.queueName, 30);
            if (result) {
                const job = JSON.parse(result[1]);
                const server = servers.find(s => s.id === job.serverId);
                log(`Job Received: ${job.requestId} for ${job.serverId}`, colors.blue);

                // Use separate Chrome profile for each server to avoid YouTube flagging same account from multiple IPs
                const profileName = server.chromeProfile || `account-${job.serverId}`;
                const profileDir = path.resolve(`./chrome-profiles/${profileName}`);
                if (!fsSync.existsSync(profileDir)) await fs.mkdir(profileDir, { recursive: true });

                log(`Using Chrome profile: ${profileName}`, colors.cyan);
                const cookiePath = await extractYouTubeCookies(profileDir);
                await transferCookiesToServer(cookiePath, server);

                await redis.publish(`youtube:cookie:response:${job.serverId}`, JSON.stringify({
                    success: true,
                    requestId: job.requestId
                }));
            }
        } catch (err) {
            console.error(`${colors.red}Worker Loop Error:${colors.reset}`, err);
        }
    }
}

startWorker();