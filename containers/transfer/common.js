const { ui } = require("../../helpers");
const col = require("chalk");
module.exports = {
  uiBeforeComplete: time => {
    console.log(
      col.black.bold.bgYellow("[ Data Transfer ]"),
      "System Initialized..."
    );
    console.log(
      col.black.bold.bgYellow("[ Data Transfer ]"),
      "Started Time::",
      time
    );
    console.log(
      col.black.bold.bgYellow("[ Data Transfer ]"),
      "Start To Transfer..."
    );
    console.log(
      col.bold.bgWhite.blue(
        ui.fullText("Press ctrl+x to stop the process of transferring data")
      )
    );
  },
  statisticLog: ({ time, staticsBucket }) => {
    ui.horizontalLine +
      "\n" +
      ui.centralize(col.bold("Data Transfer statistic")) +
      "\n" +
      col.bold.bgGreen("Transferred Buckets:") +
      "\n\t" +
      staticsBucket.replace(/:/gi, "\n\t") +
      "\n" +
      col.bold.bgGreen("Transferred Time:") +
      "\n\t" +
      time;
  }
};
