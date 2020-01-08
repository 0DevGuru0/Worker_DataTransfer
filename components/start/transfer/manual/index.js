const clc = require("chalk"),
  Q = require("q");
const { MongoDB, RedisDB } = require("../../../../database");
const { ManualTransfer } = require("../../../../containers/transfer");
const {ui} = require('../../../../helpers')
module.exports = parent => {
  this.stop = () => {
    let deferred = Q.defer();
    this.mongooseDB.connection
      .close()
      .then(() => {
        this.redisDB.quit(() => {
          console.log( clc.white.bold.bgMagentaBright("[ Redis ]"), "connection closed successfully" );
          this.initialize = false;
          deferred.resolve();
        });
      })
      .catch(e => console.log("stop forced error"));
    return deferred.promise;
  };
  return {
    start: bucket => {
      return RedisDB()
        .then(MongoDB)
        .then(({ redis, mongoose }) => {
          let deferred = Q.defer();
          this.mongooseDB = mongoose;
          this.redisDB = redis;
          this.initialize = true;
          deferred.resolve(redis);
          return deferred.promise;
        })
        .then(redis => ManualTransfer(redis, bucket))
        .catch(console.log)
        .finally(async ()=>{ 
          console.log(ui.horizontalLine)
          await this.stop()
         })
    },
    initialize: () => (this.initialize ? true : false),
    stop:() => {
      let deferred = Q.defer();
      this.mongooseDB.connection
        .close()
        .then(() => {
          this.redisDB.quit(() => {
            console.log( clc.white.bold.bgMagentaBright("[ Redis ]"), "connection closed successfully" );
            this.initialize = false;
            deferred.resolve();
          });
        })
        .catch(e => console.log("stop forced error"));
      return deferred.promise;
    }
  }
};
