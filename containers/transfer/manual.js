const Q = require("q");
const _ = require("lodash");
const moment = require("moment");
const asyncRedis = require("async-redis");

const common = require("./common");
const { ui, errorModel } = require("../../helpers");
const { usersCont, visitorsCont } = require("../handler");
const logReport = require("./log");

const time = moment().format("dddd, MMMM Do YYYY, h:mm a");

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
    setTransferStaticsData: reply => {
      return this.client.hset(
        this.bucket,
        this.subBucket,
        JSON.stringify(reply)
      );
    }
  };
}

const prepareData = ({ bucket, client }) => {
  const buckets = { ...usersCont, ...visitorsCont };
  const _allVisi = Object.keys(visitorsCont);
  const _allUsers = Object.keys(usersCont);
  const allVisi = bucket.indexOf("all_visitor_buckets");
  if (allVisi > -1) bucket.splice(allVisi, 1, ..._allVisi);
  const allUsers = bucket.indexOf("all_user_buckets");
  if (allUsers > -1) bucket.splice(allUsers, 1, ..._allUsers);
  bucket = _.uniq(bucket);
  const staticsBucket = bucket.join(":");
  const firstBucket = bucket.shift();
  const Arr = [];

  Arr.push(buckets[firstBucket]({ client }));
  _.forEach(bucket, elem => {
    const arrLength = Arr.length - 1;
    const currentBucket = buckets[elem];
    Arr.push(Arr[arrLength].then(currentBucket));
    Arr.shift();
  });
  common.uiBeforeComplete(time);
  console.log(ui.horizontalLine);
  return { staticsBucket, Arr };
};
const saveFunction = ({ fetch, Arr, staticsBucket }) => {
  const deferred = Q.defer();
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
        const reply = await fetch.getTransferStaticsData();
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
const store = Q.fbind(({ fetch, bucket, client }) => {
  const { staticsBucket, Arr } = prepareData({ bucket, client });
  return saveFunction({
    staticsBucket,
    Arr,
    fetch,
    bucket
  });
});
module.exports = (redis, bucket) => {
  const deferred = Q.defer();
  const client = asyncRedis.decorate(redis);
  Q({ fetch: FetchData(client), bucket, client })
    .then(store)
    .then(deferred.resolve)
    .catch(deferred.reject);
  return deferred.promise;
};
