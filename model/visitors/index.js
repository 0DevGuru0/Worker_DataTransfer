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
    onlineCount:{
        type:Number
    },
    totalVisit:{
        type:Number
    },
    onlineList: [{
        type: Schema.Types.ObjectId,
        ref: 'onlineVisitorsList'
    }],
    pageViews: [{
        type: Schema.Types.ObjectId,
        ref: 'pageViewsCount'
    }],
    // totalVisit: [{
    //     type: Schema.Types.ObjectId,
    //     ref: 'onlineUsersCount'
    // }],
})
module.exports = model('Visitors',visitorsSchema)