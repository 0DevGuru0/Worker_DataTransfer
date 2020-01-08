const clc = require("chalk");
const _ = require("lodash");
const ask = require("../../vendor/inquirer"),
  { BaseUI } = require("../../public/util"),
  { auto_all, auto_bucket } = require("./transfer/auto"),
  manualTransfer = require("./transfer/manual");

class StartComponent extends BaseUI {
  constructor() {
    super();
    this.QA_redisBuckets = {
      type: "checkbox",
      message: "Select Buckets for Transfer",
      name: "redisBuckets",
      pageSize: "100",
      choices: [
        new ask.Separator(" = Visitors = "),
        { name: "all_visitor_buckets" },
        { name: "onlineVisitorsList" },
        { name: "pageViews" },
        { name: "visitorsState" },
        new ask.Separator(" = Users = "),
        { name: "all_user_buckets" },
        { name: "onlineUsersList" },
        { name: "totalUsersVerified" },
        { name: "totalUsersList" }
      ],
      validate: answer =>
        answer.length < 1 ? "You must choose at least one topping." : true
    };
    this.QA_intervalTime = {
      type: "list",
      name: "intervalTime",
      default: "24hour",
      message: "From when to when it checks for transferring?",
      choices: ["24hour", "12hour", "9hour", "6hour", "3hour"]
    };
    this.QA_transferMethod = {
      type: "list",
      name: "transferMethod",
      message: "Which method would you prefer to transfer data?",
      choices: ["auto", "manual"]
    };
    this.QA_transferBucket = {
      type: "list",
      name: "transferBucket",
      message: "Which buckets would you prefer to transfer auto?",
      choices: ["all", "custom"],
      when: ans => ans.transferMethod === "auto"
    };
  }
  start(str, parent) {
    ask.promptParent = parent;
    this.manualTransfer = manualTransfer(parent.rl);
    this.auto_all = auto_all();
    this.auto_bucket = auto_bucket();

    let container = _.map(str.trim().split(" "), elem =>
      elem.toLowerCase().trim()
    );
    if (container[1] === "--help" || container.length === 1)
      return this.startHelp();

    if (container[2] === "auto") {
      if (container[3].startsWith("--bucket")) return this.autoBucket();
      if (container[3] === "--all") return this.autoAll();
    }

    if (container[2] === "manual") return this.manual();

    if (container[1] === "transfer" && container.length === 2)
      return this.master();
    container.shift();
    return process.stdout.write(
      clc.bold.black.bgYellow("[ DataTransfer ]"),
      `'${container.join(" ")}' is not a correct command. See 'start --help'.`
    );
  }
  autoBucket() {
    let question = _.concat(this.QA_intervalTime, this.QA_redisBuckets);
    let callback = ({ intervalTime, redisBuckets }) =>
      this.auto_bucket.start(redisBuckets, intervalTime);
    return ask.prompt(question, callback);
  }
  autoAll() {
    let question = _.concat(this.QA_intervalTime);
    let callback = ({ intervalTime }) => this.auto_all.start(intervalTime);
    return ask.prompt(question, callback);
  }
  manual() {
    let question = _.concat(this.QA_redisBuckets);
    let callback = ({ redisBuckets }) =>
      this.manualTransfer.start(redisBuckets);
    return ask.prompt(question, callback);
  }
  master() {
    let question = _.concat(this.QA_transferMethod, this.QA_transferBucket);
    let callback = answers => {
      return answers.transferMethod === "manual"
        ? this.manual()
        : answers.transferBucket === "all"
        ? this.autoAll()
        : this.autoBucket();
    };
    return ask.prompt(question, callback);
  }
  startHelp() {
    this.horizontalLine()
    this.centered(clc.cyan.bold("Start"));
    this.horizontalLine()
    process.stdout.write(
      clc.bold.green("Usage") +
        ":\n" +
        "\tstart [transfer|backup] [auto|manual] --[all|bucket]\n" +
        clc.bold.green("Description") +
        ":\n" +
        "\t\f1/Transfer :\n" +
        "\t\ttransmit Redis last months Data to MongoDB" +
        "\n\t\t& Delete transmitted data from Redis\n" +
        "\t\f2/BackUp :\n" +
        "\t\tStore Redis data to Mongodb" +
        "\n\t\t& don't delete data from Redis\n"
    );
    this.horizontalLine()
  }
}

module.exports = StartComponent;
