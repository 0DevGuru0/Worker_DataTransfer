const cliWidth = require("cli-width");
const ttys = require("ttys");
const col = require("chalk");

class BaseUI {
  constructor() {
    this.width = cliWidth({
      defaultWidth: 80,
      output: ttys.output
    });
    process.stdout.on("resize", () => {
      this.width = cliWidth({
        defaultWidth: 80,
        output: ttys.output
      });
    });
  }

  centered(str, width = this.width) {
    if (width > this.width) width = this.width + 15;
    let leftPadding = Math.floor((width - str.length) / 2);
    let line = "";
    for (let i = 0; i < leftPadding; i++) {
      line += " ";
    }
    line += str;
    console.log(line);
  }

  horizontalLine(width = this.width) {
    if (width > this.width) width = this.width;
    console.log(col.bold("-".repeat(width)));
  }

  verticalSpace() {
    console.log("\n");
  }
}
module.exports = BaseUI;
