/* eslint-disable no-shadow */
const Q = require("q");
const _ = require("lodash");
const moment = require("moment");
const asyncRedis = require("async-redis");

const common = require("./common");
const { ui, errorModel } = require("../../helpers");
const { usersCont, visitorsCont } = require("../handler");
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
  const firstBucket = bucket.shift();
  const Arr = [];

  common.uiBeforeComplete(moment().format("dddd, MMMM Do YYYY, h:mm:ss a"));

  Arr.push(buckets[firstBucket]({ client }));
  _.forEach(bucket, elem => {
    const arrLength = Arr.length - 1;
    Arr.push(
      Arr[arrLength].then(({ err, client, setState }) => {
        if (err) console.log(err);
        return buckets[elem]({ client, setState });
      })
    );
    Arr.shift();
  });
  console.log(ui.horizontalLine());
  return { Arr };
};

const saveFunction = ({ fetch, Arr }) => {
  const deferred = Q.defer();
  Arr[0].then(async ({ err, setState }) => {
    if (err) console.log(err);
    let time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
    const log = logReport({
      buckets: { [time]: setState },
      timeContainer: [time],
      field: "manual"
    });
    let reply;
    try {
      reply = await fetch.getTransferStaticsData();
      reply[time] = setState;
      await fetch.setTransferStaticsData(reply);
    } catch (err) {
      deferred.reject({
        err: errorModel("ManualTransfer", "StoreTransferStatics", err),
        logs: log
      });
    }
    deferred.resolve(log);
  });

  return deferred.promise;
};

const store = Q.fbind(({ fetch, bucket, client }) => {
  const { Arr } = prepareData({ bucket, client });
  return saveFunction({
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
