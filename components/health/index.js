const { connectToDBs, disconnectFromDBs } = require("../../database");

module.exports = () =>
  connectToDBs()
    .then(() => console.log("databases health is audited successfully."))
    .catch(console.log)
    .finally(() => disconnectFromDBs());
