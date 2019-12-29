const chalk = require("chalk");
const Q = require("q");
require("dotenv").config();
const mongoose = require("mongoose");
module.exports = redis => {
  var deferred = Q.defer();
  mongoose.connect(process.env.DB_ADDRESS, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true
    // autoIndex: true,
  });
  mongoose.connection.on("connected", () => {
    console.log(
      chalk.black.bold.bgCyan("[ MongoDB ]"),
      "connection established successfully"
    );
    mongoose.connection.db.stats((err, stats) => {
      deferred.resolve({ redis, mongoose, stats });
    });
  });
  mongoose.connection.on("error", err => {
    console.log(
      chalk.black.bold.bgCyan("[ MongoDB ]"),
      "connection failed " + err
    );
    deferred.reject(err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.log(
      chalk.black.bold.bgCyan("[ MongoDB ]"),
      "connection closed successfully"
    );
    deferred.reject(
      chalk.black.bold.bgCyan("[ MongoDB ]"),
      "connection closed"
    );
  });

  mongoose.Promise = global.Promise;
  // mongoose.set('debug', true);
  return deferred.promise;
};
