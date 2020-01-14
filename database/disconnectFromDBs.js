const Q = require("q");
const col = require("chalk");
module.exports = ({ mongoose, redis }) => {
  let deferred = Q.defer();
  mongoose.connection
    .close()
    .then(() => {
      redis.quit(() => {
        console.log(
          col.black.bold.bgMagentaBright("[ Redis ]"),
          "connection closed successfully"
        );
        console.log(
          col.black.bold.bgCyan("[ MongoDB ]"),
          "connection disconnected successfully"
        );
        deferred.resolve();
      });
    })
    .catch(deferred.reject);
  return deferred.promise;
};
