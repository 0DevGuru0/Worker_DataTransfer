const _ = require("lodash");
const col = require("chalk");
const ask = require("../../vendor/inquirer");

const { RedisDB } = require("../../database");

const { Base } = require("../../public/util");
const { ui } = require("../../helpers");
const logReport = require("../../containers/transfer/log");

class LogsComponent extends Base {
  constructor(props) {
    super(props);
    this.methods = ["auto", "manual", "all"];
    this.fetchData = (redis, bucket, field) => {
      if (field === this.methods[2]) field = _.dropRight(this.methods);
      return new Promise((res, rej) =>
        redis.hmget(bucket, field, (err, reply) => {
          if (reply) res(reply);
          if (err) rej(err);
        })
      );
    };

    this.QA_count = {
      type: "input",
      name: "specifiedCount",
      message: "How many latest transfer do you want?",
      default: () => 10,
      validate: val => {
        if (Number.isInteger(+val)) return true;
        return false;
      }
    };
    this.QA_method = {
      type: "list",
      name: "specifiedMethod",
      message: "Which method would you prefer to show logs?",
      choices: this.methods
    };
  }

  start(str, parent) {
    ask.promptParent = parent;
    let container = this.splitInter(str);
    if (
      container.length > 5 ||
      (container.length > 2 && !Number.isInteger(+container[2])) ||
      (container.length > 4 && !Number.isInteger(+container[4]))
    ) {
      return this.help();
    }
    if (container.length === 2 && container[1] === "--all") {
      return this.run("both", "all");
    }
    if (
      (container[1] === "--l" && container[3] === "--m") ||
      (container[1] === "--L" && container[3] === "--M")
    ) {
      return this.run(container[4], container[2]);
    }
    if (
      (container[3] === "--l" && container[1] === "--m") ||
      (container[3] === "--L" && container[1] === "--M")
    ) {
      return this.run(container[2], container[4]);
    }
    if (container[1] === "--l" || container[1] === "--L") {
      return this.run(null, container[2]);
    }
    if (container[1] === "--m" || container[1] === "--M") {
      return this.run(container[2], null);
    }
    return this.run();
  }

  run(method, count) {
    if (!method && !count) {
      // ask for method and count
      let question = _.concat(this.QA_method, this.QA_count);
      let callback = ({ specifiedMethod, specifiedCount }) =>
        this.log(specifiedMethod, +specifiedCount);
      return ask.prompt(question, callback);
    }
    if (!method) {
      // ask for method
      let question = _.concat(this.QA_method);
      let callback = ({ specifiedMethod }) => this.log(specifiedMethod, count);
      return ask.prompt(question, callback);
    }
    if (!count) {
      // ask for Count
      let question = _.concat(this.QA_count);
      let callback = ({ specifiedCount }) => this.log(method, +specifiedCount);
      return ask.prompt(question, callback);
    }
    return this.log(method, count);
  }

  log(method, count) {
    // fetchData from redis
    return RedisDB().then(redis =>
      this.fetchData(redis, "transferStatics", method)
        .then(res => {
          if (res.length === this.methods.length - 1) {
            let [auto, manual] = res;

            auto = JSON.parse(auto);
            console.log(
              logReport({
                buckets: auto,
                timeContainer: _.take(_.reverse(Object.keys(auto)), count),
                field: "auto"
              })
            );

            manual = JSON.parse(manual);
            console.log(
              logReport({
                buckets: manual,
                timeContainer: _.take(_.reverse(Object.keys(manual)), count),
                field: "manual"
              })
            );
          } else {
            res = JSON.parse(...res);
            console.log(
              logReport({
                buckets: res,
                timeContainer: _.take(_.reverse(Object.keys(res)), count),
                field: method
              })
            );
          }
          console.log(ui.horizontalLine());
        })
        .catch(console.log)
    );
  }

  help() {
    let context =
      `${col.bold.green("Usage")}:\n` +
      `\tlog --m [auto|manual] --l [logCount] --all\n${col.bold.green(
        "Description"
      )}:\n` +
      `\t1/ l (--l) :\n` +
      `\t\tnumber of last bucket\n` +
      `\t2/ m (--m) :\n` +
      `\t\tmethod that buckets transferred`;
    console.log(this.helpCommand("Log", context));
  }
}

module.exports = LogsComponent;
