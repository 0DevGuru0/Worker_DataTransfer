
const asyncRedis = require('async-redis')
const moment    = require('moment');
const EdgeMonth = +moment().add(1,'month').format("MM");
const EdgeYear  = +moment().format("YYYY");
const _ = require('Lodash')
const chalk = require('chalk')
const pageViews = require('../../model/visitors/pageViews')
const Visitors  = require('../../model/visitors')

module.exports = async (redis,deferred)=>{
    let collectionName = "pageViews"
    let logBucket = "pageViews"
    const client = asyncRedis.decorate(redis);
    let reply = null
    try{ reply = await client.smembers('pageViews:List:keys') }
    catch(err){ 
        console.log(
            chalk.bold.bgRed('Error Ocurred At:'),
            '[Visitors]',
            '[pageViewsFunction]'
        )
        deferred.reject(err) 
    }

    if(reply.length === 0 ){
        console.log(chalk.green(`[${logBucket}]`), 'Nothing has exist in bucket...')
        deferred.resolve(redis)
    }
    let container = {}
    
    let midContain = []
    for(let i=0;i<reply.length;i++){
        let result = JSON.stringify(await client.hgetall(reply[i]))
        let date = reply[i].split(':')[1]
        container[date] = result
    }
    let TempObj_small = (contain, reply, el) => {
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
    let TempObj = (contain, reply, el, midContain) => {
        let midObj = {}
        let slimObj = TempObj_small(contain, reply, el)
        midObj.Year = +contain[0]
        midObj.Month = +contain[1]
        midObj[collectionName] = []
        midObj[collectionName].push(slimObj)
        midContain.push(midObj)
    }

    _.forIn(container, (value, key) => {
        let contain = key.split("/");
        let objYear = +contain[0]
        let objMonth = +contain[1]
        if (objYear <= EdgeYear && objMonth < EdgeMonth) {
            if (midContain.length === 0) {
                TempObj(contain, container, key, midContain)
            } else {
                let elem = midContain[midContain.length - 1]
                if (elem.Year === objYear && elem.Month === objMonth) {
                    elem[collectionName].push(TempObj_small(contain, container, key))
                } else { TempObj(contain, container, key, midContain); }
            }
        }
    })

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
                Month:  +smallContain.Month
            })
            let pageViewsModel = []
            if (collectionName === 'pageViews') {
                let specificCollection = smallContain[collectionName]
                specArr.push(...specificCollection)
                let smallArrLength = specificCollection.length;
                if (smallArrLength > 0) {
                    for (let i = 0; i < smallArrLength; i++) {
                        let { Day, Detail,DateVisi} = specificCollection[i]
                        const model = new pageViews({ Day,Detail,DateVisi })
                        pageViewsModel.push(model)
                    }
                }
            }
            visitorModel[collectionName].push(...pageViewsModel)
            modelContainer.push(visitorModel,...pageViewsModel)
        }
        if(modelContainer.length===0){
            console.log( chalk.bold.bgRed('Error Ocurred At:'), '[Visitors]', '[pageViewsFunction]' )
            deferred.reject('Nothing has been exist to store to Mongodb...') 
        }
        Promise.all(modelContainer.map(el => el.save()))
        .then(() => {
            console.log(chalk.green(`[${logBucket}]`), 'Saved Data To Database...')
            console.log(chalk.bold('-------------------------------------------------------------'))
            Visitors.find({Year:2019,Month:10})
                .populate({path:"pageViews",model:"pageViewsCount"})
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

        }).catch(err=>{
            console.log( chalk.bold.bgRed('Error Ocurred At:'), '[Visitors]', '[pageViewsFunction]' )
            deferred.reject(new Error(err))
        })
       
    }
}

