const config = require("./config");
const storage = require("./storage");
const logger = require("./logger");

const ttlMs = config.fileTtlMinutes * 60 * 1000;
const CHECK_INTERVAL = 60 * 1000; // check every minute

let timer = null;

async function sweep() {
  try {
    const expired = await storage.listExpired(ttlMs);

    for (const filename of expired) {
      await storage.remove(filename);
      logger.info(`expired: ${filename}`);
    }

    if (expired.length > 0) {
      logger.info(`cleanup: removed ${expired.length} expired file(s)`);
    }
  } catch (err) {
    logger.error(`cleanup error: ${err.message}`);
  }
}

function start() {
  // Run immediately on startup to clean anything left over
  sweep();
  timer = setInterval(sweep, CHECK_INTERVAL);
  logger.info(`cleanup: running every ${CHECK_INTERVAL / 1000}s, TTL=${config.fileTtlMinutes}m`);
}

function stop() {
  if (timer) clearInterval(timer);
}

module.exports = { start, stop };
