const {Schema,model} = require('mongoose')

const onlineVisitors = new Schema({
    Day:{type:Number,index:{sparse:true,background:true}},
    Total:{type:Number},
    Detail:[{
        ip:{type:String},
        count:{type:Number}
    }]
});

module.exports = model('onlineVisitors',onlineVisitors)
