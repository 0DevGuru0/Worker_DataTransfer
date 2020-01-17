const cliWidth = require("cli-width");
const ttys = require("ttys");
const col = require("chalk");
const cli_Width = cliWidth({
  defaultWidth: 80,
  output: ttys.output
});
const horizontalLine = col.bold("-".repeat(cli_Width));
const centralize = (str, width = cli_Width) => {
  if (width > cli_Width) width = cli_Width + 15;
  let leftPadding = Math.floor((width - str.length) / 2);
  let line = "";
  for (let i = 0; i < leftPadding; i++) {
    line += " ";
  }
  line += str;
  return line;
};

const fullText = text => {
  let decText = centralize(text);
  decText = "[" + decText;
  let rightPadding = cli_Width - decText.length;
  let line = "";
  for (let i = 1; i < rightPadding; i++) {
    line += " ";
  }
  decText += line;
  decText += "]";
  return decText;
};
module.exports = {
  horizontalLine: col.bold("-".repeat(cli_Width)),
  centralize,
  fullText,
  cli_Width
};
