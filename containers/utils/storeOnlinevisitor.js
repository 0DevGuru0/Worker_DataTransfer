const moment    = require('moment'),
    _           = require('Lodash'),
    chalk       = require('chalk'),
    EdgeMonth   = +moment().format("MM"),
    EdgeYear    = +moment().format("YYYY"),
    Visitors    = require('../../model/visitors'),
    onlineVisitorsList = require('../../model/visitors/onlineVisitors');

async function fetchDataFromRedis(client,deferred,config){
    let primitiveData = null
    try{
        primitiveData = await client.hgetall(config.redisBucket)

    }catch(err){ deferred.reject(new Error(err)) }
    //TODO: TEST-----------------------------------------------------------------------
    primitiveData = {
        "2019/10/5": '{"5.122.110.204":6}',
        "2019/10/20": '{"5.122.110.207":6}',
        "2019/09/4": '{"5.121.818.187":3,"5.1231.68.187":10,"5.1421.78.187":30}',
        "2019/09/5": '{"5.121.828.174":14,"5.121.88.1587":3,"35.1721.88.187":3}',
        "2019/05/10": '{"5.157.96.150":3,"8.195.62.188": 817}',
        "2019/05/11": '{"5.257.96.150":100,"8.195.62.188": 100}',
        "2019/06/20": '{"5.121.15.157":3}',
    }
    //*--------------------------------------------------------------------------------
    if (!primitiveData) {
        console.log(chalk.green(`[${config.logBucket}][Redis]`), "Nothing Exist To Store.")
        deferred.resolve(client)
    }
    if (typeof primitiveData === "string") { primitiveData = JSON.parse(primitiveData) }

    return primitiveData
}
async function prepareDataToStore(primitiveData,config){
    let midContain = []
    let TempObj_small = (contain, reply, el) => {
        let Detail = []
        let detailObj = JSON.parse(reply[el])
        _.forIn(detailObj, (value, key) => {
            let slimObj = {}
            slimObj.ip = key
            slimObj.count = value
            Detail.push(slimObj)
        })
        let slimObj = {}
        slimObj.Day = +contain[2]
        slimObj.DateVisi = `${+contain[0]}/${+contain[1]}`
        slimObj.TotalVisit = _.sum(Object.values(detailObj))
        slimObj.TotalVisitors = Object.keys(detailObj).length
        slimObj.Detail = Detail
        return slimObj
    }
    let TempObj = (contain, reply, el, midContain) => {
        let midObj = {}
        let slimObj = TempObj_small(contain, reply, el)
        midObj.Year = +contain[0]
        midObj.Month = +contain[1]
        midObj[config.countBox] = slimObj.TotalVisitors
        midObj[config.countBox2] = slimObj.TotalVisit
        midObj[config.collectionName] = []
        midObj[config.collectionName].push(slimObj)
        midContain.push(midObj)
    }
    _.forIn(primitiveData, (value, key) => {
        let contain = key.split("/");
        let objYear = +contain[0]
        let objMonth = +contain[1]
        if (objYear <= EdgeYear && objMonth < EdgeMonth) {
            if (midContain.length === 0) {
                TempObj(contain, primitiveData, key, midContain)
            } else {
                let elem = midContain[midContain.length - 1]
                if (elem.Year === objYear && elem.Month === objMonth) {
                    let smallObj = TempObj_small(contain, primitiveData, key)
                    elem[config.countBox] += smallObj.TotalVisitors
                    elem[config.countBox2] += smallObj.TotalVisit
                    elem[config.collectionName].push(smallObj)
                } else { TempObj(contain, primitiveData, key, midContain); }
            }
        }
    })
    return midContain
}
async function storeModels(midContain,config){
    let arrLength = midContain.length;
    let modelContainer = []
    let specArr = []
    if (arrLength > 0) {
        console.log(chalk.green(`[${config.logBucket}]`), 'Saving Data To Database...')
        for (let i = 0; i < arrLength; i++) {
            let smallContain = midContain[i]
            let visitor = await Visitors.findOne({
                Year: smallContain.Year,
                Month: smallContain.Month
            })
            let visitorModel = visitor ? visitor : new Visitors({
                Year:   +smallContain.Year,
                Month:  +smallContain.Month,
                onlineCount:    +smallContain.onlineCount,
                totalVisit:     +smallContain.totalVisit
            })
            let onlineCountModel = []
            let specificCollection = smallContain[config.collectionName]
            specArr.push(...specificCollection)
            let smallArrLength = specificCollection.length;
            if (smallArrLength > 0) {
                for (let i = 0; i < smallArrLength; i++) {
                    let { Day, Total, Detail ,TotalVisit,TotalVisitors} = specificCollection[i]
                    const model = new onlineVisitorsList({ 
                        Day,Total,Detail,TotalVisit,TotalVisitors,
                        DateVisi:`${smallContain.Year}/${smallContain.Month}` })
                    onlineCountModel.push(model)
                }
            }
            visitorModel[config.collectionName].push(...onlineCountModel)
            modelContainer.push(visitorModel,...onlineCountModel)
        }
    }
    return modelContainer;
}
async function deleteDataFromRedis(client,deferred,config){
    try{
        await client.del(config.redisBucket)
        console.log(chalk.green(`[${config.logBucket}]`),'removed from redis.')
        deferred.resolve();
    }catch(err){
        console.log( chalk.green(`[${config.logBucket}]`), chalk.white.bgRed("[ERROR]"), err.message)
        deferred.resolve()
    }
}
module.exports = async (client, deferred) => {
    let config = {
        redisBucket     :   "online:visitors:TList",
        logBucket       :   "onlineVisitorList",
        collectionName  :   "onlineList",
        countBox        :   "onlineCount",
        countBox2       :   "totalVisit"
    }
    let primitiveData   = await fetchDataFromRedis(client,deferred,config)
    let midContain      = await prepareDataToStore(primitiveData,config)
    let modelContainer  = await storeModels(midContain,config)
    Promise.all(modelContainer.map(el => el.save()))
        .then(async () => {
            console.log(chalk.green(`[${config.logBucket}]`), 'Saved Data To Database...')
            // await deleteDataFromRedis(client,deferred,config)
            console.log(chalk.bold('-------------------------------------------------------------'))
            deferred.resolve(client)
        })
        .catch((e) =>deferred.reject(new Error(e.message)))
}