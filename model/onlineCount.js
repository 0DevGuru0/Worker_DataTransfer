const {Schema,model} = require('mongoose');

const onlineCount = new Schema({
    Days:[{ Day: Number, Count:Number }]
});

module.exports = model('onlineUsersCount',onlineCount)