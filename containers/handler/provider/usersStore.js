
const {
  Users,
  onlineUsersCount,
  totalUsersCount,
  totalVerifiedUsersCount} = require('../../../database/model/users')
  Q = require("q"),
  _ = require("lodash"),
  col = require("chalk"),
  { Spinner } = require("clui"),
  { ui,loading,errorModel } = require("../../../helpers");
  fig = require("figures"),
  moment = require("moment");
function FetchData({ config, client }) {
  this.client = client;
  this.redisBucket = config.redisBucket;
  return {
    getDataFromRedis: async () => {
      let reply = await this.client.hgetall(this.redisBucket);
      if (!reply)
        throw new Error(`Nothing Exist In ${this.redisBucket} Bucket`);
      return reply;
    },
    getUsersFromRedis: async contain => {
      let reply = await this.client.smembers("online:users:list:" + contain);
      if (!reply)
        throw new Error(
          `Nothing Exist In < online:users:list:${contain} > To Store.`
        );
      if (typeof reply === "string") reply = JSON.parse(reply);
      return reply;
    },
    deleteKeysFromRedis: async delKeys => {
      //TODO: TEST <Uncomment reply1,reply2>
      console.log(...delKeys);
      // let reply1 = await this.client.hdel(this.redisBucket,...delKeys)
      // let reply2 = await this.client.srem(...delKeys.map(key=>"online:users:list:"+key))
      // if(reply1 === 0 || reply2 === 0 ) throw new Error('Couldn\'t Delete Data From Redis')
      // return reply1+reply2
    }
  };
}
/*  prepareDataToStore <Function>
    Input : fetchData , config
    Output: midContain, delKeys, config, fetchData
*/
const prepareDataToStore = async ({ fetchData, config }) => {
  let deferred = Q.defer();
  let reply;
  try {
    reply = await fetchData.getDataFromRedis(config.redisBucket);
  } catch (err) {
    deferred.reject(errorModel(config.logBucket, "prepareData", err));
  }
  let midContain = [];
  let TempObj_small = async (contain, reply, el) => {
    let Obj = { Day: +contain[2], Count: reply[el] };
    if (config.collectionName === "onlineCount") {
      let result;
      try {
        result = await fetchData.getUsersFromRedis(el);
      } catch (err) {
        deferred.reject(errorModel(config.logBucket, "prepareData", err));
      }
    Obj.Users = result;
    }
    return Obj;
  };
  let TempObj = async (contain, reply, el, midContain) => {
    let midObj = {};
    let slimObj = await TempObj_small(contain, reply, el);
    midObj.Year = +contain[0];
    midObj.Month = +contain[1];
    midObj[config.collectionName] = [];
    midObj[config.collectionName].push(slimObj);
    midContain.push(midObj);
  };
  let delKeys = [];
  for (let el in reply) {
    if (moment(el, "YYYY/MM/DD").isBefore(moment(), "month")) {
      let contain = el.split("/");
      delKeys.push(el);
      if (midContain.length === 0) {
        await TempObj(contain, reply, el, midContain);
      } else {
        let elem = midContain[midContain.length - 1];
        if (elem.Year === +contain[0] && elem.Month === +contain[1]) {
          elem[config.collectionName].push(
            await TempObj_small(contain, reply, el)
          );
        } else {
          await TempObj(contain, reply, el, midContain);
        }
      }
    }
  }
  deferred.resolve({ midContain, delKeys, config, fetchData });
  return deferred.promise;
};

/*
    storeDataToMongoDB <Function>
    Input: midContain, config, delKeys, fetchData
    Output: config, delKeys, fetchData
*/
const storeDataToMongoDB = async ({
  midContain,
  config,
  delKeys,
  fetchData
}) => {
  let deferred = Q.defer();
  let arrLength = midContain.length;
  let modelContainer = [];
  if (arrLength === 0)
    deferred.reject(
      errorModel(
        config.logBucket,
        "storeDataToMongoDB",
        "Nothing prepared to store in mongodb"
      )
    );
  for (let i = 0; i < arrLength; i++) {
    let smallContain = midContain[i];
    let user;
    try {
      user = await Users.findOne({
        Year: smallContain.Year,
        Month: smallContain.Month
      });
    } catch (err) {
      deferred.reject(errorModel(config.logBucket, "storeDataToMongoDB", err));
    }

    let userModel = user
      ? user
      : new Users({ Year: smallContain.Year, Month: smallContain.Month });
    let CountModel = null;
    if (config.collectionName === "onlineCount") {
      CountModel = new onlineUsersCount({
        Days: smallContain[config.collectionName]
      });
    } else if (config.collectionName === "totalUsers") {
      CountModel = new totalUsersCount({
        Days: smallContain[config.collectionName]
      });
    } else if (config.collectionName === "totalVerifiedUsers") {
      CountModel = new totalVerifiedUsersCount({
        Days: smallContain[config.collectionName]
      });
    } else {
      deferred.reject(
        errorModel(
          config.logBucket,
          "storeDataToMongoDB",
          "Collection Couldn't Found,Make Sure Typed CollectionName correctly"
        )
      );
    }
    userModel[config.collectionName].push(CountModel);
    modelContainer.push(userModel, CountModel);
  }
  Promise.all(modelContainer.map(el => el.save()))
    .then(_ => deferred.resolve({ config, delKeys, fetchData }))
    .catch(err =>
      deferred.reject(errorModel(config.logBucket, "storeDataToMongoDB", err))
    );
  return deferred.promise;
};

/*
    deleteDataFromRedisDB <Function>
    Input: fetchData, config, delKeys
    Output: result
*/
const deleteDataFromRedisDB = async ({ fetchData, config, delKeys }) => {
  let deferred = Q.defer();
  let result;
  try {
    result = await fetchData.deleteKeysFromRedis(delKeys);
  } catch (err) {
    deferred.reject(errorModel(config.logBucket, "deleteDataFromRedisDB", err));
  }
  deferred.resolve(result);
  return deferred.promise;
};
module.exports = ({ client, config }) => {
  let deferred = Q.defer();
  let load1 = loading(
    `${col.red(
      `[${config.logBucket}]`
    )} preparing Data for saving into the Database...`
  );
  let load2 = loading(
    `${col.red(`[${config.logBucket}]`)} Saving Data To Database...`
  );
  let load3 = loading(
    `${col.red(`[${config.logBucket}]`)} Deleting From RedisDB...`
  );
  let initiate = col.green(`${fig.tick} [${config.logBucket}]`)
  Q({ fetchData: new FetchData({ client, config }), config })
    .tap(() => load1.start())
    .then(prepareDataToStore)
    .tap(() => {
      load1.stop();
      console.log( initiate, "Prepared Data For Saving Into The Database..." );
      load2.start();
    })
    .then(storeDataToMongoDB)
    .tap(() => {
      load2.stop();
      console.log( initiate, "Saved Data To Database..." );
      load3.start();
    })
    .then(deleteDataFromRedisDB)
    .tap(() => {
      load3.stop();
      console.log(`${initiate} Data Deleted From Redis...`)
    })
    .then(deferred.resolve)
    .catch(err=>{
      load3.stop()
      load1.stop()
      load2.stop()
      deferred.reject(err)
  });
  return deferred.promise;
};
