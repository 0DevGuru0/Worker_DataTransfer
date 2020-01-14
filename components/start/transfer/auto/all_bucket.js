const { connectToDBs, disconnectFromDBs } = require("../../../../database");
const { autoAllTransfer } = require("../../../../containers/transfer");
const { ui } = require("../../../../helpers");

module.exports = () => {
  return {
    start: intervalTime =>
      connectToDBs()
        .tap(({ mongoose, redis }) => {
          this.mongoose = mongoose;
          this.redis = redis;
          this.init = true;
        })
        .then(() =>
          autoAllTransfer({ intervalTime, redis: this.redis, bucket: "all" })
        )
        .then(interval => (this.mainInterval = interval))
        .catch(err => console.log(err instanceof Object ? err.message : err))
        .finally(async () => {
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
