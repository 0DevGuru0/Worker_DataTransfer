const cliWidth = require("cli-width");
const ttys = require("ttys");
const col = require("chalk");
const cli_Width = cliWidth({
  defaultWidth: 80,
  output: ttys.output
});
module.exports = {
  horizontalLine: col.bold("-".repeat(cli_Width))
};
