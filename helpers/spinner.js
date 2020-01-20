const { Spinner } = require("clui");
module.exports = {
  spin1: msg => new Spinner(msg, ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"]),
  spin2: msg => new Spinner(msg, ["◜", "◠", "◝", "◞", "◡", "◟"])
};
