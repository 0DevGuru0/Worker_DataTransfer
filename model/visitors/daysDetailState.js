const {Schema,model} = require('mongoose')
const daysDetailState = new Schema({
    Date:{type:String},
    CountryState:{type:Schema.Types.Mixed},
    CityState:[{
        city:{type:String},
        count:{type:Number}
    }]
})
module.exports = model('daysDetailState',daysDetailState)