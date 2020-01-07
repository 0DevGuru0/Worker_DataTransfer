const Q = require("q"),
  chalk = require("chalk");

const { pageViewsStore, onlineVisitorsStore, visitorsStateStore } = require("./provider");
const {ui} = require('../../helpers')

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
    onlineVisitorsStore({client, config})
      .then(_ => deferred.resolve(client))
      .catch(deferred.reject);
    return deferred.promise;
  },
  pageViews: client => {
    var deferred = Q.defer();
    let config = {
      collectionName: "pageViews",
      logBucket: "pageViews"
    };
    pageViewsStore({client, config})
      .then(_ => deferred.resolve(client))
      .catch(deferred.reject);
    return deferred.promise;
  },
  visitorsState: client => {
    var deferred = Q.defer();
    let config = { logBucket: "visitorsState" };
    visitorsStateStore({client, config})
    .then(_ => deferred.resolve(client))
    .catch(deferred.reject);

    return deferred.promise;
  }
};

module.exports = {
  visitorsCont: container,
  visitorsWorker: client => {
    console.log( ui.horizontalLine );
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
        console.log( ui.horizontalLine );
        deferred.resolve(client);
      })
      .catch(deferred.reject);
    return deferred.promise;
  }
};
