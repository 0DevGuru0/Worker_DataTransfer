const { Schema, model } = require("mongoose");

const visitorsState = new Schema({
  Year: { type: String },
  CountryState: { type: Schema.Types.Mixed },
  CityState: [
    {
      country: { type: String },
      city: { type: String },
      count: { type: Number }
    }
  ],
  MonthsDetail: [
    {
      type: Schema.Types.ObjectId,
      ref: "monthsVisitorsState"
    }
  ]
});
module.exports = model("visitorsState", visitorsState);
