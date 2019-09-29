require('dotenv').config()

//Redis
const Redis = require('redis')
const PubSub = require('./utils/pubsub');
const redis = Redis.createClient({
    host:process.env.REDIS_HOST,
    port:process.env.REDIS_PORT,
    retry_strategy: options=> {
        if (options.error && options.error.code === 'ECONNREFUSED') { return new Error('The server refused the connection'); }
        if (options.total_retry_time > 1000 * 60 * 60) { return new Error('Retry time exhausted'); }
        if (options.attempt > 10) { return undefined; }
        return Math.min(options.attempt * 100, 3000);
    }
}).setMaxListeners(0);
const redisListener = redis.duplicate().setMaxListeners(0);

// Mongoose
const mongoose = require('mongoose');
mongoose.connect(process.env.DB_ADDRESS, {
    useNewUrlParser: true,
    useFindAndModify:false,
    useUnifiedTopology: true
});
mongoose.connection.on('connected', () => { console.log("connection established successfully") });
mongoose.connection.on('error', (err) => { console.log('connection to mongo failed ' + err) });
mongoose.connection.on('disconnected', () => { console.log('mongo db connection closed') })
mongoose.set('useCreateIndex', true);
mongoose.Promise = global.Promise;

// Miscellany
const moment = require('moment');

// Container
const visitorsWorker = require('./containers/visitors');
const usersWorker    = require('./containers/users');

redisListener.on('ready',()=>{ redisListener.config('SET',"notify-keyspace-events","Eh$s") })
PubSub.subscribe("__keyevent@0__:sadd")
PubSub.subscribe("__keyevent@0__:incrby")
PubSub.subscribe("__keyevent@0__:hincrby")

console.log('worker has been started...')
PubSub.on('message',(channel,message)=>{
    visitorsWorker(channel,message)
    usersWorker(channel,message)
})
