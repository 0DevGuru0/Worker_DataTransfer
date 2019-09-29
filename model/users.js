const {Schema,model} = require('mongoose');

const Users = new Schema({
    month:{ type:Date },
    onlineCount:{ type:Number },
    totalVerified:{ type:Number },
    totalusers:{ type:Number }
});

module.exports = model('Users',Users)