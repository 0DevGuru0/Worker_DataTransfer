const { visitorsCont, usersCont } = require("../handler");
const asyncRedis = require("async-redis");
const Q = require("q");
const clc = require("chalk");
const moment = require("moment");
const _ = require("lodash");
module.exports = (redis, bucket, transferPeriod) => {
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
  let Arr = [];
  transferPeriod = transferPeriod.replace("hour", "");
  transferPeriod = +transferPeriod * 1000 * 60 * 60;
  console.log(
    clc.black.bold.bgYellow("[ Data Transfer ]"),
    "System Initialized..."
  );
  console.log(
    clc.black.bold.bgYellow("[ Data Transfer ]"),
    "Started Time::",
    moment().format("dddd, MMMM Do YYYY, h:mm:ss a")
  );
  console.log(
    clc.black.bold.bgYellow("[ Data Transfer ]"),
    "Transferring Data from Redis to MongoDB Each::",
    transferPeriod / 3600000,
    "hour."
  );
  let interval = setInterval(() => {
    let time = moment().format("dddd, MMMM Do YYYY, h:mm a");
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
        let reply;
        try {
          reply = await client.hget("transferStatics", "auto");
        } catch (e) {
          console.log(e);
        }
        reply = reply ? JSON.parse(reply) : {};
        reply[time] = staticsBucket.split(":");
        await client.hset("transferStatics", "auto", JSON.stringify(reply));

        console.log(
          clc.bold.bgGreen.white(
            " Congratulation!!! Users Data Transferring to MongoDB is successfully done.."
          )
        );
      })
      .catch(async reason => {
        let reply;
        try {
          reply = await client.hget("transferStatics", "auto");
        } catch (e) {
          console.log(e);
        }
        reply = reply ? JSON.parse(reply) : {};
        reply[time] = "fail";
        await client.hset("transferStatics", "auto", JSON.stringify(reply));
        console.log(
          clc.green("[DataTransfer]"),
          clc.white.bgRed("[ERROR]"),
          reason
        );
      });
  }, transferPeriod);
  deferred.resolve(interval);
  return deferred.promise;
};