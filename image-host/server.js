const express = require("express");
const cors = require("cors");
const config = require("./src/config");
const logger = require("./src/logger");
const { limiter } = require("./src/middleware");
const routes = require("./src/routes");
const cleanup = require("./src/cleanup");

if (!config.apiKey) {
  console.error("API_KEY environment variable is required");
  process.exit(1);
}

const app = express();

app.set("trust proxy", 1); // trust first proxy hop (Cloudflare/nginx)
app.use(cors());
app.use(limiter);
app.use(routes);

app.get("/health", (_req, res) => {
  res.json({ ok: true, storage: config.storage });
});

// Global error handler
app.use((err, _req, res, _next) => {
  logger.error(`unhandled: ${err.message}`);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () => {
  logger.info(`image-host listening on :${config.port}`);
  logger.info(`base url: ${config.baseUrl}`);
  logger.info(`storage: ${config.storage}`);
  logger.info(`max file size: ${(config.maxFileSize / 1024 / 1024).toFixed(0)}MB`);
  logger.info(`file TTL: ${config.fileTtlMinutes} minutes`);

  cleanup.start();
});
