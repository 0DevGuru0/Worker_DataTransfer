const { Schema, model } = require("mongoose");

const Users = new Schema({
  Year: {
    type: Number,
    required: true,
    index: {
      sparse: true,
      background: true
    }
  },
  Month: {
    type: Number,
    unique: true,
    required: true
  },
  onlineCount: [
    {
      type: Schema.Types.ObjectId,
      ref: "onlineUsersCount"
    }
  ],
  totalUsers: [
    {
      type: Schema.Types.ObjectId,
      ref: "totalUsersCount"
    }
  ],
  totalVerifiedUsers: [
    {
      type: Schema.Types.ObjectId,
      ref: "totalVerifiedUsers"
    }
  ]
});
module.exports = model("Users", Users);
