const Q     = require('q'),
    chalk = require('chalk'),
    storeFunc = require('./utils/storeOnlinevisitor'),
    pageViewsStore = require('./utils/pageViewsFunc'),
    visitorsState = require('./utils/visitorsStateFunc'),
    asyncRedis = require('async-redis');

const container = {
    onlineVisitorsList : redis=>{
        var deferred = Q.defer();
        storeFunc( redis,deferred )
        return deferred.promise;
    },
    pageViews          : client=>{
        var deferred = Q.defer();
        pageViewsStore(client, deferred)
        return deferred.promise;
    },
    visitorsState : client=>{
        var deferred = Q.defer();
        visitorsState(client, deferred)
        return deferred.promise;
    }
}

module.exports = async redis=>{
    console.log(chalk.bold('-------------------------------------------------------------'))
    var deferred = Q.defer();
    const client = asyncRedis.decorate(redis);
    container.pageViews(client)
        .then(container.onlineVisitorsList)
        .then(container.visitorsState)
        .then(()=>{
            console.log(chalk.bold.bgGreen.black('Congratulation!!! Visitors Data Transferring to MongoDB is successfully done..'))
            console.log(chalk.bold('-------------------------------------------------------------'))
            deferred.resolve()
        })
        .catch(reason=>deferred.reject(reason))
    return deferred.promise;
}
