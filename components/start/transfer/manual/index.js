const col = require("chalk"),
  Q = require("q");
const { connectToDBs } = require("../../../../database");
const { ManualTransfer } = require("../../../../containers/transfer");
const {ui} = require('../../../../helpers');

module.exports = parent => {
  this.stop = () => {
    let deferred = Q.defer();
    this.mongooseDB.connection
      .close()
      .then(() => {
        this.redisDB.quit(() => {
          console.log( col.white.bold.bgMagentaBright("[ Redis ]"), "connection closed successfully" );
          console.log( col.black.bold.bgCyan("[ MongoDB ]"), "connection disconnected successfully" );
          this.initialize = false;
          deferred.resolve();
        });
      })
      .catch(deferred.reject);
    return deferred.promise;
  };
  return {
    start: bucket => {
      return connectToDBs().tap(({mongoose,redis})=>{
        this.mongooseDB = mongoose;
        this.redisDB = redis;
        this.initialize = true;
      })
      .then(({redis}) => ManualTransfer(redis, bucket))
      .catch( err => console.log(err instanceof Object ? err.message : err))
      .finally(async ()=>{ 
        console.log(ui.horizontalLine)
        if(this.mongooseDB && this.mongooseDB.connection.readyState == 1) await this.stop() 
      })
    },
    initialize: () => (this.initialize ? true : false),
    stop:() => {
      let deferred = Q.defer();
      this.mongooseDB.connection
        .close()
        .then(() => {
          this.redisDB.quit(() => {
            console.log( col.white.bold.bgMagentaBright("[ Redis ]"), "connection closed successfully" );
            console.log( col.black.bold.bgCyan("[ MongoDB ]"), "connection disconnected successfully" );
            this.initialize = false;
            deferred.resolve();
          });
        })
        .catch(e => console.log("stop forced error"));
      return deferred.promise;
    }
  }
};