const clc = require( "chalk" );
const Q = require( "q" );

const { connectToDBs } = require( "../../../../database" );
const { autoManualTransfer } = require( "../../../../containers/transfer" );

module.exports = () => {
  return {
    start: ( bucket, transferPeriod ) => connectToDBs().tap( ( { mongoose, redis } ) => {
        this.mongooseDB = mongoose;
        this.redisDB = redis;
        this.initialize = true;
      })
      .then( ( { redis } ) => autoManualTransfer( redis, bucket, transferPeriod ) )
      .then( interval => ( this.interval = interval ) )
      .catch( err => console.log(err instanceof Object ? err.message : err))

    ,initialize: () => ( this.interval ? true : false ),
    
    stop: () => {
      let deferred = Q.defer();
      clearInterval( this.interval );
      this.mongooseDB.connection.close().then( () => {
        this.redisDB.quit( () => {
          console.log(
            clc.white.bold.bgMagentaBright( "[ Redis ]" ),
            "connection closed successfully"
          );
          this.interval = false;
          deferred.resolve();
        } );
      } );
      return deferred.promise;
    }
  };
};

// start transfer auto --bucket
