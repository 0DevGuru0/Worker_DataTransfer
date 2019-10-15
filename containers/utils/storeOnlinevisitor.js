/*
 * redisBucket:'online:visitors:TList'
 * collectionName: "onlineCount"
 */
const moment = require('moment');
const EdgeMonth = +moment().format("MM");
const EdgeYear = +moment().format("YYYY");
const Visitors = require('../../model/visitors')
const onlineVisitorsList = require('../../model/visitors/onlineVisitors')
const _ = require('Lodash')
const chalk = require('chalk')

module.exports = (redis, deferred, redisBucket, logBucket, collectionName,countBox,countBox2) => {
    
    redis.hgetall(redisBucket, async (err, primitiveData) => {
        primitiveData = {
            "2019/10/5": '{"5.122.110.204":6}',
            "2019/10/20": '{"5.122.110.207":6}',
            "2019/09/4": '{"5.121.818.187":3,"5.1231.68.187":10,"5.1421.78.187":30}',
            "2019/09/5": '{"5.121.828.174":14,"5.121.88.1587":3,"35.1721.88.187":3}',
            "2019/05/10": '{"5.157.96.150":3,"8.195.62.188": 817}',
            "2019/05/11": '{"5.257.96.150":100,"8.195.62.188": 100}',
            "2019/06/20": '{"5.121.15.157":3}',
        }
        if (!primitiveData) {
            console.log(chalk.green(`[${logBucket}][Redis]`), "Nothing Exist To Store.")
            deferred.resolve(redis)
        }
        if (typeof primitiveData === "string") { primitiveData = JSON.parse(primitiveData) }
        if (err) { deferred.reject(new Error(err.message)) }
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
            midObj[countBox] = slimObj.TotalVisitors
            midObj[countBox2] = slimObj.TotalVisit
            midObj[collectionName] = []
            midObj[collectionName].push(slimObj)
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
                        elem[countBox] += smallObj.TotalVisitors
                        elem[countBox2] += smallObj.TotalVisit
                        elem[collectionName].push(smallObj)
                    } else { TempObj(contain, primitiveData, key, midContain); }
                }
            }
        })

        // let sortContainer = _.sortBy(midContain,["Year","Month"])   
        // console.log(JSON.stringify(midContain))
        // console.log(totalCounts)
        // * Store to MongoDB
        let arrLength = midContain.length;
        let modelContainer = []
        let specArr = []
        if (arrLength > 0) {
            console.log(chalk.green(`[${logBucket}]`), 'Saving Data To Database...')
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
                if (collectionName === 'onlineList') {
                    let specificCollection = smallContain[collectionName]
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
                }
                visitorModel[collectionName].push(...onlineCountModel)
                modelContainer.push(visitorModel,...onlineCountModel)

            }
            Promise.all(modelContainer.map(el => el.save()))
                .then(() => {
                    console.log(chalk.green(`[${logBucket}]`), 'Saved Data To Database...')
                    console.log(chalk.bold('-------------------------------------------------------------'))
                    Visitors.find({Year:2019,Month:9})
                        .populate({path:"onlineList",model:"onlineVisitorsList"})
                        .then((res)=>{
                            console.log(JSON.stringify(res))
                            deferred.resolve(redis)
                        })
                    // *Remove Data From Redis
                    // redis.del(redisBucket,(err,reply)=>{
                    // if(err){
                    //     console.log(
                    //     chalk.green(`[${logBucket}]`),
                    //     chalk.white.bgRed("[ERROR]"),
                    //     err.message)
                    //     deferred.resolve()
                    // }
                    //     console.log(chalk.green(`[${logBucket}]`),'removed from redis.')
                    //     deferred.resolve();
                    // })

                })
                .catch((e) =>deferred.reject(new Error(e.message)))
        }
    })
}