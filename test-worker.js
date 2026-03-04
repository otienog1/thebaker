#!/usr/bin/env node

/**
 * Test script for Cookie Worker
 *
 * This script helps you test the worker setup by:
 * 1. Testing Redis connection
 * 2. Testing SSH connections to servers
 * 3. Sending a test job
 */

require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');
const { NodeSSH } = require('node-ssh');
const fs = require('fs');

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

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

async function testRedisConnection() {
  log('\n' + '='.repeat(70), colors.cyan);
  log('Testing Redis Connection', colors.bold);
  log('='.repeat(70) + '\n', colors.cyan);

  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  });

  try {
    logInfo(`Connecting to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}...`);
    const result = await redis.ping();

    if (result === 'PONG') {
      logSuccess('Redis connection successful');

      // Get queue length
      const queueLength = await redis.llen('youtube:cookie:requests');
      logInfo(`Current queue length: ${queueLength}`);

      return true;
    } else {
      logError('Redis ping failed');
      return false;
    }
  } catch (error) {
    logError(`Redis connection failed: ${error.message}`);
    return false;
  } finally {
    await redis.quit();
  }
}

async function testSSHConnections() {
  log('\n' + '='.repeat(70), colors.cyan);
  log('Testing SSH Connections', colors.bold);
  log('='.repeat(70) + '\n', colors.cyan);

  let servers;
  try {
    const serversConfig = fs.readFileSync('servers.json', 'utf8');
    servers = JSON.parse(serversConfig).servers;
  } catch (error) {
    logError(`Failed to load servers.json: ${error.message}`);
    return false;
  }

  let allSuccess = true;

  for (const server of servers) {
    log(`\nTesting connection to ${server.id} (${server.host})...`, colors.yellow);

    const ssh = new NodeSSH();
    try {
      const os = require('os');
      const path = require('path');
      const fs = require('fs');

      // Build SSH connection options
      const sshOptions = {
        host: server.host,
        port: server.port,
        username: server.username,
        tryKeyboard: true,
      };

      // Add authentication method
      if (server.authMethod === 'privateKey' && server.privateKeyPath) {
        // Expand ~ to home directory
        let keyPath = server.privateKeyPath;
        if (keyPath.startsWith('~/')) {
          keyPath = path.join(os.homedir(), keyPath.slice(2));
        }

        logInfo(`Using private key: ${keyPath}`);

        if (!fs.existsSync(keyPath)) {
          logError(`Private key not found: ${keyPath}`);
          allSuccess = false;
          continue;
        }

        const privateKey = fs.readFileSync(keyPath, 'utf8');
        sshOptions.privateKey = privateKey;
      } else if (server.password) {
        sshOptions.password = server.password;
      } else {
        logError('No authentication method configured');
        allSuccess = false;
        continue;
      }

      await ssh.connect(sshOptions);

      logSuccess(`Connected to ${server.host}`);

      // Test if cookie directory exists
      const dirPath = server.cookiePath.substring(0, server.cookiePath.lastIndexOf('/'));
      const dirCheck = await ssh.execCommand(`test -d ${dirPath} && echo "exists" || echo "not found"`);

      if (dirCheck.stdout.trim() === 'exists') {
        logSuccess(`Cookie directory exists: ${dirPath}`);
      } else {
        logError(`Cookie directory not found: ${dirPath}`);
        allSuccess = false;
      }

      // Test if services exist
      for (const service of server.services) {
        const serviceCheck = await ssh.execCommand(`systemctl list-unit-files ${service}`);
        if (serviceCheck.stdout.includes(service)) {
          logSuccess(`Service found: ${service}`);
        } else {
          logError(`Service not found: ${service}`);
          allSuccess = false;
        }
      }

    } catch (error) {
      logError(`Connection to ${server.host} failed: ${error.message}`);
      allSuccess = false;
    } finally {
      ssh.dispose();
    }
  }

  return allSuccess;
}

async function sendTestJob() {
  log('\n' + '='.repeat(70), colors.cyan);
  log('Send Test Job?', colors.bold);
  log('='.repeat(70) + '\n', colors.cyan);

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    readline.question(
      `${colors.yellow}Do you want to send a test job to the worker? (yes/no): ${colors.reset}`,
      resolve
    );
  });

  readline.close();

  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    logInfo('Skipping test job');
    return;
  }

  // Get server ID
  let servers;
  try {
    const serversConfig = fs.readFileSync('servers.json', 'utf8');
    servers = JSON.parse(serversConfig).servers;
  } catch (error) {
    logError(`Failed to load servers.json: ${error.message}`);
    return;
  }

  log('\nAvailable servers:', colors.blue);
  servers.forEach((s, i) => {
    log(`  ${i + 1}. ${s.id} (${s.host})`, colors.cyan);
  });

  const readline2 = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const serverIndex = await new Promise((resolve) => {
    readline2.question(
      `${colors.yellow}Select server (1-${servers.length}): ${colors.reset}`,
      resolve
    );
  });

  readline2.close();

  const server = servers[parseInt(serverIndex) - 1];
  if (!server) {
    logError('Invalid server selection');
    return;
  }

  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  });

  try {
    const requestId = `test-${Date.now()}`;
    const job = {
      serverId: server.id,
      requestId: requestId,
      timestamp: Date.now(),
    };

    log(`\nSending test job...`, colors.yellow);
    logInfo(`Request ID: ${requestId}`);
    logInfo(`Server: ${server.id}`);

    await redis.lpush('youtube:cookie:requests', JSON.stringify(job));
    logSuccess('Test job sent to queue');

    log(`\n${colors.bold}Next steps:${colors.reset}`);
    log('1. Make sure the worker is running: node cookie-worker.js', colors.blue);
    log('2. Watch the worker logs for job processing', colors.blue);
    log('3. The worker will launch Chrome - be ready to log into YouTube if needed', colors.blue);

  } catch (error) {
    logError(`Failed to send test job: ${error.message}`);
  } finally {
    await redis.quit();
  }
}

async function runTests() {
  log('\n' + '='.repeat(70), colors.bold + colors.cyan);
  log('  Cookie Worker - Test Script', colors.bold + colors.cyan);
  log('='.repeat(70) + '\n', colors.bold + colors.cyan);

  const redisOk = await testRedisConnection();
  const sshOk = await testSSHConnections();

  log('\n' + '='.repeat(70), colors.cyan);
  log('Test Summary', colors.bold);
  log('='.repeat(70) + '\n', colors.cyan);

  if (redisOk) {
    logSuccess('Redis connection: OK');
  } else {
    logError('Redis connection: FAILED');
  }

  if (sshOk) {
    logSuccess('SSH connections: OK');
  } else {
    logError('SSH connections: FAILED (check details above)');
  }

  if (redisOk && sshOk) {
    log('\n' + colors.green + colors.bold + '✓ All tests passed!' + colors.reset, colors.green);
    await sendTestJob();
  } else {
    log('\n' + colors.red + colors.bold + '✗ Some tests failed. Please fix the issues before running the worker.' + colors.reset);
  }

  log('');
}

runTests().catch((error) => {
  logError(`Test script error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
