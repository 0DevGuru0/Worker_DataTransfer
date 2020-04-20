const col = require("chalk");
const { connectToDBs, disconnectFromDBs } = require("../../database");

let DBs = [];
module.exports = parent =>
  connectToDBs()
    .then(res => {
      console.log(
        `\n\t${col.bold.green(
          "Databases health has been audited successfully."
        )}\n`
      );
      DBs.push(res);
    })
    .catch(console.log)
    .finally(() => {
      if (DBs.length > 0)
        disconnectFromDBs(DBs[0]).then(() => parent.rl.prompt());
    });
