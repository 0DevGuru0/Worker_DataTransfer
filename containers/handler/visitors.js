const Q = require("q"),
  chalk = require("chalk");

const { pageViewsStore, storeFunc, visitorsState } = require("./provider");

const container = {
  onlineVisitorsList: client => {
    var deferred = Q.defer();
    let config = {
      redisBucket: "online:visitors:TList",
      logBucket: "onlineVisitorList",
      collectionName: "onlineList",
      countBox: "onlineCount",
      countBox2: "totalVisit"
    };
    storeFunc(client, config)
      .then(_ => deferred.resolve(client))
      .catch(deferred.reject);
    return deferred.promise;
  },
  pageViews: client => {
    var deferred = Q.defer();
    pageViewsStore(client, deferred);
    return deferred.promise;
  },
  visitorsState: client => {
    var deferred = Q.defer();
    visitorsState(client, deferred);
    return deferred.promise;
  }
};

module.exports = {
  visitorsCont: container,
  visitorsWorker: client => {
    console.log(
      chalk.bold(
        "-------------------------------------------------------------"
      )
    );
    var deferred = Q.defer();
    container
      .onlineVisitorsList(client)
      .then(container.visitorsState)
      .then(container.pageViews)
      .then(client => {
        console.log(
          chalk.bold.bgGreen.black(
            "Congratulation!!! Visitors Data Transferring to MongoDB is successfully done.."
          )
        );
        console.log(
          chalk.bold(
            "-------------------------------------------------------------"
          )
        );
        deferred.resolve(client);
      })
      .catch(reason => deferred.reject(reason));
    return deferred.promise;
  }
};
