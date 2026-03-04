#!/usr/bin/env node

/**
 * Quick script to queue cookie refresh jobs for all servers
 */

require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function queueAllServers() {
  console.log(`${colors.cyan}Queuing cookie refresh jobs for all servers...${colors.reset}\n`);

  // Load servers
  const serversConfig = JSON.parse(fs.readFileSync('servers.json', 'utf8'));
  const servers = serversConfig.servers;

  // Connect to Redis
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  });

  try {
    for (const server of servers) {
      const requestId = `manual-${Date.now()}-${server.id}`;
      const job = {
        serverId: server.id,
        requestId: requestId,
        reason: 'manual_refresh',
        timestamp: Date.now(),
      };

      console.log(`${colors.blue}Queuing job for ${server.id}${colors.reset}`);
      console.log(`  Host: ${server.host}`);
      console.log(`  Chrome Profile: ${server.chromeProfile}`);
      console.log(`  Request ID: ${requestId}`);

      await redis.lpush('youtube:cookie:requests', JSON.stringify(job));

      console.log(`${colors.green}✓ Job queued${colors.reset}\n`);

      // Small delay between jobs
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`${colors.green}✓ All jobs queued successfully!${colors.reset}\n`);
    console.log(`${colors.yellow}Next steps:${colors.reset}`);
    console.log('1. The worker will process each server one by one');
    console.log('2. Chrome will open for each profile - sign in with DIFFERENT YouTube accounts:');
    servers.forEach(s => {
      console.log(`   ${colors.cyan}- ${s.chromeProfile}: Sign in with unique YouTube account${colors.reset}`);
    });
    console.log('3. Press ENTER in the worker terminal after each login\n');

  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

queueAllServers();
