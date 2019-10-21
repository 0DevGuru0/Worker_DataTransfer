const { Schema, model } = require('mongoose')

const visitorsSchema = new Schema({
    Year: {
        type: Number,
        required: true,
        index: {
            sparse: true,
            background: true
        }
    },
    Month: {
        type: Number,
        index: {
            sparse: true,
            background: true
        }
    },
    onlineCount: {
        type: Number
    },
    totalVisit: {
        type: Number
    },
    onlineList: [{
        type: Schema.Types.ObjectId,
        ref: 'onlineVisitorsList'
    }],
    pageViews: [{
        type: Schema.Types.ObjectId,
        ref: 'pageViewsCount'
    }],
    VisitorsState: [{
        type: Schema.Types.ObjectId,
        ref: 'monthsVisitorsState'
    }],
})
module.exports = model('Visitors', visitorsSchema)