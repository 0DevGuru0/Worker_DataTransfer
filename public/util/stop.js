const col = require("chalk");
const autoTransfer = require("../../components/start/transfer/auto");
const manualTransfer = require("../../components/start/transfer/manual");

let vary = true;
let cb = () => {
  vary = true;
  console.log(col.black.bold.bgGreen("Transfer Operation turned off."));
};
module.exports = async (parent, str) => {
  let all = autoTransfer().initialize();
  let Manual = manualTransfer().initialize();

  if ((all || Manual) && vary) {
    vary = false;
    if (Manual)
      await manualTransfer()
        .stop()
        .then(cb);
    if (all)
      await autoTransfer()
        .stop()
        .then(cb);
  } else if (str === "stop")
    console.log("No operation or interval has been started yet.");
};
