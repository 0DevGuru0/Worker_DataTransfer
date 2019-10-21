
const moment    = require('moment'),
    _           = require('Lodash'),
    chalk       = require('chalk'),
    pageViews   = require('../../model/visitors/pageViews'),
    Visitors    = require('../../model/visitors'),

    EdgeYear    = +moment().format("YYYY"),
    EdgeMonth   = +moment().add(1,"month").format("MM");
// TODO: const EdgeMonth = +moment().format("MM");


async function fetchDataFromRedis(client,deferred){
    let reply = null
    try{ reply = await client.smembers('pageViews:List:keys') }
    catch(err){ 
        console.log( chalk.bold.bgRed('Error Ocurred At:'), '[Visitors]', '[pageViewsFunction]' )
        deferred.reject(err) 
    }
    return reply
}
function TempObj_small(contain, reply, el){
    let Detail = []
    let detailObj = JSON.parse(reply[el])
    _.forIn(detailObj, (value, key) => {
        let slimObj = {}
        slimObj.page = key
        slimObj.count = value
        Detail.push(slimObj)
    })
    let slimObj = {}
    slimObj.Day = +contain[2]
    slimObj.DateVisi = `${+contain[0]}/${+contain[1]}`
    slimObj.Detail = Detail
    return slimObj
}
function TempObj(contain, reply, el, midContain,config){
    let midObj = {}
    let slimObj = TempObj_small(contain, reply, el)
    midObj.Year = +contain[0]
    midObj.Month = +contain[1]
    midObj[config.collectionName] = []
    midObj[config.collectionName].push(slimObj)
    midContain.push(midObj)
}
async function DataPrepare(client,deferred,config){
    let reply = await fetchDataFromRedis(client,deferred)
    if(reply && reply.length === 0 ){
        console.log(chalk.green(`[${config.logBucket}]`), 'Nothing has exist in bucket...')
        deferred.resolve(client)
    }
    let container = {}
    let midContain = []
    for(let i=0;i<reply.length;i++){
        let result = JSON.stringify(await client.hgetall(reply[i]))
        let date = reply[i].split(':')[1]
        container[date] = result
    }
    _.forIn(container, (value, key) => {
        let contain = key.split("/");
        let objYear = +contain[0]
        let objMonth = +contain[1]
        if (objYear <= EdgeYear && objMonth < EdgeMonth) {
            if (midContain.length === 0) {
                TempObj(contain, container, key, midContain,config.collectionName)
            } else {
                let elem = midContain[midContain.length - 1]
                if (elem.Year === objYear && elem.Month === objMonth) {
                    elem[config.collectionName].push(TempObj_small(contain, container, key))
                } else { TempObj(contain, container, key, midContain,config.collectionName); }
            }
        }
    })
    return midContain
}
async function StorePrepare(midContain,client,deferred,config){
    let arrLength = midContain.length;
    let modelContainer = []
    let specArr = []
    if (arrLength === 0) {
        console.log(chalk.green(`[${config.logBucket}]`), 'Nothing has exist in bucket...')
        deferred.resolve(client)
    }
    console.log(chalk.green(`[${config.logBucket}]`), 'Saving Data To Database...')
    for (let i = 0; i < arrLength; i++) {

        let smallContain = midContain[i]
        let visitor = await Visitors.findOne({
            Year: +smallContain.Year,
            Month: +smallContain.Month
        })
        let visitorModel = visitor ? visitor : new Visitors({
            Year:   +smallContain.Year,
            Month:  +smallContain.Month
        })
        let pageViewsModel = []
        let specificCollection = smallContain[config.collectionName]
        specArr.push(...specificCollection)
        let smallArrLength = specificCollection.length;
        if (smallArrLength > 0) {
            for (let i = 0; i < smallArrLength; i++) {
                let { Day, Detail,DateVisi} = specificCollection[i]
                const model = new pageViews({ Day,Detail,DateVisi })
                pageViewsModel.push(model)
            }
        }
        visitorModel[config.collectionName].push(...pageViewsModel)
        modelContainer.push(visitorModel,...pageViewsModel)
    }
    if(modelContainer.length===0){
        console.log( chalk.bold.bgRed('Error Ocurred At:'), '[Visitors]', '[pageViewsFunction]' )
        deferred.reject('Nothing has been exist to store to Mongodb...') 
    }
    return modelContainer
}
async function deleteDataFromRedis(client,deferred,config){
    try{
        await client.del(config.redisBucket)    
    }catch(err){
        console.log( chalk.green(`[${config.logBucket}]`), chalk.white.bgRed("[ERROR]"), err.message) 
        deferred.resolve()
    }
    console.log(chalk.green(`[${config.logBucket}]`),'removed from client.')
    deferred.resolve(client);
}
module.exports = async (client,deferred)=>{
    let config = {
        collectionName:"pageViews",
        logBucket: "pageViews"
    }
    let midContain = await DataPrepare(client,deferred,config)
    let modelContainer = await StorePrepare(midContain,client,deferred,config)
    Promise.all(modelContainer.map(el => el.save()))
    .then(()=>{
        console.log(chalk.green(`[${config.logBucket}]`), 'Saved Data To Database...')
        console.log(chalk.bold('-------------------------------------------------------------'))
        // await deleteDataFromRedis(client,deferred,config)
    })
    .catch(err=>{
        console.log( chalk.bold.bgRed('Error Ocurred At:'), '[Visitors]', '[pageViewsFunction]' )
        deferred.reject(new Error(err))
    })
}

