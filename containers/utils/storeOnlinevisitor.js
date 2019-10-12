/*
 * redisBucket:'online:visitors:TList'
 * collectionName: "onlineCount"
*/
const moment = require('moment');
const EdgeMonth = +moment().format("MM");
const EdgeYear  = +moment().format("YYYY");
const Visitors  =  require('../../model/visitors')
const onlineVisitorsCount = require('../../model/visitors/onlineVisitors')
const _ = require('Lodash')
const chalk = require('chalk')

module.exports = (redis,deferred,redisBucket,logBucket,collectionName)=>{
    redis.hgetall(redisBucket,async (err,primitiveData)=>{
        primitiveData = { 
            "2019/10/5": '{"5.122.110.204":6}',
            "2019/10/20": '{"5.122.110.207":6}',
            
            "2019/09/4": '{"5.121.88.187":3,"5.121.68.187":10,"5.121.78.187":30}',
            "2019/09/5": '{"5.121.88.174":14}',
            
            "2019/08/4": '{"5.121.157.187":3}',
            "2019/08/5": '{"5.121.157.174":3}',
            
            "2019/05/10": '{"5.157.96.150":3}',
            "2019/06/20": '{"5.121.15.157":3}',
        }
    
    
        if(!primitiveData){ 
            console.log(chalk.green(`[${logBucket}][Redis]`),"Nothing Exist To Store.")
            deferred.resolve(redis) 
        }
        if(typeof primitiveData === "string"){ primitiveData = JSON.parse(primitiveData) }
        if(err){deferred.reject(new Error(e.message))}

        let midContain = []
        let TempObj_small=(contain,reply,el)=>{
          let Detail = []
          let detailObj = JSON.parse(reply[el])
          _.forIn(detailObj,(value,key)=>{
            let slimObj = {}
            slimObj.ip = key
            slimObj.count = value
            Detail.push(slimObj)
          })
          let slimObj   = {}
          slimObj.Day   = +contain[2]
          slimObj.Total = _.sum( Object.values( detailObj ) )
          slimObj.Detail = Detail
          return slimObj
        } 
        let TempObj = (contain,reply,el,midContain)=>{
          let midObj    = {}
          let slimObj   = TempObj_small(contain,reply,el)
          midObj.Year   = +contain[0]
          midObj.Month  = +contain[1]
          midObj[collectionName] = []
          midObj[collectionName].push(slimObj)
          midContain.push(midObj)
        }
        _.forIn(primitiveData,(value,key)=>{
          let contain = key.split("/");
          let objYear = +contain[0]
          let objMonth = +contain[1]
          if (objYear <= EdgeYear && objMonth< EdgeMonth ) {
              if (midContain.length === 0) {
                  TempObj(contain,primitiveData,key,midContain)
              } else {
                  let elem = midContain[midContain.length - 1]
                  if(elem.Year === objYear && elem.Month === objMonth){
                      elem[collectionName].push(TempObj_small(contain,primitiveData,key))
                  }else{ TempObj(contain,primitiveData,key,midContain); }
              }
          }
        })
        // let sortContainer = _.sortBy(midContain,["Year","Month"])    
        // * Store to MongoDB
        let arrLength = midContain.length;
        let modelContainer = []
        if( arrLength > 0 ){
        console.log(chalk.green(`[${logBucket}]`),'Saving Data To Database...')
        for(let i=0 ; i < arrLength ; i++ ){
            let smallContain = midContain[i]
            let visitor = await Visitors.findOne({Year:smallContain.Year,Month:smallContain.Month})
            let visitorModel = visitor ? visitor : new Visitors({ Year:smallContain.Year,Month:smallContain.Month })
            let onlineCountModel = []
            if(collectionName === 'onlineCount' ){
                let specificCollection=smallContain[collectionName]
                let smallArrLength = specificCollection.length;
                if(smallArrLength>0){
                    for(let i=0 ; i < smallArrLength ; i++ ){
                        let {Day,Total,Detail} = specificCollection[i]
                        onlineCountModel.push(new onlineVisitorsCount({Day,Total,Detail}))
                    }
                }
            }
            visitorModel[collectionName].push(onlineCountModel)
            modelContainer.push(visitorModel,onlineCountModel)
        }

        // Promise.all(modelContainer.map(el=>el.save()))
        //     .then(()=>{
        //     console.log(chalk.green(`[${logBucket}]`),'Saved Data To Database...')
        //     console.log(chalk.bold('-------------------------------------------------------------'))
        //     // *Remove Data From Redis
        //         // redis.del(redisBucket,(err,reply)=>{
        //         // if(err){
        //         //     console.log(
        //         //     chalk.green(`[${logBucket}]`),
        //         //     chalk.white.bgRed("[ERROR]"),
        //         //     err.message)
        //         //     deferred.resolve()
        //         // }
        //         //     console.log(chalk.green(`[${logBucket}]`),'removed from redis.')
        //         //     deferred.resolve();
        //         // })
        //         deferred.resolve(redis)
        //     })
        //     .catch((e)=>{ deferred.reject(new Error(e.message)); })
        }
    })
}
// console.log(sortContainer)
// deferred.resolve(redis) 