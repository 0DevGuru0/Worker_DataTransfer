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

const log = async (buckets, client, timeContainer) => {
  let statisticLogs = JSON.parse(await client.hget("transferStatics", "auto"));
  const contain = timeContainer.filter(time =>
    statisticLogs[time] && statisticLogs[time] !== "fail" ? true : false
  );
  let outputSchema = text =>
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
