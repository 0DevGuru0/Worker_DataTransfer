const chalk = require('chalk');
const Q = require('q')
const {DBTransfer,MongoDB,RedisDB} = require('../../index')
let mainInterval,mongooseDB,redisDB;
module.exports={
    start:()=>{
        return RedisDB()
        .then(MongoDB)
        .then(({redis,mongoose})=>{
            let deferred = Q.defer();
            mongooseDB = mongoose;
            redisDB = redis;
            deferred.resolve(redis)
            return deferred.promise
        })
        .then(DBTransfer)
        .then(interval=>{ mainInterval = interval })
        .catch(reason=>console.log( chalk.green("[Server]"), chalk.white.bgRed("[ERROR]"), reason ))
    },
    initialize:()=>mainInterval?true:false,
    stop:()=> {
        let deferred = Q.defer();
        clearInterval(mainInterval)
        mongooseDB.connection.close().then(()=>{
            redisDB.quit(()=> {
                console.log(
                    chalk.white.bold.bgMagentaBright('[ Redis ]'),
                    "connection closed successfully"
                );
                deferred.resolve()
            })
        })
        return deferred.promise
    }

}

// start transfer auto --all