const clc = require('chalk');
const Q = require('q')
const _ = require('lodash')
const moment = require('moment')
const {usersCont} = require('../../../../../../containers/users')
const {visitorsCont} = require('../../../../../../containers/visitors')
const {MongoDB,RedisDB} = require('../../../../../index')
const asyncRedis = require('async-redis')
module.exports=(inter)=>{
    this.buckets = Object.assign({},usersCont,visitorsCont)
    this.allVisi = Object.keys(visitorsCont)
    this.allUsers = Object.keys(usersCont)
    return{
        start:(bucket)=>{
            console.log('\n')
           let DBTransfer = (redis)=>{
                let client      = asyncRedis.decorate(redis);
                let deferred    = Q.defer();
                let allVisi     = bucket.indexOf('all_visitor_buckets')
                if(allVisi>-1)  bucket.splice(allVisi,1,...this.allVisi)
                let allUsers    = bucket.indexOf('all_user_buckets')
                if(allUsers>-1) bucket.splice(allUsers,1,...this.allUsers)
                bucket = _.uniq(bucket)
                this.staticsBucket = bucket.join(":")
                let firstBucket = bucket.shift()
                let time = moment().format("dddd, MMMM Do YYYY, h:mm a")
                let Arr = []
                console.log( 
                    clc.black.bold.bgYellow('[ Data Transfer ]'), 
                    'System Initialized...'); 
                console.log( 
                    clc.black.bold.bgYellow('[ Data Transfer ]'), 
                    'Started Time::',
                    time) 
                console.log(clc('-------------------------------------------------------------'))
                console.log(clc.black.bold.bgYellow('[ Data Transfer ]'),'Start To Transfer...')
                Arr.push(this.buckets[firstBucket](client))
                _.forEach(bucket,elem=>{
                    let arrLength = Arr.length - 1
                    let currentBucket = this.buckets[elem]
                    Arr.push(Arr[arrLength].then(currentBucket))
                    Arr.shift()
                })

                Arr[0].then(async()=>{
                    console.log( clc.bold.bgGreen.white(' Congratulation!!! Users Data Transferring to MongoDB is successfully done..'))
                    let reply;
                    try{ reply = await client.hget('transferStatics','manual') }
                    catch(e){ console.log(e) }
                    reply = reply ? JSON.parse(reply): {};
                    reply[time] = this.staticsBucket.split(':')
                    await client.hset('transferStatics','manual',JSON.stringify(reply))
                    this.initialize = false
                    inter.prompt()
                })
                .catch(async reason=>{
                    let reply;
                    try{ reply = await client.hget('transferStatics','manual') }
                    catch(e){ console.log(e) }
                    reply = reply ? JSON.parse(reply): {};
                    reply[time] = 'fail'
                    await client.hset('transferStatics','manual',JSON.stringify(reply))
                    console.log( clc.green("[DataTransfer]"), clc.white.bgRed("[ERROR]") , reason)
                })
                deferred.resolve()
                return deferred.promise;
            }
            return RedisDB().then(MongoDB)
            .then(({redis,mongoose})=>{
                let deferred = Q.defer();
                this.mongooseDB  = mongoose;
                this.redisDB     = redis;
                this.initialize = true
                deferred.resolve(redis)
                return deferred.promise
            })
            .then(DBTransfer)
            .catch(reason=>console.log( clc.green("[Server]"), clc.white.bgRed("[ERROR]"), reason ))
        },
        initialize:()=>this.initialize?true:false,
        stop:()=> {
            let deferred = Q.defer();
            this.mongooseDB.connection.close().then(()=>{
                this.redisDB.quit(()=> {
                    console.log(
                        clc.white.bold.bgMagentaBright('[ Redis ]'),
                        "connection closed successfully"
                    );
                    this.initialize = false;
                    deferred.resolve()
                },)
            }).catch(e=>console.log('stop forced error'))
            return deferred.promise
        }
    }

}