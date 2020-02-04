const Q = require("q");
const _ = require("lodash");
const moment = require("moment");

const {
  Users,
  TotalUsersCount,
  TotalVerifiedUsersCount,
  OnlineUsersCount
} = require("../../../database/model/users");
const { errorModel } = require("../../../helpers");
const UILog = require("./handler/UI_handler");
const FetchData = require("./handler/testF");
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

  let TempObj_small = (contain, el) => {
    let Obj = { Day: +contain[2], Count: reply[el] };
    if (config.collectionName === "onlineCount") {
      return fetchData
        .getUsersFromRedis(el)
        .then(result => {
          Obj.Users = result;
          return Obj;
        })
        .catch(err => err);
    }
    return Obj;
  };
  let TempObj = (contain, el) =>
    new Promise((res, rej) => {
      let midObj = {};
      TempObj_small(contain, el)
        .then(slimObj => {
          midObj.Year = +contain[0];
          midObj.Month = +contain[1];
          midObj[config.collectionName] = [];
          midObj[config.collectionName].push(slimObj);
          res(midObj);
        })
        .catch(rej);
    });
  let delKeys = [];
  let forContainer = [];
  let midContain = [];

  const modelFunc = el =>
    new Promise((res, rej) => {
      if (moment(el, "YYYY/MM/DD").isBefore(moment(), "month")) {
        let contain = el.split("/");
        delKeys.push(el);
        let target_obj = { Year: +contain[0], Month: +contain[1] };

        if (midContain.length !== 0 && _.some(midContain, target_obj)) {
          console.log("ok");
        }
        //   let elem = _.find(midContain, target_obj);
        //   TempObj_small(contain, el)
        //     .then(smallObj => {
        //       elem[config.collectionName].push(smallObj);
        //       res();
        //     })
        //     .catch(rej);
        // } else {
        TempObj(contain, el)
          .then(midObj => {
            let target_obj = { Year: +contain[0], Month: +contain[1] };
            console.log(_.some(midContain, target_obj));
            midContain.push(midObj);
            console.log(_.some(midContain, target_obj));
            res();
          })
          .catch(err => console.log(err));
        // }
      }
      //  else {
      //   res(null);
    });
  for (let el in reply) {
    if (Object.prototype.hasOwnProperty.call(reply, el))
      forContainer.push(modelFunc(el));
  }
  await Promise.all(forContainer)
    .then(() => {
      deferred.resolve({ midContain, delKeys, config, fetchData });
    })
    .catch(err =>
      deferred.reject(errorModel(config.logBucket, "prepareData", err))
    );
  return deferred.promise;
};

/*  storeDataToMongoDB <Function>
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
  if (arrLength === 0)
    deferred.reject(
      errorModel(
        config.logBucket,
        "storeDataToMongoDB",
        "Nothing prepared to store in mongodb"
      )
    );
  let forContainer = [];
  const modelFunc = i =>
    new Promise((res, rej) => {
      let smallContain = midContain[i];
      Users.findOne({
        Year: smallContain.Year,
        Month: smallContain.Month
      })
        .then(user => res({ user, smallContain }))
        .catch(rej);
    });
  for (let i = 0; i < arrLength; i++) forContainer.push(modelFunc(i));
  await Promise.all(forContainer)
    .then(async users => {
      let modelContainer = [];
      _.forEach(users, ({ user, smallContain }) => {
        let userModel = user
          ? user
          : new Users({ Year: smallContain.Year, Month: smallContain.Month });
        let CountModel;
        switch (config.collectionName) {
          case "onlineCount":
            CountModel = new OnlineUsersCount({
              Days: smallContain[config.collectionName]
            });
            break;
          case "totalUsers":
            CountModel = new TotalUsersCount({
              Days: smallContain[config.collectionName]
            });
            break;
          case "totalVerifiedUsers":
            CountModel = new TotalVerifiedUsersCount({
              Days: smallContain[config.collectionName]
            });
            break;
          default:
            throw new Error(
              "Collection Couldn't Found,Make Sure Typed CollectionName correctly"
            );
        }
        userModel[config.collectionName].push(CountModel);
        modelContainer.push(userModel, CountModel);
      });
      if (modelContainer.length === 0)
        throw new Error("Nothing has been exist to store to Mongodb...");
      await Promise.all(modelContainer.map(el => el.save()))
        .then(() => deferred.resolve({ config, delKeys, fetchData }))
        .catch(err => {
          console.log(err);
          throw new Error(err);
        });
    })
    .catch(err =>
      deferred.reject(errorModel(config.logBucket, "storeDataToMongoDB", err))
    );

  return deferred.promise;
};
/*  deleteDataFromRedisDB <Function>
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
module.exports = ({ client, config }) =>
  new UILog({ config, client }).master({
    Initial: { fetchData: new FetchData({ client, config }), config },
    Prepare: prepareDataToStore,
    Save: storeDataToMongoDB,
    Delete: deleteDataFromRedisDB
  });
