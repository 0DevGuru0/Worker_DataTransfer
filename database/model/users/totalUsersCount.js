const { Schema, model } = require("mongoose");

const totalCount = new Schema({
  Days: [{ Day: Number, Count: Number }]
});

module.exports = model("totalUsersCount", totalCount);
