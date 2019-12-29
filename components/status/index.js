const os = require("os"),
  v8 = require("v8"),
  { Gauge, Progress } = require("clui"),
  clc = require("chalk"),
  Q = require("q"),
  _ = require("lodash"),
  { MongoDB, RedisDB } = require("../../database");
const ask = require("../../vendor/inquirer");
const { BaseUI } = require("../../public/util");

class StatusHandler extends BaseUI {
  constructor(props) {
    super(props);
    this.list = {
      "System Platform": os.platform(),
      "Host Name": os.hostname(),
      "CPU architecture": os.arch(),
      "Load Average": os.loadavg().join(" "),
      "CPU Count": os.cpus().length,
      "Used Memory": this.memory(),
      "Current Malloced Memory":
        Math.ceil(v8.getHeapStatistics().malloced_memory / 1000000) + " MB",
      "Peak Malloced Memory":
        Math.ceil(v8.getHeapStatistics().peak_malloced_memory / 1000000) +
        " MB",
      "Used Malloced Memory": this.mallocedMemory(),
      "Used Heap Used (%)": this.heapSize(),
      "Available Heap Allocated (%)": this.availableHeap(),
      Uptime: Math.round(os.uptime() / 60) + " min"
    };
  }
  mallocedMemory() {
    let { malloced_memory, peak_malloced_memory } = v8.getHeapStatistics();
    let used = peak_malloced_memory - malloced_memory;
    let human = Math.ceil(used / 1000000) + " MB";
    return Gauge(
      malloced_memory,
      peak_malloced_memory,
      20,
      peak_malloced_memory * 0.8,
      human
    );
  }
  availableHeap() {
    let { heap_size_limit, total_heap_size } = v8.getHeapStatistics();
    let percent = Math.round((total_heap_size / heap_size_limit) * 100);
    return new Progress(20).update(percent, 100);
  }
  heapSize() {
    let { used_heap_size, total_heap_size } = v8.getHeapStatistics();
    let used = total_heap_size - used_heap_size;
    let human = Math.ceil(used / 1000000) + " MB";
    return Gauge(
      used_heap_size,
      total_heap_size,
      20,
      total_heap_size * 0.8,
      human
    );
  }
  memory() {
    let total = os.totalmem(),
      free = os.freemem(),
      used = total - free,
      human = Math.ceil(used / 1000000) + " MB";
    return Gauge(used, total, 20, total * 0.8, human);
  }
  statsUi(list, name) {
    let lengths = [];
    let lines = [];
    _.forIn(list, (value, key) => {
      let line = "âï¸  " + clc.bold.yellow(key) + " ";
      let padding = (this.width / 4) * 3 - line.length;
      for (let space = 0; space <= padding; space++) {
        line += "-";
      }
      list.hasOwnProperty(key)
        ? (line += " " + list[key])
        : (line += clc.red("Undefined Yet"));
      lengths.push(padding.length);
      lines.push(line);
    });
    this.horizontalLine(this.width);
    this.centered(`ð§­  ${name} ð§­`, this.width);
    this.horizontalLine(this.width);
    _.forEach(lines, el => console.log(el));
    this.horizontalLine(this.width);
    this.verticalSpace();
  }
  systemStatus(inter) {
    this.statsUi(this.list, "Status");
    inter.prompt();
  }
  transferHandler(bucket) {
    RedisDB().then(async redis => {
      const client = asyncRedis.decorate(redis);
      bucket = bucket === "all" ? ["auto", "manual"] : [bucket];
      let redisBucket = await client.hmget("transferStatics", ...bucket);
      _.forEach(redisBucket, val => {
        val = JSON.parse(val);
        console.log(val);
      });
      await client.quit();
    });
  }
  transferStatus(inter) {
    let question = [
      {
        type: "list",
        name: "methodSpec",
        default: "all",
        message: "Which method logs would you like to see??",
        choices: ["auto", "manual", "all"]
      },
      {
        type: "input",
        name: "logsCount",
        default: 10,
        message: "How many transferred logs log?"
      }
    ];
    ask.prompt(question).then(({ methodSpec, logsCount }) => {
      console.log({ methodSpec, logsCount });
      this.transferHandler(methodSpec);
    });
  }
  async databaseData() {
    var deferred = Q.defer();
    RedisDB().then(async redis => {
      const client = asyncRedis.decorate(redis);
      let redisInfo = (await client.info()).toString();
      let regex2 = /'n(\w+|)/g;
      let regex3 = /('"# \w+|#\s\w+|"')/g;
      redisInfo = redisInfo.replace(regex3, "").replace(regex2, "");
      let arr = redisInfo.split("\r\n");
      let Obj = {};
      _.forEach(arr, value => {
        if (value.length > 0) {
          let smArr = value.split(":");
          isNaN(smArr[1])
            ? (Obj[smArr[0]] = smArr[1])
            : (Obj[smArr[0]] = +smArr[1]);
        }
      });
      redisInfo = Obj;
      MongoDB(redis).then(async ({ redis, mongoose, stats }) => {
        let mongoDBInfo = stats;
        await mongoose.disconnect();
        await redis.quit();
        console.log(
          chalk.black.bold.bgMagentaBright("[ Redis ]"),
          "connection closed successfully"
        );
        deferred.resolve({ redisInfo, mongoDBInfo });
      });
    });
    return deferred.promise;
  }
  databaseStatus(inter) {
    return this.databaseData().then(({ redisInfo, mongoDBInfo }) => {
      this.statsUi(redisInfo, "REDIS");
      this.statsUi(mongoDBInfo, "MONGODB");
      inter.prompt();
    });
  }
  allStatus(inter) {
    this.systemStatus(inter);
    this.transferStatus(inter);
    this.databaseStatus(inter);
  }
  master(inter) {
    let question = [
      {
        type: "list",
        name: "statusSection",
        default: "system",
        message: "Which status would you like to see?",
        choices: ["system", "database", "transfer", "all"]
      }
    ];
    ask.prompt(question).then(({ statusSection }) => {
      switch (statusSection) {
        case "system":
          return this.systemStatus(inter);
        case "database":
          return this.databaseStatus(inter);
        case "transfer":
          return this.transferStatus(inter);
        case "all":
          return this.allStatus(inter);
        default:
          return this.allStatus(inter);
      }
    });
  }
}
module.exports = StatusHandler;
