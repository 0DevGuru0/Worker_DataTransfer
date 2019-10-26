const Q             = require('q'),
    chalk           = require('chalk'),
    storeFunc       = require('./utils/storeOnlineVisitor'),
    pageViewsStore  = require('./utils/pageViewsFunc'),
    visitorsState   = require('./utils/visitorsStateFunc');
const container = {
    onlineVisitorsList : client=>{
        var deferred = Q.defer();
        storeFunc( client,deferred )
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

module.exports = async client=>{
    console.log(chalk.bold('-------------------------------------------------------------'))
    var deferred = Q.defer();
    container.onlineVisitorsList(client)
        .then(container.visitorsState)
        .then(container.pageViews)
        .then(()=>{
            console.log(chalk.bold.bgGreen.black('Congratulation!!! Visitors Data Transferring to MongoDB is successfully done..'))
            console.log(chalk.bold('-------------------------------------------------------------'))
            deferred.resolve()
        })
        .catch(reason=>deferred.reject(reason))
    return deferred.promise;
}
