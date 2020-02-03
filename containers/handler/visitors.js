const Q = require("q");

const {
  pageViewsStore,
  onlineVisitorsStore,
  visitorsStateStore
} = require("./provider");

const container = {
  onlineVisitorsList: ({ client, setState = [] }) => {
    const deferred = Q.defer();
    const config = {
      redisBucket: "online:visitors:TList",
      logBucket: "onlineVisitorList",
      collectionName: "onlineList",
      countBox: "onlineCount",
      countBox2: "totalVisit"
    };
    onlineVisitorsStore({ client, config })
      .then(() => {
        setState.push("onlineVisitorsList");
        deferred.resolve({ client, setState });
      })
      .catch(({ err, done }) => {
        if (done) setState.push("onlineVisitorsList");
        deferred.reject({ err, setState, done });
      });
    return deferred.promise;
  },
  pageViews: ({ client, setState = [] }) => {
    const deferred = Q.defer();
    const config = {
      collectionName: "pageViews",
      logBucket: "pageViews"
    };
    pageViewsStore({ client, config })
      .then(() => {
        setState.push("pageViews");
        deferred.resolve({ client, setState });
      })
      .catch(({ err, done }) => {
        if (done) setState.push("pageViews");
        deferred.reject({ err, setState, done });
      });
    return deferred.promise;
  },
  visitorsState: ({ client, setState = [] }) => {
    const deferred = Q.defer();
    const config = { logBucket: "visitorsState" };
    visitorsStateStore({ client, config })
      .then(() => {
        setState.push("visitorsState");
        deferred.resolve({ client, setState });
      })
      .catch(({ err, done }) => {
        if (done) setState.push("visitorsState");
        deferred.reject({ err, setState, done });
      });
    return deferred.promise;
  }
};

module.exports = { visitorsCont: container };
