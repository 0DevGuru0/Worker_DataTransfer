const moment    = require('moment'),
    Q           = require('q'),
    _           = require('Lodash'),
    col         = require('chalk'),
    EdgeMonth   = +moment().format("MM"),
    EdgeYear    = +moment().format("YYYY"),
    Visitors    = require('../../model/visitors'),
    {ui}        = require('../../helper'),
    onlineVisitorsList = require('../../model/visitors/onlineVisitors');

const fetchDataFromRedis=(client,config)=>{
    let deferred = Q.defer();
    client.hgetall(config.redisBucket)
    .catch(deferred.reject)
    .then(primitiveData=>{
        //TODO: TEST
        // deferred.resolve({
        //     "2019/10/5": '{"5.122.110.204":6}',
        //     "2019/10/20": '{"5.122.110.207":6}',
        //     "2019/09/4": '{"5.121.818.187":3,"5.1231.68.187":10,"5.1421.78.187":30}',
        //     "2019/09/5": '{"5.121.828.174":14,"5.121.88.1587":3,"35.1721.88.187":3}',
        //     "2019/05/10": '{"5.157.96.150":3,"8.195.62.188": 817}',
        //     "2019/05/11": '{"5.257.96.150":100,"8.195.62.188": 100}',
        //     "2019/06/20": '{"5.121.15.157":3}'
        // })

        primitiveData 
            ? deferred.resolve(
                typeof primitiveData === "string" 
                    ? JSON.parse(primitiveData)
                    : primitiveData
                ,config
            )
            : deferred.reject(
                _.join([
                    col.red(`[${config.logBucket}][Redis]`),
                    ' Nothing Exist To Store.\n',
                    col.bold(horizontalLine)
                ],'')
            )
    })
    return deferred.promise;
}

const prepareDataToStore = (primitiveData,config)=>{
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
    let delKeys = []
    _.forIn(primitiveData, (value, key) => {
        let contain = key.split("/");
        let objYear = +contain[0]
        let objMonth = +contain[1]
        if (objYear <= EdgeYear && objMonth < EdgeMonth) {
            delKeys.push(key)
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
    return {midContain,delKeys}
}

const storeModels = ({midContain,config,delKeys})=>{
    let deferred = Q.defer()
    let arrLength = midContain.length;
    let modelContainer = []
    let specArr = []
    if(arrLength < 1 ) return deferred.reject('Nothing have found from redisDB to store in mongoDB')

    for (let i = 0; i < arrLength; i++) {
        let smallContain = midContain[i]

        Visitors.findOne({ Year: smallContain.Year, Month: smallContain.Month })
        .then(visitor=>{
            let visitorModel = visitor ? visitor : new Visitors({
                Year:           +smallContain.Year,
                Month:          +smallContain.Month,
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
        })
        .catch(err=>deferred.reject(
            _.join([
                col.red.bold('[ '+e.name+' ]'),
                '[ storeOnlineVisitor.js ]',
                err
            ],' ')
        ))
    }
    Promise.all(modelContainer.map(el => el.save()))
        .then(_=>deferred.resolve(config,delKeys))
        .catch(deferred.reject)
    return deferred.promise;
}
const storeDataToMongoDB = Q.fbind((primitiveData,config)=>storeModels(
    _.assign(
        prepareDataToStore(primitiveData,config),
        config 
    )
))
const deleteDataFromRedisDB = (config,delKeys)=>{
    let deferred = Q.defer();
    client.hdel(config.redisBucket,...delKeys)
        .then(reply=>{
            console.log('DELETE::: onlineVisitors-- ',...keys) //TODO: TEST
            if(reply===0) return deferred.reject('Couldn\'t Delete Data From Redis') 
            return deferred.resolve()
        })
        .catch(err=>deferred.reject(
            _.join([
                col.green(`[${config.logBucket}] [Redis]`),
                col.white.bgRed("[ERROR]"),
                err
            ],' ')
        ))
    return deferred.promise;
}

module.exports = (client,config)=>{
    console.log('start')
    // client should be redis
    let deferred = Q.defer();
    Q(_.assign(client,config))
        .then( fetchDataFromRedis )
            .tap(_=>console.log(col.green(`[${config.logBucket}]`), 'Saving Data To Database...'))
        .then( storeDataToMongoDB )
            .tap(_=>console.log(col.green(`[${config.logBucket}]`), 'Saved Data To Database...'))
        .then( deleteDataFromRedisDB )
            .tap(_=>console.log(_.join([col.green(`[${config.logBucket}]`),'Data Delete From Redis...\n',ui.horizontalLine ],' ')))
        
        .then(()=>deferred.resolve())
        .catch(err=>deferred.reject(err))
    return deferred.promise;
}