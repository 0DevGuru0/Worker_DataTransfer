const Q = require("q");
const col = require("chalk");
const { fromEvent } = require("rxjs");
const fig = require("figures");
const { filter, take } = require("rxjs/operators");

const { ui, loading } = require("../../../../helpers");

const _stopOrder = new WeakMap();
module.exports = class UILog {
  constructor(props) {
    _stopOrder.set(this, false);
    this.config = props.config;
    this.client = props.client;
    this.logBucket = props.config.logBucket;
    this.initiate = col.green(`${fig.tick} [${this.logBucket}]`);
    this.spinners();
    this.events();
  }

  spinners() {
    this.load1 = loading.spin1(
      `${col.red(
        `[${this.logBucket}]`
      )} preparing Data for saving into the Database...`
    );
    this.load2 = loading.spin1(
      `${col.red(`[${this.logBucket}]`)} Saving Data To Database...`
    );
    this.load3 = loading.spin1(
      `${col.red(`[${this.logBucket}]`)} Deleting From RedisDB...`
    );
  }

  events() {
    this.ev = fromEvent(process.stdin, "keypress", (value, key) => ({
      value,
      key: key || {}
    }))
      .pipe(
        filter(({ key }) => key && key.ctrl && key.name === "x"),
        take(1)
      )
      .subscribe(() => {
        console.log("\r");
        console.log(
          col.bold.bgRed(ui.fullText("start to canalling process..."))
        );
        _stopOrder.set(this, true);
      });
  }

  initialLog() {
    this.load1.start();
    if (_stopOrder.get(this)) throw new Error("SIGSTOP");
  }

  preparedDataLog() {
    this.load1.stop();
    console.log(this.initiate, "Prepared Data For Saving Into The Database...");
    this.load2.start();
    if (_stopOrder.get(this)) throw new Error("SIGSTOP");
  }

  storedDataLog() {
    this.load2.stop();
    console.log(this.initiate, "Saved Data To Database...");
    this.load3.start();
    if (_stopOrder.get(this)) throw new Error("SIGSTOP");
  }

  deletedDataLog() {
    this.load3.stop();
    console.log(`${this.initiate} Data Deleted From Redis...`);
    if (_stopOrder.get(this)) throw new Error("SIGSTOP_DONE");
  }

  async catchAllError(err) {
    await Promise.all([this.load3.stop(), this.load1.stop(), this.load2.stop()])
      .then(() => {
        _stopOrder.set(this, false);
        let error;
        if (err.message === "SIGSTOP") {
          error = {
            err: col.bold.bgRed(ui.fullText("process stopped successfully.")),
            done: false
          };
        } else if (err.message === "SIGSTOP_DONE") {
          error = {
            err: col.bold.bgRed(ui.fullText("process stopped successfully.")),
            done: true
          };
        } else {
          error = { err, done: false };
        }

        this.deferred.reject(error);
      })
      .catch(reason => this.deferred.reject(`${err}||||${reason}`));
  }

  master({ Prepare, Save, Delete, Initial }) {
    this.deferred = Q.defer();
    if (!Initial) Initial = { client: this.client, config: this.config };
    Q(Initial)
      .tap(() => this.initialLog())
      .then(Prepare)
      .tap(() => this.preparedDataLog())
      .then(Save)
      .tap(() => this.storedDataLog())
      .then(Delete)
      .tap(() => this.deletedDataLog())
      .then(this.deferred.resolve)
      .catch(async err => {
        await this.catchAllError(err);
      })
      .finally(() => {
        if (!this.ev.closed) this.ev.unsubscribe();
      });
    return this.deferred.promise;
  }
};
