const col = require("chalk");
const Q = require("q");
const _ = require("lodash");
const moment = require("moment");
const { ui, errorModel } = require("../../helpers");
const asyncRedis = require("async-redis");
const { usersCont, visitorsCont } = require("../handler");
let time = moment().format("dddd, MMMM Do YYYY, h:mm a");
const transferredReport = staticsBucket => {
  return (
    ui.horizontalLine +
    "\n" +
    ui.centralize(col.bold("Data Transfer statistic")) +
    "\n" +
    col.bold.bgGreen("Transferred Buckets:") +
    "\n\t" +
    staticsBucket.replace(/:/gi, "\n\t") +
    "\n" +
    col.bold.bgGreen("Transferred Time:") +
    "\n\t" +
    time
  );
};
function FetchData(client) {
  this.client = client;
  this.bucket = "transferStatics";
  this.subBucket = "manual";
  return {
    getTransferStaticsData: async () => {
      let reply = await this.client.hget(this.bucket, this.subBucket);
      reply = reply ? JSON.parse(reply) : {};
      return reply;
    },
    setTransferStaticsData: async reply => {
      return await this.client.hset(
        this.bucket,
        this.subBucket,
        JSON.stringify(reply)
      );
    }
  };
}
const uiBeforeComplete = () => {
  console.log(
    col.black.bold.bgYellow("[ Data Transfer ]"),
    "System Initialized..."
  );
  console.log(
    col.black.bold.bgYellow("[ Data Transfer ]"),
    "Started Time::",
    time
  );
  console.log(
    col.black.bold.bgYellow("[ Data Transfer ]"),
    "Start To Transfer..."
  );
  console.log(ui.horizontalLine);
};
const store = Q.fbind(({ fetch, bucket, client }) => {
  let { staticsBucket, Arr } = prepareData({ bucket, client });
  return saveFunction({
    staticsBucket,
    Arr,
    fetch,
    bucket
  });
});
const prepareData = ({ bucket, client }) => {
  let buckets = Object.assign({}, usersCont, visitorsCont);
  let _allVisi = Object.keys(visitorsCont);
  let _allUsers = Object.keys(usersCont);
  let allVisi = bucket.indexOf("all_visitor_buckets");
  if (allVisi > -1) bucket.splice(allVisi, 1, ..._allVisi);
  let allUsers = bucket.indexOf("all_user_buckets");
  if (allUsers > -1) bucket.splice(allUsers, 1, ..._allUsers);
  bucket = _.uniq(bucket);
  let staticsBucket = bucket.join(":");
  let firstBucket = bucket.shift();
  let Arr = [];

  Arr.push(buckets[firstBucket](client));
  _.forEach(bucket, elem => {
    let arrLength = Arr.length - 1;
    let currentBucket = buckets[elem];
    Arr.push(Arr[arrLength].then(currentBucket));
    Arr.shift();
  });
  uiBeforeComplete();
  return { staticsBucket, Arr };
};

const saveFunction = ({ fetch, Arr, staticsBucket }) => {
  let deferred = Q.defer();
  Arr[0]
    .then(async () => {
      try {
        let reply = await fetch.getTransferStaticsData();
        reply[time] = staticsBucket.split(":");
        await fetch.setTransferStaticsData(reply);
      } catch (err) {
        deferred.reject(
          errorModel("ManualTransfer", "StoreTransferStatics", err)
        );
      }
      deferred.resolve(transferredReport(time, staticsBucket));
    })
    .catch(async reason => {
      if (reason) deferred.reject(reason);
      try {
        let reply = await fetch.getTransferStaticsData();
        reply[time] = "fail";
        await fetch.setTransferStaticsData(reply);
      } catch (err) {
        deferred.reject(
          errorModel("ManualTransfer", "StoreTransferStatics", err)
        );
      }
    });
  return deferred.promise;
};
module.exports = (redis, bucket) => {
  let deferred = Q.defer();
  let client = asyncRedis.decorate(redis);
  Q({ fetch: FetchData(client), bucket, client })
    .then(store)
    .then(deferred.resolve)
    .catch(deferred.reject);
  return deferred.promise;
};
