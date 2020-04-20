const clc = require("chalk");
const _ = require("lodash");
const BaseUI = require("./base");
const { ui } = require("../../helpers");

module.exports = class Man extends BaseUI {
  constructor() {
    super();
    this.commands = {
      man: "Show help Page",
      help: "Alias for 'man' command",
      status: "Get statistics on the underlying operating system",
      start: "Start Manually Transferring functions",
      log: "Report underlying transferring",
      test: "Start testing engine for system",
      health: "check Databases reliability",
      setting: "General settings of operating system",
      exit: "Kill the CLI (and the rest of the application)",
      stop: "Stop Interval from automation transfer"
    };
  }

  run(possibleCommands) {
    let lengths = [];
    let lines = [];
    _.forEach(possibleCommands, elem => {
      let line = `${clc.bold.yellow(elem)} `;
      let padding = 40 - line.length;
      for (let space = 0; space <= padding; space++) {
        line += "-";
      }
      // eslint-disable-next-line no-unused-expressions
      Object.prototype.hasOwnProperty.call(this.commands, elem)
        ? (line += ` ${this.commands[elem]}`)
        : (line += clc.red("Undefined Yet"));
      lengths.push(padding.length);
      lines.push(line);
    });
    console.log(ui.horizontalLine(74));
    console.log(ui.centralize(`__CLI Manual__`, 70));
    console.log(ui.horizontalLine(74));
    _.forEach(lines, el => {
      console.log(el);
    });
    console.log(ui.horizontalLine());
  }
};
