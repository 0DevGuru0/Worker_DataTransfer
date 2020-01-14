const { connectToDBs, disconnectFromDBs } = require("../../../../database");
const { ManualTransfer } = require("../../../../containers/transfer");
const { ui } = require("../../../../helpers");

module.exports = () => {
  return {
    start: bucket =>
      connectToDBs()
        .tap(({ mongoose, redis }) => {
          this.mongoose = mongoose;
          this.redis = redis;
          this.init = true;
        })
        .then(() => ManualTransfer(this.redis, bucket))
        .catch(err => console.log(err instanceof Object ? err.message : err))
        .finally(async () => {
          console.log(ui.horizontalLine);
          if (this.mongoose && this.mongoose.connection.readyState == 1)
            await disconnectFromDBs({
              mongoose: this.mongoose,
              redis: this.redis,
              init: this.init
            }).then(() => (this.init = false));
        }),
    initialize: () => (this.init ? true : false),
    stop: () =>
      disconnectFromDBs({
        mongoose: this.mongoose,
        redis: this.redis,
        init: this.init
      }).then(() => (this.init = false))
  };
};
