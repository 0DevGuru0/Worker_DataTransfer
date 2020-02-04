const RedisDB = require("./redisDB");
const MongoDB = require("./mongoDB");
const connectToDBs = require("./connectToDBs");
const disconnectFromDBs = require("./disconnectFromDBs");

module.exports = { RedisDB, MongoDB, connectToDBs, disconnectFromDBs };
