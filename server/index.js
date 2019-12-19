// Miscellany
const moment = require('moment');
const chalk = require('chalk');
const Q     = require('q');
const asyncRedis = require('async-redis');
require('dotenv').config()

// Container
const {visitorsWorker,visitorsCont} = require('../containers/visitors');
const {usersWorker,   usersCont   } = require('../containers/users');
//Redis
const Redis = require('redis')
function RedisDB(){
    var deferred = Q.defer();
    const redis = Redis.createClient({
        host:process.env.REDIS_HOST,
        port:process.env.REDIS_PORT,
        retry_strategy: options=> {
            if (options.error && options.error.code === 'ECONNREFUSED') { deferred.reject(new Error('[ Redis ] The server refused the connection')); }
            if (options.total_retry_time > 1000 * 60 * 60) { deferred.reject(new Error('[ Redis ] Retry time exhausted')); }
            if (options.attempt > 10) { return undefined; }
            return Math.min(options.attempt * 100, 3000);
        }
    }).setMaxListeners(0);
    redis.on("connect",()=>{ 
        console.log(
            chalk.black.bold.bgMagentaBright('[ Redis ]'),
            "connection established successfully"
        ); 
    deferred.resolve(redis)
    })
    // const redisListener = redis.duplicate().setMaxListeners(0);
    return deferred.promise;
}
// Mongoose
const mongoose = require('mongoose');
function MongoDB(redis){
    var deferred = Q.defer();
    mongoose.connect(process.env.DB_ADDRESS, {
        useNewUrlParser: true,
        useFindAndModify:false,
        useUnifiedTopology: true,
        useCreateIndex:true
        // autoIndex: true,
    });
    mongoose.connection.on('connected', () => { 
        console.log(chalk.black.bold.bgCyan('[ MongoDB ]'),"connection established successfully")
        mongoose.connection.db.stats((err, stats)=>{
            deferred.resolve({redis,mongoose,stats})
        });
    });
    mongoose.connection.on('error', (err) => { 
        console.log(chalk.black.bold.bgCyan('[ MongoDB ]'),'connection failed ' + err) 
        deferred.reject(new Error(err.message))
    });
    mongoose.connection.on('disconnected', () => { 
        console.log(chalk.black.bold.bgCyan('[ MongoDB ]'),'connection closed successfully') 
        deferred.reject(new Error('connection closed'))
    })
  
    mongoose.Promise = global.Promise;
    // mongoose.set('debug', true);  
    return deferred.promise;
}

// start transfer auto --all
function DBTransfer({redis,intervalTime}){
    const client = asyncRedis.decorate(redis);
    let deferred = Q.defer();
    intervalTime = intervalTime.replace('hour','')
    intervalTime = +intervalTime*1000*60*60
    intervalTime = 20*1000
    // *Data Transferring with use of Time
    console.log(
        chalk.black.bold.bgYellow('[ Data Transfer ]'),
        'System Initialized...')
    console.log(
        chalk.black.bold.bgYellow('[ Data Transfer ]'),
        'Started Time::',moment().format("dddd, MMMM Do YYYY, h:mm a"))
    console.log(
        chalk.black.bold.bgYellow('[ Data Transfer ]'),
        'Transferring Data from Redis to MongoDB Each::',
        intervalTime/3600000,"hour.")

    let interval=setInterval(()=>{
        console.log(chalk.bold('-------------------------------------------------------------'))
        console.log(chalk.black.bold.bgYellow('[ Data Transfer ]'),'Start To Transfer...')
        usersWorker(client)
        .then(visitorsWorker)
        .then(async client=>{
            let time = moment().format("dddd, MMMM Do YYYY, h:mm a")
            console.log(
                chalk.black.bold.bgYellow('[ Data Transfer ]'),
                'Transferred Successfully At::',time ) 
            let buckets =Object.keys(Object.assign({},usersCont,visitorsCont))
            let reply;
            try{ reply = await client.hget('transferStatics','auto') }
            catch(e){ console.log(e) }
            reply = reply ? JSON.parse(reply): {};
            reply[time] = buckets
            await client.hset('transferStatics','auto',JSON.stringify(reply))
        })
        .catch(async err=>{
            console.log(chalk.black.bold.bgRed('[ Data Transfer ]'), 'Error At::',time,err ) 
            let reply;
            try{ reply = await client.hget('transferStatics','auto') }
            catch(e){ console.log(e) }
            reply = reply ? JSON.parse(reply): {};
            reply[time] = 'fail'
            await client.hset('transferStatics','auto',JSON.stringify(reply))
            process.exit(0) 
        })
    },intervalTime)
    deferred.resolve(interval)
    return deferred.promise;
}
module.exports = {DBTransfer,MongoDB,RedisDB}

