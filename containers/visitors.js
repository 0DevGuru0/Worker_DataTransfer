const Q     = require('q');
const chalk = require('chalk');
const storeFunc = require('./utils/storeOnlinevisitor')

const mockInterval = (containerName,redis)=>{
    var deferred = Q.defer();
    setTimeout(()=>{ 
        console.log(`${containerName}`) 
        deferred.resolve(redis)
      },1000)
    return deferred.promise;
}

const container = {
    onlineVisitorsList : redis=>{
        var deferred = Q.defer();
        storeFunc(redis,deferred,'online:visitors:TList',"onlineVisitorList","onlineCount")
        return deferred.promise;

    },
    pageViews          : redis=>mockInterval('pageViews',redis),
    totalVisit         : redis=>mockInterval('totalVisit',redis),
}

module.exports = redis=>{
    console.log(chalk.bold('-------------------------------------------------------------'))
    var deferred = Q.defer();
    container.onlineVisitorsList(redis)
        .then(container.pageViews)
        .then(container.totalVisit)
        .then(()=>{
            console.log(chalk.bold.bgGreen.black('Congratulation!!! Visitors Data Transferring to MongoDB is successfully done..'))
            console.log(chalk.bold('-------------------------------------------------------------'))
            deferred.resolve()
        })
        .catch(reason=>console.log( 
            chalk.green("[DataTransfer]"),
            chalk.white.bgRed("[ERROR]") ,
            reason)
        )

    return deferred.promise;
}
