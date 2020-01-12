const chalk = require( "chalk" );
const Q = require( "q" );
const { connectToDBs } = require( "../../../../database" );
const { autoAllTransfer } = require( "../../../../containers/transfer" );
let mainInterval, mongooseDB, redisDB;
module.exports = () => {
  return {
    start: intervalTime => connectToDBs().tap(({mongoose,redis})=>{
      this.mongooseDB = mongoose;
      this.redisDB = redis;
      this.initialize = true;
    })
    .then( ({redis}) => autoAllTransfer({ intervalTime, redis, bucket: "all" }) )
    .then( interval => mainInterval = interval )
    .catch( err => console.log(err instanceof Object ? err.message : err))
  
    ,initialize: () => ( mainInterval ? true : false ),

    stop: () => {
      let deferred = Q.defer();
      clearInterval( mainInterval );
      mongooseDB.connection.close().then( () => {
        redisDB.quit( () => {
          console.log(
            chalk.white.bold.bgMagentaBright( "[ Redis ]" ),
            "connection closed successfully"
          );
          mainInterval = false;
          deferred.resolve();
        } );
      } );
      return deferred.promise;
    }
  };
};

// start transfer auto --all