const onlineUsersCount  = require("../../../database/model/users/onlineCount"),
    totalUsersCount     = require("../../../database/model/users/totalUsersCount"),
    totalVerifiedUsers  = require("../../../database/model/users/totalVerifiedUsers"),
    Users               = require("../../../database/model/users"),
    chalk     = require('chalk'),
    moment    = require("moment"),
    EdgeMonth = +moment().format("MM"),
    EdgeYear  = +moment().format("YYYY");

function FetchData(config){
    this.client         = config.client
    this.deferred       = config.deferred
    this.logBucket      = config.logBucket
    this.redisBucket    = config.redisBucket
    return{
        getDataFromRedis:async ()=>{
            let reply;
            try{ 
                reply = await this.client.hgetall(this.redisBucket) 
            }catch(err){ this.deferred.reject(err) }
            return reply
        },
        getUsersFromRedis:async contain=>{
            let reply;
            try{
                reply = this.client.smembers("online:users:list:"+contain)
            }catch(err){ this.deferred.reject(err) }
            return reply
        },
        deleteKeysFromRedis:async delKeys=>{
            let reply1, reply2;
            try{
                //TODO: TEST
                console.log(...delKeys)
                // reply1 = await this.client.hdel(this.redisBucket,...delKeys)
                // reply2 = await this.client.srem(...delKeys.map(key=>"online:users:list:"+key))
            }catch(err){
                console.log( 
                    chalk.green(`[${this.logBucket}]`),
                    chalk.white.bgRed("[ERROR]"),
                    err.message
                )
                this.deferred.reject(err)
            }
            if(reply1 === 0 || reply2 === 0 ){
                return{ErrRedis:'Couldn\'t Delete Data From Redis' } 
            }else{
                console.log(chalk.green(`[${this.logBucket}]`),'Data Delete From Redis...')
                return {ErrRedis:null}
            }
        }
    }
}

async function prepareData(fetchData,config){
    let reply = await fetchData.getDataFromRedis(config.redisBucket);
    if(!reply) return {Err:`Nothing Exist In ${config.redisBucket} To Store.`}
    if(typeof reply === "string") reply = JSON.parse(reply) 
    let midContain = []
    let TempObj_small=async (contain,reply,el)=>{
        let Obj = { Day:+contain[2], Count:reply[el] }
        if(config.collectionName === 'onlineCount' ) Obj.Users= await fetchData.getUsersFromRedis(el)
        return Obj
    } 
    let TempObj = async (contain,reply,el,midContain)=>{
        let midObj    = {}
        let slimObj   = await TempObj_small(contain,reply,el)
        midObj.Year   = +contain[0]
        midObj.Month  = +contain[1]
        midObj[config.collectionName] = []
        midObj[config.collectionName].push(slimObj)
        midContain.push(midObj)
    }
    let delKeys = []
    for (let el in reply) {
    let contain = el.split("/");
    if (+contain[0] <= EdgeYear && +contain[1] < EdgeMonth ) {
        delKeys.push(el)
        if (midContain.length === 0) {
            await TempObj(contain,reply,el,midContain)
        } else {
            let elem = midContain[midContain.length - 1]
            if(elem.Year === +contain[0] && elem.Month === +contain[1]){
                elem[config.collectionName].push( await TempObj_small(contain,reply,el))
            }else{ await TempObj(contain,reply,el,midContain); }
        }
    }
    }
    return {midContain,delKeys}
}
async function storeToMongo(midContain,config){
    let arrLength = midContain.length;
    let modelContainer = []
    if(arrLength===0){ config.deferred.resolve(config.client) }
    console.log(chalk.green(`[${config.logBucket}]`),'Saving Data To Database...')
    for(let i=0 ; i < arrLength ; i++ ){
        let smallContain = midContain[i]
        let user = await Users.findOne({Year:smallContain.Year,Month:smallContain.Month})
        let userModel = user ? user : new Users({ Year:smallContain.Year,Month:smallContain.Month })
        let CountModel = null
        if(config.collectionName === 'onlineCount' ){
            CountModel = new onlineUsersCount({ Days: smallContain[config.collectionName] })
        }else if(config.collectionName === 'totalUsers'){
            CountModel = new totalUsersCount({ Days:smallContain[config.collectionName] }) 
        }else if(config.collectionName === 'totalVerifiedUsers'){
            CountModel = new totalVerifiedUsers({ Days:smallContain[config.collectionName] }) 
        }else{ return {ErrDB:"Collection Couldn\'t Found,Make Sure Typed CollectionName correctly"} }
        userModel[config.collectionName].push(CountModel)
        modelContainer.push(userModel,CountModel)
    }
    return {modelContainer};
}
module.exports = async config=>{
    let fetchData               = new FetchData(config)
    let {midContain,delKeys,Err} = await prepareData(fetchData,config)
    if(Err){
        console.log(chalk.red(`[${config.logBucket}][Redis]`),Err)
        console.log(chalk.bold('-------------------------------------------------------------'))
        return config.deferred.resolve(config.client)
    }
    let {modelContainer,ErrDB}    = await storeToMongo(midContain,config)
    if(ErrDB){
        console.log(chalk.red(`[${config.logBucket}][MongoDB]`),ErrDB)
        console.log(chalk.bold('-------------------------------------------------------------'))
        return config.deferred.resolve(config.client) 
    }
    Promise.all(modelContainer.map(el=>el.save()))
        .then(async()=>{
            console.log(chalk.green(`[${config.logBucket}]`),'Saved Data To Database...')
            let {ErrRedis} = await fetchData.deleteKeysFromRedis(delKeys)
            if(ErrRedis){
                console.log(chalk.red(`[${config.logBucket}][Redis]`),ErrRedis)
                console.log(chalk.bold('-------------------------------------------------------------'))
                return config.deferred.resolve(config.client)   
            }
            console.log(chalk.bold('-------------------------------------------------------------'))
            config.deferred.resolve(config.client)
        })
        .catch((e)=>{ config.deferred.reject(new Error(e.message)); })
}