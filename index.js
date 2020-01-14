const figlet = require("figlet");
const CliInterface = require("./public");
console.clear();
figlet("Data Transfer", function(err, data) {
  console.log(data);
  const cli = new CliInterface();
  cli.eventListeners();
  cli.init();
});
