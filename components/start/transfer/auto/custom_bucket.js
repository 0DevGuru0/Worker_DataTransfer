const clc = require("chalk");
const Q = require("q");

const { MongoDB, RedisDB } = require("../../../../database");
const { autoManualTransfer } = require("../../../../containers/transfer");
module.exports = () => {
  return {
    start: (bucket, transferPeriod) => {
      return RedisDB()
        .then(MongoDB)
        .then(({ redis, mongoose }) => {
          let deferred = Q.defer();
          this.mongooseDB = mongoose;
          this.redisDB = redis;
          deferred.resolve(redis);
          return deferred.promise;
        })
        .then(redis => autoManualTransfer(redis, bucket, transferPeriod))
        .then(interval => (this.interval = interval))
        .catch(reason =>
          console.log(clc.green("[Server]"), clc.white.bgRed("[ERROR]"), reason)
        );
    },
    initialize: () => (this.interval ? true : false),
    stop: () => {
      let deferred = Q.defer();
      clearInterval(this.interval);
      this.mongooseDB.connection.close().then(() => {
        this.redisDB.quit(() => {
          console.log(
            clc.white.bold.bgMagentaBright("[ Redis ]"),
            "connection closed successfully"
          );
          this.interval = false;
          deferred.resolve();
        });
      });
      return deferred.promise;
    }
  };
};

// start transfer auto --bucket
