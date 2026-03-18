const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "..", "app.log");
const stream = fs.createWriteStream(logFile, { flags: "a" });

function timestamp() {
  return new Date().toISOString();
}

function format(level, msg) {
  return `[${timestamp()}] ${level.toUpperCase()} ${msg}`;
}

const logger = {
  info(msg) {
    const line = format("info", msg);
    console.log(line);
    stream.write(line + "\n");
  },
  error(msg) {
    const line = format("error", msg);
    console.error(line);
    stream.write(line + "\n");
  },
};

module.exports = logger;
