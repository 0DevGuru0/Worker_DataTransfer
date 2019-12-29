const { Schema, model } = require("mongoose");
const pageViews = new Schema({
  DateVisi: { type: String },
  Day: { type: Number },
  Detail: [
    {
      page: { type: String },
      count: { type: Number }
    }
  ]
});
module.exports = model("pageViewsCount", pageViews);
