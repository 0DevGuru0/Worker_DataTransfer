const col = require("chalk");
const { ui } = require("../../helpers");

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
  }
};
