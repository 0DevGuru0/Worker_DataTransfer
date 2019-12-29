const chalk = require("chalk");
const Q = require("q");
const { MongoDB, RedisDB } = require("../../../../database");
const { autoAllTransfer } = require("../../../../containers/transfer");
let mainInterval, mongooseDB, redisDB;
module.exports = () => {
  return {
    start: intervalTime =>
      RedisDB()
        .then(MongoDB)
        .then(({ redis, mongoose }) => {
          let deferred = Q.defer();
          mongooseDB = mongoose;
          redisDB = redis;
          deferred.resolve({ intervalTime, redis, bucket: "all" });
          return deferred.promise;
        })
        .then(autoAllTransfer)
        .then(interval => {
          mainInterval = interval;
        })
        .catch(reason =>
          console.log(
            chalk.green("[Server]"),
            chalk.white.bgRed("[ERROR]"),
            reason
          )
        ),
    initialize: () => (mainInterval ? true : false),
    stop: () => {
      let deferred = Q.defer();
      clearInterval(mainInterval);
      mongooseDB.connection.close().then(() => {
        redisDB.quit(() => {
          console.log(
            chalk.white.bold.bgMagentaBright("[ Redis ]"),
            "connection closed successfully"
          );
          mainInterval = false;
          deferred.resolve();
        });
      });
      return deferred.promise;
    }
  };
};

// start transfer auto --all
