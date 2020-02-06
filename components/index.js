const StartComponent = require("./start");
const LogComponent = require("./logs");
const StatusHandler = require("./status");
const healthCheck = require("./health");

module.exports = { StartComponent, StatusHandler, LogComponent, healthCheck };
