const Q = require("q");
const _ = require("lodash");
const moment = require("moment");
const { ui, errorModel } = require("../../helpers");
const asyncRedis = require("async-redis");
const { usersCont, visitorsCont } = require("../handler");
const common = require("./common");
let time = moment().format("dddd, MMMM Do YYYY, h:mm a");
const logReport = require("./log");

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

  Arr.push(buckets[firstBucket]({ client }));
  _.forEach(bucket, elem => {
    let arrLength = Arr.length - 1;
    let currentBucket = buckets[elem];
    Arr.push(Arr[arrLength].then(currentBucket));
    Arr.shift();
  });
  common.uiBeforeComplete(time);
  console.log(ui.horizontalLine);
  return { staticsBucket, Arr };
};
const saveFunction = ({ fetch, Arr, staticsBucket }) => {
  let deferred = Q.defer();
  Arr[0]
    .then(async ({ setState }) => {
      let reply;
      try {
        reply = await fetch.getTransferStaticsData();
        reply[time] = staticsBucket.split(":");
        await fetch.setTransferStaticsData(reply);
      } catch (err) {
        deferred.reject(
          errorModel("ManualTransfer", "StoreTransferStatics", err)
        );
      }
      deferred.resolve(
        logReport({ buckets: { [time]: setState }, timeContainer: [time] })
      );
    })
    .catch(async ({ err, setState }) => {
      // 🤔 Save statisticLogs to DB
      const logs = await logReport({
        buckets: { [time]: setState },
        timeContainer: [time]
      });
      try {
        let reply = await fetch.getTransferStaticsData();
        reply[time] = "fail";
        await fetch.setTransferStaticsData(reply);
      } catch (fetchError) {
        deferred.reject({
          mainErr: err,
          err: errorModel("ManualTransfer", "StoreTransferStatics", fetchError),
          logs
        });
      }
      // 🤔 Return err after success store
      deferred.reject({ mainErr: err, err: null, logs });
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
