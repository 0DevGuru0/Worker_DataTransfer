const _ = require("lodash");
const ask = require("../../vendor/inquirer");
const { BaseUI } = require("../../public/util");

class LogsComponent extends BaseUI {
  constructor(props) {
    super(props);
  }

  start(str, parent) {
    let container = _.map(str.trim().split(" "), elem =>
      elem.toLowerCase().trim()
    );
  }
}

module.exports = LogsComponent;
