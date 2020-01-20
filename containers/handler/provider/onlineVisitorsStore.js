const moment = require("moment"),
  Q = require("q"),
  _ = require("Lodash"),
  fig = require("figures"),
  col = require("chalk"),
  {
    Visitors,
    onlineVisitorsList
  } = require("../../../database/model/visitors"),
  { errorModel, loading } = require("../../../helpers");

const fetchDataFromRedis = ({ client, config }) => {
  let deferred = Q.defer();
  client
    .hgetall(config.redisBucket)
    .catch(err =>
      deferred.reject(errorModel(config.logBucket, "fetchDataFromRedis", err))
    )
    .then(primitiveData => {
      //TODO: TEST
      deferred.resolve({
        primitiveData: {
          "2019/10/5": '{"5.122.110.204":6}',
          "2019/10/20": '{"5.122.110.202":6}',
          "2019/10/10":
            '{"5.122.110.203":6,"5.122.210.203":6,"5.122.190.203":6}',
          "2019/10/150":
            '{"5.122.110.207":6,"5.112.110.207":6,"2.122.110.207":6}',
          "2019/09/4":
            '{"5.121.818.187":3,"5.1231.68.187":10,"5.1421.78.187":30}',
          "2019/09/5":
            '{"5.121.828.174":14,"5.121.88.1587":3,"35.1721.88.187":3}',
          "2019/05/10": '{"5.157.96.150":3,"8.195.62.188": 817}',
          "2019/05/11": '{"5.257.96.150":100,"8.195.62.188": 100}',
          "2019/06/20": '{"5.121.15.157":3}'
        },
        config,
        client
      });

      // primitiveData && primitiveData.length>0
      //     ? deferred.resolve({
      //         ...typeof primitiveData === "string"
      //             ? JSON.parse(primitiveData)
      //             : primitiveData
      //         ,config,client}
      //     )
      //     : deferred.reject(errorModel(config.logBucket,'fetchDataFromRedis','nothing exist in redis to fetch for store.'))
    });
  return deferred.promise;
};
const prepareDataToStore = ({ primitiveData, config }) => {
  let midContain = [];
  let TempObj_small = (contain, reply, el) => {
    let Detail = [];
    let detailObj = JSON.parse(reply[el]);
    _.forIn(detailObj, (value, key) => {
      let slimObj = {};
      slimObj.ip = key;
      slimObj.count = value;
      Detail.push(slimObj);
    });
    let slimObj = {};
    slimObj.Day = +contain[2];
    slimObj.DateVisi = `${+contain[0]}/${+contain[1]}`;
    slimObj.TotalVisit = _.sum(Object.values(detailObj));
    slimObj.TotalVisitors = Object.keys(detailObj).length;
    slimObj.Detail = Detail;
    return slimObj;
  };
  let TempObj = (contain, reply, el, midContain) => {
    let midObj = {};
    let slimObj = TempObj_small(contain, reply, el);
    midObj.Year = +contain[0];
    midObj.Month = +contain[1];
    midObj[config.countBox] = slimObj.TotalVisitors;
    midObj[config.countBox2] = slimObj.TotalVisit;
    midObj[config.collectionName] = [];
    midObj[config.collectionName].push(slimObj);
    midContain.push(midObj);
  };
  let delKeys = [];
  _.forIn(primitiveData, (value, key) => {
    if (moment(key, "YYYY/MM/DD").isBefore(moment(), "month")) {
      let contain = key.split("/");
      delKeys.push(key);
      if (midContain.length === 0) {
        TempObj(contain, primitiveData, key, midContain);
      } else {
        let target_obj = { Year: +contain[0], Month: +contain[1] };
        if (_.some(midContain, target_obj)) {
          let elem = _.find(midContain, target_obj);
          let smallObj = TempObj_small(contain, primitiveData, key);
          elem[config.countBox] += smallObj.TotalVisitors;
          elem[config.countBox2] += smallObj.TotalVisit;
          elem[config.collectionName].push(smallObj);
        } else {
          TempObj(contain, primitiveData, key, midContain);
        }
      }
    }
  });
  return { midContain, delKeys };
};
const storeModels = async ({ midContain, config, delKeys, client }) => {
  let deferred = Q.defer();
  let arrLength = midContain.length;
  let modelContainer = [];
  let specArr = [];
  if (arrLength < 1)
    deferred.reject(
      errorModel(
        config.logBucket,
        "storeModels",
        "Nothing have found from redisDB to store in mongoDB"
      )
    );
  for (let i = 0; i < arrLength; i++) {
    let smallContain = midContain[i];
    await Visitors.findOne({
      Year: smallContain.Year,
      Month: smallContain.Month
    })
      .then(visitor => {
        let visitorModel = visitor
          ? visitor
          : new Visitors({
              Year: +smallContain.Year,
              Month: +smallContain.Month,
              onlineCount: +smallContain.onlineCount,
              totalVisit: +smallContain.totalVisit
            });
        let onlineCountModel = [];
        let specificCollection = smallContain[config.collectionName];
        specArr.push(...specificCollection);
        let smallArrLength = specificCollection.length;
        if (smallArrLength > 0) {
          for (let i = 0; i < smallArrLength; i++) {
            let {
              Day,
              Total,
              Detail,
              TotalVisit,
              TotalVisitors
            } = specificCollection[i];
            const model = new onlineVisitorsList({
              Day,
              Total,
              Detail,
              TotalVisit,
              TotalVisitors,
              DateVisi: `${smallContain.Year}/${smallContain.Month}`
            });
            onlineCountModel.push(model);
          }
        }
        visitorModel[config.collectionName].push(...onlineCountModel);
        modelContainer.push(visitorModel, ...onlineCountModel);
      })
      .catch(err =>
        deferred.reject(errorModel(config.logBucket, "storeModels", err))
      );
  }
  Promise.all(modelContainer.map(el => el.save()))
    .then(_ => deferred.resolve({ config, delKeys, client }))
    .catch(err =>
      deferred.reject(errorModel(config.logBucket, "storeModels", err))
    );
  return deferred.promise;
};
const storeDataToMongoDB = Q.fbind(({ primitiveData, config, client }) =>
  storeModels({
    ...prepareDataToStore({ primitiveData, config }),
    config,
    client
  })
);
const deleteDataFromRedisDB = ({ client, config, delKeys }) => {
  let deferred = Q.defer();
  console.log("DELETE::: onlineVisitors-- ", ...delKeys); //TODO: TEST <delete>
  deferred.resolve(); //TODO: TEST <delete>
  // client.hdel(config.redisBucket, ...delKeys)
  //     .then(reply => {
  //         if(reply===0) throw new Error('Couldn\'t Delete Data From Redis ')
  //         return deferred.resolve()
  //     })
  //     .catch(err => deferred.reject(errorModel(config.logBucket,'deleteDataFromRedisDB',err)))
  return deferred.promise;
};

module.exports = ({ client, config }) => {
  let deferred = Q.defer();
  let load1 = loading.spin1(
    `${col.red(
      `[${config.logBucket}]`
    )} Preparing Data for saving into the Database...`
  );
  let load2 = loading.spin1(
    `${col.red(`[${config.logBucket}]`)} Saving Data To Database...`
  );
  let load3 = loading.spin1(
    `${col.red(`[${config.logBucket}]`)} Deleting From RedisDB...`
  );
  Q({ client, config })
    .tap(() => load1.start())
    .then(fetchDataFromRedis)
    .tap(() => {
      load1.stop();
      console.log(
        col.green(`${fig.tick} [${config.logBucket}]`),
        "Prepared Data For Saving Into The Database..."
      );
      load2.start();
    })
    .then(storeDataToMongoDB)
    .tap(() => {
      load2.stop();
      console.log(
        col.green(`${fig.tick} [${config.logBucket}]`),
        "Saved Data To Database..."
      );
      load3.start();
    })
    .then(deleteDataFromRedisDB)
    .tap(() => {
      load3.stop();
      console.log(
        _.join(
          [
            col.green(`${fig.tick} [${config.logBucket}]`),
            " Data Deleted From Redis..."
          ],
          ""
        )
      );
    })
    .then(deferred.resolve)
    .catch(err => {
      load3.stop();
      load1.stop();
      load2.stop();
      deferred.reject(err);
    });

  return deferred.promise;
};
