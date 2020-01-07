const { Schema, model } = require("mongoose");

const totalVerifiedCount = new Schema({
  Days: [{ Day: Number, Count: Number }]
});

module.exports = model("totalVerifiedUsers", totalVerifiedCount);
