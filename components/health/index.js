const col = require("chalk");
const { connectToDBs, disconnectFromDBs } = require("../../database");

let DBs = [];
module.exports = () =>
  connectToDBs()
    .then(res => {
      console.log(
        `\n\t${col.bold.green("databases health is audited successfully.")}\n`
      );
      DBs.push(res);
      return res;
    })
    .catch(console.log)
    .finally(() => {
      if (DBs.length > 0) disconnectFromDBs(DBs[0]);
    });
