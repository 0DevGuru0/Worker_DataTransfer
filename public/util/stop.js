const col = require("chalk");
const {
    auto_all,
    auto_bucket
  } = require("../../components/start/transfer/auto"),
  manualTransfer = require("../../components/start/transfer/manual");
let vary = true;
let cb = () => {
  vary = true;
  console.log(col.black.bold.bgGreen("Transfer Operation turned off."));
};
module.exports = async (parent, str) => {
  let all = auto_all().initialize();
  let bucket = auto_bucket().initialize();
  let Manual = manualTransfer().initialize();

  if ((all || bucket || Manual) && vary) {
    vary = false;
    if (Manual)
      await manualTransfer()
        .stop()
        .then(cb);
    if (all)
      await auto_all()
        .stop()
        .then(cb);
    if (bucket)
      await auto_bucket()
        .stop()
        .then(cb);
  } else {
    str === "stop"
      ? console.log("no Operation or Interval has been set Yet.")
      : "";
  }
};
