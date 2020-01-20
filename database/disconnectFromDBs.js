const Q = require("q");
const col = require("chalk");
module.exports = async ({ mongoose, redis }) => {
  let deferred = Q.defer();
  let errContainer = [];
  const redisDisconnet = () =>
    new Promise(async (res, rej) => {
      await redis.quit(() => res("disconnected"));
      if (redis.ready) rej("notDisconnected");
    });

  //  check mongoose connectivity then disconnected
  if (mongoose.connection.readyState === 1)
    await mongoose.connection
      .close()
      .then(() => {
        console.log(
          col.black.bold.bgCyan("[ MongoDB ]"),
          "connection disconnected successfully"
        );
      })
      .catch(() => {
        console.log(
          col.black.bold.bgRed("[ MongoDB ]"),
          "connection didn't disconnected successfully"
        );
        errContainer.push("mongo");
      });

  //  check redis connectivity then disconnected
  if (redis.ready)
    await redisDisconnet()
      .then(() => {
        console.log(
          col.black.bold.bgMagentaBright("[ Redis ]"),
          "connection disconnected successfully"
        );
      })
      .catch(() => {
        console.log(
          col.black.bold.bgRed("[ Redis ]"),
          "connection didn't disconnected successfully"
        );
        errContainer.push("redis");
      });
  if (errContainer.length > 0) {
    deferred.reject();
  } else {
    deferred.resolve();
  }

  return deferred.promise;
};
