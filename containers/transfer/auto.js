const { visitorsCont, usersCont } = require("../handler");
const asyncRedis = require("async-redis");
const Q = require("q");
const { ui, errorModel } = require("../../helpers");
const col = require("chalk");
const moment = require("moment");
const _ = require("lodash");
const common = require("./common");
const { fromEvent } = require("rxjs");
const { filter, take } = require("rxjs/operators");
const statistic = {
  successTransferredStatistic: async (client, staticsBucket, time) => {
    let reply;
    try {
      reply = await client.hget("transferStatics", "auto");
    } catch (err) {
      return new Error(
        errorModel("[AutoTransfer]", "[transferStatics/get]", err)
      );
    }
    reply = reply ? JSON.parse(reply) : {};
    reply[time] = staticsBucket.split(":");
    await client.hset("transferStatics", "auto", JSON.stringify(reply));
  },
  failTransferredStatistic: async (reason, client, time) => {
    let reply;
    try {
      reply = await client.hget("transferStatics", "auto");
    } catch (err) {
      return new Error(
        errorModel("[AutoTransfer]", "[transferStatics/get]", err)
      );
    }
    reply = reply ? JSON.parse(reply) : {};
    reply[time] = "fail";
    try {
      await client.hset("transferStatics", "auto", JSON.stringify(reply));
    } catch (err) {
      return new Error(
        errorModel("[AutoTransfer]", "[transferStatics/set]", err)
      );
    }
    return reason.match(/process stopped successfully./gim)
      ? reason
      : new Error(errorModel("[AutoTransfer]", "[StoreToDB]", reason));
  }
};
const log = async (buckets, client, timeContainer) => {
  let statisticLogs = JSON.parse(await client.hget("transferStatics", "auto"));
  const contain = timeContainer.filter(time =>
    statisticLogs[time] && statisticLogs[time] !== "fail" ? true : false
  );
  let outputSchema = text =>
    "\r" +
    ui.horizontalLine +
    "\n" +
    ui.centralize(col.bold("Data Transfer Statistic")) +
    "\n\n" +
    col.bold.bgGreen("Transferred Buckets:") +
    "\n\t" +
    buckets.split(":").join("\n\t") +
    "\n\n" +
    col.bold.bgGreen("Transferred Time:") +
    "\n" +
    text;
  return contain.length > 0
    ? outputSchema("\t" + contain.join("\n\t"))
    : outputSchema(
        ui.centralize(col.bold("no data has been transferred yet..."))
      );
};
const controller = async ({
  output,
  deferred,
  staticsBucket,
  client,
  timeContainer,
  event
}) => {
  let statisticLogs = await log(staticsBucket, client, timeContainer);
  deferred.resolve({ output, statisticLogs, event });
};
/*
let bucket = _.keys(buckets);
let Arr = [];
Arr.push(buckets[firstBucket](client));
_.forEach(buckets, (val, key) => {
  let arrLength = Arr.length - 1;
  Arr.push(Arr[arrLength].then(val));
  Arr.shift();
});
*/
module.exports = ({ redis, bucket, intervalTime }) => {
  let buckets = _.assign({}, usersCont, visitorsCont);
  let client = asyncRedis.decorate(redis);
  let deferred = Q.defer();
  // ? Deference between auto_all & auto_manual
  if (bucket) {
    let _allVisi = _.keys(visitorsCont);
    let _allUsers = _.keys(usersCont);
    let allVisi = bucket.indexOf("all_visitor_buckets");
    if (allVisi > -1) bucket.splice(allVisi, 1, ..._allVisi);
    let allUsers = bucket.indexOf("all_user_buckets");
    if (allUsers > -1) bucket.splice(allUsers, 1, ..._allUsers);
    bucket = _.uniq(bucket);
  } else {
    bucket = _.keys(buckets);
  }
  let staticsBucket = bucket.join(":");
  let firstBucket = bucket.shift();
  let Arr = [];
  intervalTime = intervalTime.replace("hour", "");
  intervalTime = +intervalTime * 1000 * 60 * 60;
  intervalTime = 10 * 1000; //TODO: TEST
  const timeContainer = [];
  common.uiBeforeComplete(moment().format("dddd, MMMM Do YYYY, h:mm a"));
  const event = fromEvent(process.stdin, "keypress", (value, key) => ({
    value: value,
    key: key || {}
  }))
    .pipe(
      filter(({ key }) => key && key.ctrl && key.name === "x"),
      take(1)
    )
    .subscribe(() => {
      controller({
        output: interval,
        deferred,
        staticsBucket,
        client,
        timeContainer,
        event
      });
    });
  let interval = setInterval(() => {
    let time = moment().format("dddd, MMMM Do YYYY, h:mm a");
    console.log(ui.horizontalLine);
    console.log(
      clc.black.bold.bgYellow("[ Data Transfer ]"),
      "Start At:\t",
      time + "\n"
    );
    timeContainer.push(time);
    Arr.push(buckets[firstBucket](client));
    _.forEach(bucket, elem => {
      let arrLength = Arr.length - 1;
      let currentBucket = buckets[elem];
      Arr.push(Arr[arrLength].then(currentBucket));
      Arr.shift();
    });
    Arr[0]
      .then(
        async () =>
          await statistic.successTransferredStatistic(
            client,
            staticsBucket,
            time
          )
      )
      .catch(
        async err =>
          await statistic
            .failTransferredStatistic(err, client, time)
            .then(async err => {
              console.log(err);
              deferred.reject({ err, interval, event });
            })
            .catch(err => {
              console.log(err);
              deferred.reject({ err, interval, event });
            })
      );
  }, intervalTime);
  return deferred.promise;
};
