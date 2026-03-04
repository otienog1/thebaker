/**
 * Backend Server Integration Example
 *
 * This file shows how your backend servers should integrate with the cookie worker.
 * Add this code to your backend server to automatically request cookie refresh when needed.
 */

const Redis = require('ioredis');

// Redis configuration (use same credentials as worker)
const REDIS_CONFIG = {
  host: '57.159.27.119',
  port: 6379,
  username: 'mdlworker',
  password: 'tAS7YHDkYRe3sOXjHagnZzFfw0bsY7YM',
  db: 0,
};

// Server ID (must match ID in worker's servers.json)
const SERVER_ID = 'backend-1'; // Change this for each server

// Redis clients
let redisPublisher;
let redisSubscriber;

/**
 * Initialize Redis connections
 */
function initRedis() {
  redisPublisher = new Redis(REDIS_CONFIG);
  redisSubscriber = new Redis(REDIS_CONFIG);

  // Subscribe to response channel
  redisSubscriber.subscribe(`youtube:cookie:response:${SERVER_ID}`);

  redisSubscriber.on('message', (channel, message) => {
    handleCookieResponse(JSON.parse(message));
  });

  console.log('Redis connections initialized');
}

/**
 * Handle cookie update response
 */
function handleCookieResponse(response) {
  console.log('Cookie update response:', response);

  if (response.success) {
    console.log(`✓ Cookies updated successfully! Request: ${response.requestId}`);
    // Resume processing your jobs
    resumeProcessing();
  } else {
    console.error(`✗ Cookie update failed: ${response.error}`);
    // Handle failure (retry, alert, etc.)
  }
}

/**
 * Request cookie refresh from worker
 */
async function requestCookieRefresh(reason = 'unknown') {
  const requestId = `${SERVER_ID}-${Date.now()}`;

  const job = {
    serverId: SERVER_ID,
    requestId: requestId,
    timestamp: Date.now(),
    reason: reason, // Optional: for logging
  };

  console.log(`Requesting cookie refresh: ${requestId} (${reason})`);

  try {
    await redisPublisher.lpush('youtube:cookie:requests', JSON.stringify(job));
    console.log('Cookie refresh request sent');
    return requestId;
  } catch (error) {
    console.error('Failed to send cookie refresh request:', error);
    throw error;
  }
}

/**
 * Check if error requires cookie refresh
 */
function needsCookieRefresh(error) {
  const cookieErrors = [
    'Sign in to confirm you're not a bot',
    'Sign in to confirm you\'re not a bot',
    'Unable to extract video data',
    'HTTP Error 403',
    'No cookies file',
    'ENOENT',
    'Cookie file not found',
    'Authentication required',
  ];

  return cookieErrors.some(msg => error.message && error.message.includes(msg));
}

/**
 * Example: Process YouTube download with automatic cookie refresh
 */
async function processYouTubeDownload(videoUrl) {
  const maxRetries = 3;
  let attempt = 0;
  let cookieRefreshRequested = false;

  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`Processing ${videoUrl} (attempt ${attempt}/${maxRetries})`);

      // Your actual yt-dlp or download logic here
      // Example:
      // const result = await ytdlp(videoUrl, {
      //   cookies: '/opt/ytdl/youtube_cookies.txt'
      // });

      // Simulate download
      await simulateDownload(videoUrl);

      console.log('✓ Download successful');
      return;

    } catch (error) {
      console.error(`Download failed: ${error.message}`);

      // Check if we need cookie refresh
      if (needsCookieRefresh(error)) {
        if (!cookieRefreshRequested) {
          console.log('Cookie issue detected, requesting refresh...');
          await requestCookieRefresh(error.message);
          cookieRefreshRequested = true;

          // Wait for cookie update (or implement timeout)
          console.log('Waiting for cookie update...');
          await waitForCookieUpdate(60000); // Wait up to 60 seconds

          // Retry after cookie update
          continue;
        } else {
          console.error('Cookie refresh already requested, but still failing');
          throw error;
        }
      }

      // For other errors, retry or throw
      if (attempt >= maxRetries) {
        throw error;
      }

      console.log(`Retrying in 5 seconds...`);
      await sleep(5000);
    }
  }
}

/**
 * Wait for cookie update (with timeout)
 */
function waitForCookieUpdate(timeout = 60000) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Cookie update timeout'));
      }
    }, timeout);

    // Listen for success response
    const originalHandler = handleCookieResponse;
    handleCookieResponse = (response) => {
      if (response.success && !resolved) {
        resolved = true;
        clearTimeout(timer);
        handleCookieResponse = originalHandler;
        resolve();
      }
      originalHandler(response);
    };
  });
}

/**
 * Resume processing after cookie update
 */
function resumeProcessing() {
  console.log('Resuming job processing...');
  // Implement your logic to resume workers/jobs
}

/**
 * Simulate download (replace with actual yt-dlp)
 */
async function simulateDownload(videoUrl) {
  // Simulate random failures for testing
  const shouldFail = Math.random() < 0.3;

  if (shouldFail) {
    throw new Error('Sign in to confirm you\'re not a bot');
  }

  await sleep(2000);
  return { success: true };
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example 1: Simple worker that processes videos
 */
async function exampleWorker() {
  initRedis();

  const videos = [
    'https://youtube.com/shorts/VIDEO1',
    'https://youtube.com/shorts/VIDEO2',
    'https://youtube.com/shorts/VIDEO3',
  ];

  for (const video of videos) {
    try {
      await processYouTubeDownload(video);
    } catch (error) {
      console.error(`Failed to process ${video}:`, error.message);
    }
  }
}

/**
 * Example 2: Manually trigger cookie refresh
 */
async function exampleManualRefresh() {
  initRedis();

  console.log('Manually requesting cookie refresh...');
  await requestCookieRefresh('Manual request');

  // Wait for response
  setTimeout(() => {
    console.log('Check your cookie file!');
    process.exit(0);
  }, 30000);
}

/**
 * Example 3: Check for missing cookie file on startup
 */
async function exampleStartupCheck() {
  const fs = require('fs');
  const cookiePath = '/opt/ytdl/youtube_cookies.txt';

  initRedis();

  if (!fs.existsSync(cookiePath)) {
    console.log('Cookie file not found on startup, requesting...');
    await requestCookieRefresh('Missing cookie file on startup');
  }
}

// ============================================================================
// INTEGRATION PATTERNS
// ============================================================================

/**
 * Pattern 1: Express.js API endpoint
 */
function expressExample() {
  const express = require('express');
  const app = express();

  app.post('/api/refresh-cookies', async (req, res) => {
    try {
      const requestId = await requestCookieRefresh('Manual API request');
      res.json({ success: true, requestId });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.listen(3000);
}

/**
 * Pattern 2: Bull Queue integration
 */
function bullQueueExample() {
  const Queue = require('bull');
  const downloadQueue = new Queue('youtube-downloads');

  downloadQueue.process(async (job) => {
    try {
      await processYouTubeDownload(job.data.url);
    } catch (error) {
      if (needsCookieRefresh(error)) {
        // Pause queue, request cookies, resume when ready
        await downloadQueue.pause();
        await requestCookieRefresh(error.message);
        // Resume will be called in handleCookieResponse()
      }
      throw error;
    }
  });
}

/**
 * Pattern 3: Scheduled cookie refresh
 */
function scheduledRefreshExample() {
  const cron = require('node-cron');

  // Refresh cookies every day at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('Scheduled cookie refresh...');
    await requestCookieRefresh('Scheduled refresh');
  });
}

// ============================================================================
// RUN EXAMPLE
// ============================================================================

// Uncomment to test:
// exampleManualRefresh();
// exampleWorker();
// exampleStartupCheck();

module.exports = {
  initRedis,
  requestCookieRefresh,
  needsCookieRefresh,
  processYouTubeDownload,
};
