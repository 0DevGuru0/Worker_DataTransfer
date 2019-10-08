require('dotenv').config()
console.clear();
//Redis
const Redis = require('redis')
// const PubSub = require('./utils/pubsub');
const redis = Redis.createClient({
    host:process.env.REDIS_HOST,
    port:process.env.REDIS_PORT,
    retry_strategy: options=> {
        if (options.error && options.error.code === 'ECONNREFUSED') { return new Error('[ Redis ] The server refused the connection'); }
        if (options.total_retry_time > 1000 * 60 * 60) { return new Error('[ Redis ] Retry time exhausted'); }
        if (options.attempt > 10) { return undefined; }
        return Math.min(options.attempt * 100, 3000);
    }
}).setMaxListeners(0);
redis.on("connect",()=>{ console.log(chalk.white.bold.bgMagentaBright('[ Redis ]'),"connection established successfully"); })
// const redisListener = redis.duplicate().setMaxListeners(0);


// Mongoose
const mongoose = require('mongoose');
mongoose.connect(process.env.DB_ADDRESS, {
    useNewUrlParser: true,
    useFindAndModify:false,
    useUnifiedTopology: true,
    // autoIndex: true,
});
mongoose.connection.on('connected', () => { console.log(chalk.black.bold.bgCyan('[ MongoDB ]'),"connection established successfully") });
mongoose.connection.on('error', (err) => { console.log(chalk.black.bold.bgCyan('[ MongoDB ]'),'connection failed ' + err) });
mongoose.connection.on('disconnected', () => { console.log(chalk.black.bold.bgCyan('[ MongoDB ]'),'connection closed') })
mongoose.set('useCreateIndex', true);
mongoose.Promise = global.Promise;
// mongoose.set('debug', true);

// Miscellany
const moment = require('moment');
const chalk = require('chalk');

// Container
const visitorsWorker = require('./containers/visitors');
const usersWorker    = require('./containers/users');


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





// *Data Transferring with use of Time
console.log(chalk.black.bold.bgYellow('[ Data Transfer ]'),'System Initialized...')
// let transferTime = 24*60*60*1000;
let transferTime = 10*1000;
console.log(chalk.black.bold.bgYellow('[ Data Transfer ]'),'Started Time::',moment().format("dddd, MMMM Do YYYY, h:mm:ss a"))
console.log(chalk.black.bold.bgYellow('[ Data Transfer ]'),'Transferring Data from Redis to MongoDB Each::',transferTime/3600000,"hour.")
setInterval(()=>{
    console.log(chalk.black.bold.bgYellow('[ Data Transfer ]'),'Start...')
    // visitorsWorker(redis)
    usersWorker(redis)
    console.log(chalk.black.bold.bgYellow('[ Data Transfer ]'),'Transferd Successfully At::',moment().format("dddd, MMMM Do YYYY, h:mm:ss a")) 
},transferTime)