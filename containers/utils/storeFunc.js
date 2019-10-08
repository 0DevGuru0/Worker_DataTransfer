const onlineUsersCount  = require("../../model/onlineCount");
const totalUsersCount   = require("../../model/totalUsersCount");
const Users             = require("../../model/users");

const chalk     = require('chalk');
const moment    = require("moment");
const EdgeMonth = +moment().format("MM");
const EdgeYear  = +moment().format("YYYY");


/*
 * 1- Get Data from Redis Memory
 * 2- Modeling Data For Storing To DB
 * 3- Store Data In MongoDB
 * 4- Delete Data from Redis Memory
*/


module.exports = (redis,deferred,redisBucket,logBucket,collectionName)=>{
    redis.hgetall(redisBucket, async(err, reply) => {
        // *InitialCheck
        if(!reply){ 
        console.log(chalk.green(`[${logBucket}][Redis]`),"Nothing Exist To Store.")
        deferred.resolve() 
        }
        if(typeof reply === "string"){ reply = JSON.parse(reply) }
        if(err){deferred.reject(new Error(e.message))}
        // *Prepare Code Structure to store
        let midContain = []
        let TempObj_small=(contain,reply,el)=>{
        let slimObj   = {}
        slimObj.Day   = +contain[2]
        slimObj.Count = reply[el]
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
        for (let el in reply) {
        let contain = el.split("/");
        if (+contain[0] <= EdgeYear && +contain[1] < EdgeMonth ) {
            if (midContain.length === 0) {
                TempObj(contain,reply,el,midContain)
            } else {
                let elem = midContain[midContain.length - 1]
                if(elem.Year === +contain[0] && elem.Month === +contain[1]){
                    elem[collectionName].push(TempObj_small(contain,reply,el))
                }else{ TempObj(contain,reply,el,midContain); }
            }
        }
        }
        // *start to implement storing to DB
        let arrLength = midContain.length;
        let modelContainer = []
        if( arrLength > 0 ){
        console.log(chalk.green(`[${logBucket}]`),'Saving Data To Database...')
        for(let i=0 ; i < arrLength ; i++ ){
            let smallContain = midContain[i]
            let user = await Users.findOne({Year:smallContain.Year,Month:smallContain.Month})
            let userModel = user ? user : new Users({ Year:smallContain.Year,Month:smallContain.Month })
            let CountModel = new onlineUsersCount({ Days:smallContain[collectionName] })
            if(collectionName === 'totalUsers' ){
                CountModel = new totalUsersCount({ Days:smallContain[collectionName] }) 
            }
            userModel[collectionName].push(CountModel)
            modelContainer.push(userModel,CountModel)
        }

        Promise.all(modelContainer.map(el=>el.save()))
            .then(()=>{
            console.log(chalk.green(`[${logBucket}]`),'Saved Data To Database...')
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
                deferred.resolve()
            })
            .catch((e)=>{ deferred.reject(new Error(e.message)); })
        }
    })
}