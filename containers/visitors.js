const container = {}

container.onlinVisitorsList = (channel,message)=>{}
container.pageViews = (channel,message)=>{}
container.totalVisit = (channel,message)=>{}

module.exports = (channel,message)=>{
    container.onlinVisitorsList(channel,message)
    container.pageViews(channel,message)
    container.totalVisit(channel,message)
}
