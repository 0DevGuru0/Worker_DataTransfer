
const clc = require("chalk");
const Q = require("q");
const _ = require("lodash");
const moment = require("moment");
const { usersCont } = require("../../../../../../containers/users");
const { visitorsCont } = require("../../../../../../containers/visitors");
const { MongoDB, RedisDB } = require("../../../../../index");
const { ui } = require("../../../../../../helper");
const asyncRedis = require("async-redis");
module.exports = inter => {
  this.buckets = Object.assign({}, usersCont, visitorsCont);
  this.allVisi = Object.keys(visitorsCont);
  this.allUsers = Object.keys(usersCont);
  return {
    start: bucket => {
      return RedisDB()
        .then(MongoDB)
        .then(({ redis, mongoose }) => {
          this.mongooseDB = mongoose;
          this.redisDB = redis;
          this.initialize = true;
          return redis;
        })
        .then(DBTransfer)
        .catch();
    },
    initialize: () => (this.initialize ? true : false),
    stop: () => {
      let deferred = Q.defer();
      this.mongooseDB.connection
        .close()
        .then(() => {
          this.redisDB.quit(() => {
            console.log(
              clc.white.bold.bgMagentaBright("[ Redis ]"),
              "connection closed successfully"
            );
            this.initialize = false;
            deferred.resolve();
          });
        })
        .catch(e => console.log("stop forced error"));
      return deferred.promise;
    }
  };
};
