const chalk = require("chalk");
const Q = require("q");
const Redis = require("redis");
require("dotenv").config();
module.exports = () => {
  var deferred = Q.defer();
  const redis = Redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    retry_strategy: options => {
      if (options.error && options.error.code === "ECONNREFUSED") {
        deferred.reject(
          `${chalk.bold.red("[ Redis ]")} The server refused the connection`
        );
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        deferred.reject(`${chalk.bold.red("[ Redis ]")}Retry time exhausted`);
      }
      if (options.attempt > 10) {
        return undefined;
      }
      return Math.min(options.attempt * 100, 3000);
    }
  }).setMaxListeners(0);
  redis.on("connect", () => {
    console.log(
      chalk.black.bold.bgMagentaBright("[ Redis ]"),
      "connection established successfully"
    );
    deferred.resolve(redis);
  });
  // const redisListener = redis.duplicate().setMaxListeners(0);
  return deferred.promise;
};
