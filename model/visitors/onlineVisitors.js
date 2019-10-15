const {Schema,model} = require('mongoose')

const onlineVisitors = new Schema({
    DateVisi:{type:String},
    Day:{type:Number,index:{sparse:true,background:true}},
    TotalVisit:{type:Number},
    TotalVisitors:{type:Number},
    Detail:[{
        ip:{type:String},
        count:{type:Number}
    }]
});

module.exports = model('onlineVisitorsList',onlineVisitors)
