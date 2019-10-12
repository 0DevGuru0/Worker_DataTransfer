const {Schema,model} = require('mongoose')

const visitorsSchema = new Schema({
    Year: {
        type: Number,
        required:true,
        index: {
            sparse: true,
            background: true
        }
    },
    Month: {
        type: Number,
        unique:true,
        required:true
    },
    onlineCount: [{
        type: Schema.Types.ObjectId,
        ref: 'onlineVisitors'
    }],
    // pageViews: [{
    //     type: Schema.Types.ObjectId,
    //     ref: 'onlineUsersCount'
    // }],
    // totalVisit: [{
    //     type: Schema.Types.ObjectId,
    //     ref: 'onlineUsersCount'
    // }],
})
module.exports = model('Visitors',visitorsSchema)