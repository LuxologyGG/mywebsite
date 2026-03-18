const config = require("../config");

let backend;

if (config.storage === "s3") {
  backend = require("./s3");
} else {
  backend = require("./local");
}

module.exports = backend;
