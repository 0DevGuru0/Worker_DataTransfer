const Q = require("q");
const col = require("chalk");
module.exports = ({ mongoose, redis, init }) => {
  let deferred = Q.defer();
  mongoose.connection
    .close()
    .then(() => {
      redis.quit(() => {
        console.log(
          col.white.bold.bgMagentaBright("[ Redis ]"),
          "connection closed successfully"
        );
        console.log(
          col.black.bold.bgCyan("[ MongoDB ]"),
          "connection disconnected successfully"
        );
        init = false;
        deferred.resolve();
      });
    })
    .catch(deferred.reject);
  return deferred.promise;
};
