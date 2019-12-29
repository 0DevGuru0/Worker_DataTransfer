const chalk = require("chalk");
const asyncRedis = require("async-redis");
const Q = require("q");
const moment = require("moment");
const {visitorsWorker,usersWorker,usersCont,visitorsCont} = require('../handler')
const { ui } = require("../../helpers");

module.exports = ({ redis, intervalTime }) => {
  const client = asyncRedis.decorate(redis);
  let deferred = Q.defer();
  intervalTime = intervalTime.replace("hour", "");
  intervalTime = +intervalTime * 1000 * 60 * 60;
  intervalTime = 20 * 1000;
  // *Data Transferring with use of Time
  console.log(
    chalk.black.bold.bgYellow("[ Data Transfer ]"),
    "System Initialized..."
  );
  console.log(
    chalk.black.bold.bgYellow("[ Data Transfer ]"),
    "Started Time::",
    moment().format("dddd, MMMM Do YYYY, h:mm a")
  );
  console.log(
    chalk.black.bold.bgYellow("[ Data Transfer ]"),
    "Transferring Data from Redis to MongoDB Each::",
    intervalTime / 3600000,
    "hour."
  );

  let interval = setInterval(() => {
    console.log(ui.horizontalLine);
    console.log(
      chalk.black.bold.bgYellow("[ Data Transfer ]"),
      "Start To Transfer..."
    );
    let time = moment().format("dddd, MMMM Do YYYY, h:mm a");
    usersWorker(client)
      .then(visitorsWorker)
      .then(async client => {
        console.log(
          chalk.black.bold.bgYellow("[ Data Transfer ]"),
          "Transferred Successfully At::",
          time
        );
        let buckets = Object.keys(Object.assign({}, usersCont, visitorsCont));
        let reply;
        try {
          reply = await client.hget("transferStatics", "auto");
        } catch (e) {
          console.log(e);
        }
        reply = reply ? JSON.parse(reply) : {};
        reply[time] = buckets;
        await client.hset("transferStatics", "auto", JSON.stringify(reply));
      })
      .catch(async err => {
        console.log(
          chalk.black.bold.bgRed("[ Data Transfer ]"),
          "Error At::",
          time,
          err
        );
        let reply;
        try {
          reply = await client.hget("transferStatics", "auto");
        } catch (e) {
          console.log(e);
        }
        reply = reply ? JSON.parse(reply) : {};
        reply[time] = "fail";
        await client.hset("transferStatics", "auto", JSON.stringify(reply));
        process.exit(0);
      });
  }, intervalTime);
  deferred.resolve(interval);
  return deferred.promise;
};
