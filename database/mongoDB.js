const chalk = require("chalk");
const Q = require("q");
require("dotenv").config();
const mongoose = require("mongoose");

module.exports = redis => {
  let deferred = Q.defer();
  mongoose
    .connect(process.env.DB_ADDRESS, {
      keepAlive: true,
      useNewUrlParser: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
      useCreateIndex: true
      // autoIndex: true,
    })
    .then(() => {
      console.log(
        chalk.black.bold.bgCyan("[ MongoDB ]"),
        "connection established successfully"
      );
      mongoose.connection.db.stats((err, stats) => {
        deferred.resolve({ redis, mongoose, stats });
      });
    })
    .catch(err => deferred.reject(chalk.bold.red("[ Mongo ] ") + err));
  mongoose.Promise = global.Promise;
  // mongoose.set('debug', true);
  return deferred.promise;
};
