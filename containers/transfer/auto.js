const Q = require("q");
const _ = require("lodash");
const col = require("chalk");
const moment = require("moment");
const asyncRedis = require("async-redis");
const { fromEvent, of, iif, EMPTY } = require("rxjs");
const { filter, mergeMap, take } = require("rxjs/operators");

const common = require("./common");
const { visitorsCont, usersCont } = require("../handler");
const { ui, errorModel } = require("../../helpers");
const logReport = require("./log");

const mainClass = class AutoTransfer {
  constructor(props) {
    this.bucket = props.bucket;
    this.intervalTime =
      +props.intervalTime.replace("hour", "") * 1000 * 60 * 60;
    this.stopEvent = false;
    this.client = asyncRedis.decorate(props.redis);
    this.timeContainer = [];
  }
  async log() {
    this.statisticLogs = JSON.parse(
      await this.client.hget("transferStatics", "auto")
    );
    const contain = this.timeContainer.filter(time =>
      this.statisticLogs[time] && this.statisticLogs[time] !== "fail"
        ? true
        : false
    );
    this.timeContainer = [];
    return logReport({
      buckets: this.statisticLogs,
      timeContainer: contain.length
        ? contain
        : [moment().format("dddd, MMMM Do YYYY, h:mm a")]
    });
  }
  dataProvisioner() {
    this.bucketsFunc = _.assign({}, usersCont, visitorsCont);
    // ? Deference between auto_all & auto_manual
    if (this.bucket) {
      let allVisi = this.bucket.indexOf("all_visitor_buckets");
      if (allVisi > -1) this.bucket.splice(allVisi, 1, ..._.keys(visitorsCont));
      let allUsers = this.bucket.indexOf("all_user_buckets");
      if (allUsers > -1) this.bucket.splice(allUsers, 1, ..._.keys(usersCont));
      this.bucket = _.uniq(this.bucket);
    } else {
      this.bucket = _.keys(this.bucketsFunc);
    }
    this.staticsBucket = this.bucket.join(":");
    this.firstBucket = this.bucket.shift();
  }
  statistic() {
    return {
      transferSucceed: async time => {
        let reply;
        try {
          reply = await this.client.hget("transferStatics", "auto");
        } catch (err) {
          return new Error(
            errorModel("[AutoTransfer]", "[transferStatics/get]", err)
          );
        }
        reply = reply ? JSON.parse(reply) : {};
        reply[time] = this.staticsBucket.split(":");
        try {
          await this.client.hset(
            "transferStatics",
            "auto",
            JSON.stringify(reply)
          );
        } catch (err) {
          return new Error(
            errorModel("[AutoTransfer]", "[transferStatics/get]", err)
          );
        }
      },
      transferFailed: async (reason, time) => {
        let reply;
        try {
          reply = await this.client.hget("transferStatics", "auto");
        } catch (err) {
          return errorModel("[AutoTransfer]", "[transferStatics/get]", err);
        }
        reply = reply ? JSON.parse(reply) : {};
        reply[time] = "fail";
        try {
          await this.client.hset(
            "transferStatics",
            "auto",
            JSON.stringify(reply)
          );
        } catch (err) {
          return errorModel("[AutoTransfer]", "[transferStatics/set]", err);
        }
        return reason.match(/process stopped successfully./gim)
          ? reason
          : errorModel("[AutoTransfer]", "[StoreToDB]", reason);
      }
    };
  }
  events() {
    fromEvent(process.stdin, "keypress", (value, key) => ({
      value: value,
      key: key || {}
    }))
      .pipe(
        filter(({ key }) => key && key.ctrl && key.name === "x"),
        mergeMap(() => iif(() => this.stopEvent, EMPTY, of("stop"))),
        take(1)
      )
      .subscribe(async () =>
        this.deferred.resolve({
          output: this.interval,
          statisticLogs: await this.log()
        })
      );
  }
  run() {
    this.Arr = [];
    let time = moment().format("dddd, MMMM Do YYYY, h:mm a");
    console.log(
      ui.horizontalLine + "\n" + col.black.bold.bgYellow("[ Data Transfer ]"),
      "Start At:\t",
      time + "\n"
    );

    this.timeContainer.push(time);
    this.stopEvent = true;
    this.Arr.push(this.bucketsFunc[this.firstBucket](this.client));
    _.forEach(this.bucket, elem => {
      let arrLength = this.Arr.length - 1;
      let currentBucket = this.bucketsFunc[elem];
      this.Arr.push(this.Arr[arrLength].then(currentBucket));
      this.Arr.shift();
    });
    this.Arr[0]
      .then(
        async () =>
          await this.statistic()
            .transferSucceed(time)
            .then(() => (this.stopEvent = false))
      )
      .catch(
        async err =>
          await this.statistic()
            .transferFailed(err, time)
            .then(async message =>
              this.deferred.reject({
                message,
                logs: await this.log(),
                interval: this.interval
              })
            )
      );
  }
  master() {
    this.deferred = Q.defer();
    this.dataProvisioner();
    common.uiBeforeComplete(moment().format("dddd, MMMM Do YYYY, h:mm a"));
    this.intervalTime = 10 * 1000; //TODO: TEST
    this.interval = setInterval(() => this.run(), this.intervalTime);
    this.events();
    return this.deferred.promise;
  }
};
// arg = { redis, bucket, intervalTime }
module.exports = arg => new mainClass(arg).master();
