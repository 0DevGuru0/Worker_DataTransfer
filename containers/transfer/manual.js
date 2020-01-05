const clc = require("chalk");
const Q = require("q");
const _ = require("lodash");
const moment = require("moment");
const { ui } = require("../../helpers");
const asyncRedis = require("async-redis");
const { usersCont, visitorsCont } = require("../handler");
module.exports = (redis, bucket, parent) => {
  let initialize = true;
  let buckets = Object.assign({}, usersCont, visitorsCont);
  let _allVisi = Object.keys(visitorsCont);
  let _allUsers = Object.keys(usersCont);
  let client = asyncRedis.decorate(redis);
  let deferred = Q.defer();
  let allVisi = bucket.indexOf("all_visitor_buckets");
  if (allVisi > -1) bucket.splice(allVisi, 1, ..._allVisi);
  let allUsers = bucket.indexOf("all_user_buckets");
  if (allUsers > -1) bucket.splice(allUsers, 1, ..._allUsers);
  bucket = _.uniq(bucket);
  let staticsBucket = bucket.join(":");
  let firstBucket = bucket.shift();
  let time = moment().format("dddd, MMMM Do YYYY, h:mm a");
  let Arr = [];
  console.log(
    clc.black.bold.bgYellow("[ Data Transfer ]"),
    "System Initialized..."
  );
  console.log(
    clc.black.bold.bgYellow("[ Data Transfer ]"),
    "Started Time::",
    time
  );
  console.log(ui.horizontalLine);
  console.log(
    clc.black.bold.bgYellow("[ Data Transfer ]"),
    "Start To Transfer..."
  );
  Arr.push(buckets[firstBucket](client));
  _.forEach(bucket, elem => {
    let arrLength = Arr.length - 1;
    let currentBucket = buckets[elem];
    Arr.push(Arr[arrLength].then(currentBucket));
    Arr.shift();
  });

  Arr[0]
    .then(async () => {
      console.log(
        clc.bold.bgGreen.white(
          " Congratulation!!! Users Data Transferring to MongoDB is successfully done.."
        )
      );
      let reply;
      try {
        reply = await client.hget("transferStatics", "manual");
      } catch (e) {
        deferred.reject(e);
      }
      reply = reply ? JSON.parse(reply) : {};
      reply[time] = staticsBucket.split(":");
      try {
        await client.hset("transferStatics", "manual", JSON.stringify(reply));
      } catch (e) {
        throw new Error(e.message);
      }
      initialize = false;
      parent.prompt();
    })
    .catch(async reason => {
      console.log('main',reason)
      let reply;
      try {
        reply = await client.hget("transferStatics", "manual");
      } catch (err) {
        //TODO:
        throw new Error(err);
      }
      reply = reply ? JSON.parse(reply) : {};
      reply[time] = "fail";
      try {
        await client.hset("transferStatics", "manual", JSON.stringify(reply));
      } catch (err) {
        throw new Error(err);
      }
    });
  deferred.resolve(initialize);
  return deferred.promise;
};
