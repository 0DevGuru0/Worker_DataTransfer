const Redis = require('redis')
const redisClient  = Redis.createClient()
const subscriber = redisClient.duplicate().setMaxListeners(0)

const pubSubClass = class PubSub {
    publish(channel, message) {
        publisher.publish(channel, message)
    }
    subscribe(channel) {
        subscriber.subscribe(channel)
    }
    unsubscribe(channel){
        subscriber.unsubscribe(channel)
        subscriber.removeAllListeners() 
    }
    on(event, cb) {
        subscriber.on(event, (channel, message) => {
            cb(channel, message)
        })
    }
};

module.exports = new pubSubClass();