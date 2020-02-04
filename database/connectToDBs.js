const Q = require("q");
const RedisDB = require("./redisDB");
const MongoDB = require("./mongoDB");

module.exports = () =>
  Q.allSettled([RedisDB(), MongoDB()]).spread((redis, mongo) => {
    if (redis.state === "rejected" || mongo.state === "rejected") {
      if (redis.state === "rejected" && mongo.state === "rejected")
        throw new Error(`${redis.reason}\n${mongo.reason}`);
      if (redis.state === "rejected") throw new Error(redis.reason);
      throw new Error(mongo.reason);
    }
    return { mongoose: mongo.value.mongoose, redis: redis.value };
  });
