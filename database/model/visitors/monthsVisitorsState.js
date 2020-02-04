const { Schema, model } = require("mongoose");

const monthsVisitorsState = new Schema({
  Year: { type: String },
  Month: { type: String },
  CountryState: { type: Schema.Types.Mixed },
  CityState: [
    {
      country: { type: String },
      city: { type: String },
      count: { type: Number }
    }
  ],
  DaysDetail: [
    {
      type: Schema.Types.ObjectId,
      ref: "daysDetailState"
    }
  ]
});
module.exports = model("monthsVisitorsState", monthsVisitorsState);
