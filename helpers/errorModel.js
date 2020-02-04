const _ = require("lodash");
const fig = require("figures");
const col = require("chalk");

module.exports = (logBucket, section, message) =>
  _.join(
    [
      col.red(fig.warning),
      col.red(`[${logBucket}]`),
      col.white.bgRed("[ERROR]"),
      col.bold.red(`[${section}]`),
      col.bold(message.message)
    ],
    " "
  );
