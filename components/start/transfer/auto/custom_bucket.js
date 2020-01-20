const { connectToDBs, disconnectFromDBs } = require("../../../../database");
const { autoManualTransfer } = require("../../../../containers/transfer");
const { ui } = require("../../../../helpers");

module.exports = () => {
  return {
    start: (bucket, transferPeriod) =>
      connectToDBs()
        .tap(({ mongoose, redis }) => {
          this.mongoose = mongoose;
          this.redis = redis;
          this.init = true;
        })
        .then(() => autoManualTransfer(this.redis, bucket, transferPeriod))
        .then(({ output, statisticLogs }) => {
          this.logs = statisticLogs;
          this.mainInterval = output;
        })
        .catch(({ err, interval }) => {
          // TODO:test
          this.mainInterval = interval;
          console.log(err instanceof Object ? err.message : err);
        })
        .finally(async () => {
          if (this.logs) console.log(this.logs);
          console.log(ui.horizontalLine);
          if (this.mainInterval) await clearInterval(this.mainInterval);
          if (this.mongoose && this.mongoose.connection.readyState == 1)
            await disconnectFromDBs({
              mongoose: this.mongoose,
              redis: this.redis,
              init: this.init
            });
        }),
    initialize: () => (this.mainInterval ? true : false),
    stop: async () => {
      await clearInterval(this.mainInterval);
      await disconnectFromDBs({
        mongoose: this.mongoose,
        redis: this.redis,
        init: this.init
      });
    }
  };
};
