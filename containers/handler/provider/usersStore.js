const Q = require("q");
const _ = require("lodash");
const moment = require("moment");

const {
  Users,
  OnlineUsersCount,
  TotalUsersCount,
  TotalVerifiedUsersCount
} = require("../../../database/model/users");
const { errorModel } = require("../../../helpers");
const UILog = require("./handler/UI_handler");
const FetchData = require("./handler/FetchData");
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
  let TempObj = async (contain, reply, el) => {
    let midObj = {};
    let slimObj = await TempObj_small(contain, reply, el);
    midObj.Year = +contain[0];
    midObj.Month = +contain[1];
    midObj[config.collectionName] = [];
    midObj[config.collectionName].push(slimObj);
    midContain.push(midObj);
  };
  let delKeys = [];
  /* eslint no-await-in-loop: "off" */
  for (let el in reply) {
    if (moment(el, "YYYY/MM/DD").isBefore(moment(), "month")) {
      let contain = el.split("/");
      delKeys.push(el);
      if (midContain.length === 0) {
        await TempObj(contain, reply, el, midContain);
      } else {
        // map through collection find objects that have same year and month
        let target_obj = { Year: +contain[0], Month: +contain[1] };
        if (_.some(midContain, target_obj)) {
          let elem = _.find(midContain, target_obj);
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

/*  storeDataToMongoDB <Function>
    Input: midContain, config, delKeys, fetchData
    Output: config, delKeys, fetchData
*/
// const storeDataToMongoDB = async ({
//   midContain,
//   config,
//   delKeys,
//   fetchData
// }) => {
//   let deferred = Q.defer();
//   let arrLength = midContain.length;
//   let modelContainer = [];
//   if (arrLength === 0)
//     deferred.reject(
//       errorModel(
//         config.logBucket,
//         "storeDataToMongoDB",
//         "Nothing prepared to store in mongodb"
//       )
//     );
//   for (let i = 0; i < arrLength; i++) {
//     let smallContain = midContain[i];
//     let user;
//     try {
//       user = await Users.findOne({
//         Year: smallContain.Year,
//         Month: smallContain.Month
//       });
//     } catch (err) {
//       deferred.reject(errorModel(config.logBucket, "storeDataToMongoDB", err));
//     }

//     let userModel = user
//       ? user
//       : new Users({ Year: smallContain.Year, Month: smallContain.Month });
//     let CountModel = null;
//     if (config.collectionName === "onlineCount") {
//       CountModel = new OnlineUsersCount({
//         Days: smallContain[config.collectionName]
//       });
//     } else if (config.collectionName === "totalUsers") {
//       CountModel = new TotalUsersCount({
//         Days: smallContain[config.collectionName]
//       });
//     } else if (config.collectionName === "totalVerifiedUsers") {
//       CountModel = new TotalVerifiedUsersCount({
//         Days: smallContain[config.collectionName]
//       });
//     } else {
//       deferred.reject(
//         errorModel(
//           config.logBucket,
//           "storeDataToMongoDB",
//           "Collection Couldn't Found,Make Sure Typed CollectionName correctly"
//         )
//       );
//     }
//     userModel[config.collectionName].push(CountModel);
//     modelContainer.push(userModel, CountModel);
//   }
//   Promise.all(modelContainer.map(el => el.save()))
//     .then(_ => deferred.resolve({ config, delKeys, fetchData }))
//     .catch(err =>
//       deferred.reject(errorModel(config.logBucket, "storeDataToMongoDB", err))
//     );
//   return deferred.promise;
// };
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
