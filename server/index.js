// Miscellany
const moment = require('moment');
const chalk = require('chalk');
const Q     = require('q');
require('dotenv').config()
// Container
const visitorsWorker = require('../containers/visitors');
const usersWorker    = require('../containers/users');
//Redis
const Redis = require('redis')
function RedisDB(){
    var deferred = Q.defer();
    // const PubSub = require('./utils/pubsub');
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
            chalk.white.bold.bgMagentaBright('[ Redis ]'),
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
        // autoIndex: true,
    });
    mongoose.connection.on('connected', () => { 
        console.log(chalk.black.bold.bgCyan('[ MongoDB ]'),"connection established successfully") 
        deferred.resolve(redis)
    });
    mongoose.connection.on('error', (err) => { 
        console.log(chalk.black.bold.bgCyan('[ MongoDB ]'),'connection failed ' + err) 
        deferred.reject(new Error(err.message))
    });
    mongoose.connection.on('disconnected', () => { 
        console.log(chalk.black.bold.bgCyan('[ MongoDB ]'),'connection closed') 
        deferred.reject(new Error('connection closed'))
    })
    mongoose.set('useCreateIndex', true);
    mongoose.Promise = global.Promise;
    // mongoose.set('debug', true);  
    return deferred.promise;
}
// *Data Transferring With Use Of Redis Key Notification
// redisListener.on('ready',()=>{ redisListener.config('SET',"notify-keyspace-events","Eh$s") })
// PubSub.subscribe("__keyevent@0__:sadd")
// PubSub.subscribe("__keyevent@0__:incrby")
// PubSub.subscribe("__keyevent@0__:hincrby")

// console.log('worker has been started...')
// PubSub.on('message',(channel,message)=>{
//     visitorsWorker(channel,message,redis)
//     usersWorker(channel,message,redis)
// })
function DBTransfer(redis){
    var deferred = Q.defer();
    let transferPeriod = 30*1000
    // *Data Transferring with use of Time
    console.log(
        chalk.black.bold.bgYellow('[ Data Transfer ]'),
        'System Initialized...')
    console.log(
        chalk.black.bold.bgYellow('[ Data Transfer ]'),
        'Started Time::',moment().format("dddd, MMMM Do YYYY, h:mm:ss a"))
    console.log(
        chalk.black.bold.bgYellow('[ Data Transfer ]'),
        'Transferring Data from Redis to MongoDB Each::',
        transferPeriod/3600000,"hour.")
    setInterval(()=>{
        console.log(chalk.bold('-------------------------------------------------------------'))
        console.log(chalk.black.bold.bgYellow('[ Data Transfer ]'),'Start To Transfer...')
        // usersWorker(redis)
        // .then(visitorsWorker)
        // .then(()=>{
        //     console.log(
        //         chalk.black.bold.bgYellow('[ Data Transfer ]'),
        //         'Transferd Successfully At::',moment().format("dddd, MMMM Do YYYY, h:mm:ss a") ) 
        //     process.exit(0) 
        // })
        visitorsWorker(redis)
        .then(()=>{
            console.log(
                chalk.black.bold.bgYellow('[ Data Transfer ]'),
                'Transferd Successfully At::',moment().format("dddd, MMMM Do YYYY, h:mm:ss a") ) 
            process.exit(0) 
        })
    },transferPeriod)
    deferred.resolve()
    return deferred.promise;
}
module.exports = {DBTransfer,MongoDB,RedisDB}

