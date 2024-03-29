const { connectToDBs, disconnectFromDBs } = require("../../../../database");
const { AutoTransfer } = require("../../../../containers/transfer");
const { ui } = require("../../../../helpers");

module.exports = () => {
  return {
    start: ({ bucket, intervalTime }) =>
      connectToDBs()
        .tap(({ mongoose, redis }) => {
          this.mongoose = mongoose;
          this.redis = redis;
          this.init = true;
        })
        .then(() => AutoTransfer({ redis: this.redis, bucket, intervalTime }))
        .then(({ output, statisticLogs }) => {
          this.logs = statisticLogs;
          this.mainInterval = output;
        })
        .catch(res => {
          if (res instanceof Object && res.interval) {
            this.mainInterval = res.interval;
            this.logs = res.logs;
            this.intErr = res.intErr;
            this.extErr = res.extErr;
          } else {
            console.log(res.message || res);
          }
        })
        .finally(async () => {
          if (this.extErr) console.log(this.extErr);
          if (this.logs) console.log(this.logs);
          console.log(ui.horizontalLine());
          if (this.intErr) console.log(this.intErr);
          if (this.mainInterval) await clearInterval(this.mainInterval);
          if (this.mongoose && this.mongoose.connection.readyState === 1)
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
