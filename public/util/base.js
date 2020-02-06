const cliWidth = require("cli-width");
const ttys = require("ttys");
const col = require("chalk");
const _ = require("lodash");
const { ui } = require("../../helpers");
const strWidth = require("string-width");
class BaseUI {
  splitInter(inter) {
    return _.map(inter.trim().split(/[= \s]/g), elem =>
      elem.toLowerCase().trim()
    );
  }

  helpCommand(title, context) {
    let content = `${ui.horizontalLine()}\n`;
    content += `${ui.centralize(col.cyan.bold(title))}\n`;
    content += `${ui.horizontalLine()}\n`;
    content += `${context}\n`;
    content += ui.horizontalLine();
    return content;
  }
}
module.exports = BaseUI;
