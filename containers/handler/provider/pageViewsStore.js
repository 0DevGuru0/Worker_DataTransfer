const moment = require("moment");
const Q = require("q");
const _ = require("lodash");
const col = require("chalk");

const { PageViews, Visitors } = require("../../../database/model/visitors");
const { errorModel } = require("../../../helpers");
const UILog = require("./handler/UI_handler");

const fetchDataFromRedis = ({ client, config }) => {
  let deferred = Q.defer();
  client
    .smembers("pageViews:List:keys")
    .then(reply => {
      if (!reply || (reply && reply.length === 0))
        throw new Error("nothing exist in redis to fetch for store.");
      deferred.resolve({ reply, config, client });
    })
    .catch(err =>
      deferred.reject(errorModel(config.logBucket, "fetchDataFromRedis", err))
    );
  return deferred.promise;
};

function TempObj_small(contain, reply, el) {
  let Detail = [];
  let detailObj = JSON.parse(reply[el]);
  _.forIn(detailObj, (value, key) => {
    let slimObj = {};
    slimObj.page = key;
    slimObj.count = value;
    Detail.push(slimObj);
  });
  let slimObj = {};
  slimObj.Day = +contain[2];
  slimObj.DateVisi = `${+contain[0]}/${+contain[1]}`;
  slimObj.Detail = Detail;
  return slimObj;
}

function TempObj(contain, reply, el, config) {
  let midObj = {};
  let slimObj = TempObj_small(contain, reply, el);
  midObj.Year = +contain[0];
  midObj.Month = +contain[1];
  midObj[config.collectionName] = [];
  midObj[config.collectionName].push(slimObj);
  return midObj;
}

const prepareDataToStore = async ({ reply, config, client }) => {
  const deferred = Q.defer();
  let container = {};
  let midContain = [];
  let forContainer = [];
  let modelFunc = i =>
    new Promise((res, rej) => {
      let rep = reply[i];
      client
        .hgetall(rep)
        .then(result => res({ rep, result }))
        .catch(err => rej(err));
    });
  for (let i = 0; i < reply.length; i++) forContainer.push(modelFunc(i));

  await Promise.all(forContainer)
    .then(results => {
      _.forEach(results, ({ rep, result }) => {
        result = JSON.stringify(result);
        let date = rep.split(":")[1];
        container[date] = result;
      });
    })
    .catch(err =>
      deferred.reject(errorModel(config.logBucket, "prepareDataToStore", err))
    );

  // TODO: TEST --> [delete container]
  container = {
    "2019/10/20": '{"/admins":"1","/users":"1"}',
    "2019/10/22": '{"/admins":"1","/users":"1"}',
    "2019/10/24": '{"/users":"1","/admins":"1","/SignIn":"1"}',

    "2019/11/13": '{"/admins":"5"}',
    "2019/11/15": '{"/users":"1","/admins":"1","/SignIn":"1","/SignUp":"1"}',
    "2019/11/23": '{"/SignIn":"1","/admins":"1","/users":"1"}',

    "2019/9/14":
      '{"/admins":"3","/users":"3","/SignIn":"3","/SignUp":"2","/":"1"}',
    "2019/12/23": '{"/SignIn":"2","/admins":"1","/users":"1"}'
  };
  let delKeys = [];
  _.forIn(container, (val, key) => {
    if (moment(key, "YYYY/MM/DD").isBefore(moment(), "month")) {
      let contain = key.split("/");
      delKeys.push(key);
      if (midContain.length === 0) {
        midContain.push(TempObj(contain, container, key, config));
      } else {
        let target_obj = { Year: +contain[0], Month: +contain[1] };
        if (_.some(midContain, target_obj)) {
          let elem = _.find(midContain, target_obj);
          elem[config.collectionName].push(
            TempObj_small(contain, container, key)
          );
        } else {
          midContain.push(TempObj(contain, container, key, config));
        }
      }
    }
  });
  if (midContain.length === 0)
    deferred.reject(
      errorModel(
        config.logBucket,
        "prepareDataToStore",
        "Nothing has exist in bucket..."
      )
    );
  deferred.resolve({ midContain, delKeys });
  return deferred.promise;
};

const storeModels = async ({ config, client, midContain, delKeys }) => {
  let deferred = Q.defer();
  let arrLength = midContain.length;
  let specArr = [];
  let forContainer = [];
  const modelFunc = i =>
    new Promise((res, rej) => {
      let smallContain = midContain[i];
      Visitors.findOne({
        Year: +smallContain.Year,
        Month: +smallContain.Month
      })
        .then(visitor => res({ visitor, smallContain }))
        .catch(err => rej(err));
    });
  for (let i = 0; i < arrLength; i++) forContainer.push(modelFunc(i));
  await Promise.all(forContainer)
    .then(visitors =>
      _.forEach(visitors, ({ visitor, smallContain }) => {
        let visitorModel = visitor
          ? visitor
          : new Visitors({
              Year: +smallContain.Year,
              Month: +smallContain.Month
            });
        let pageViewsModel = [];
        let specificCollection = smallContain[config.collectionName];
        specArr.push(...specificCollection);
        let smallArrLength = specificCollection.length;
        if (smallArrLength > 0) {
          for (let i = 0; i < smallArrLength; i++) {
            let { Day, Detail, DateVisi } = specificCollection[i];
            pageViewsModel.push(new PageViews({ Day, Detail, DateVisi }));
          }
        }
        visitorModel[config.collectionName].push(...pageViewsModel);
        let modelContainer = [visitorModel, ...pageViewsModel];
        if (modelContainer.length === 0)
          throw new Error("Nothing has been exist to store to Mongodb...");
        Promise.all(modelContainer.map(el => el.save()))
          .then(() => deferred.resolve({ client, delKeys, config }))
          .catch(err => new Error(err));
      })
    )
    .catch(err =>
      deferred.reject(errorModel(config.logBucket, "storeModels", err))
    );

  return deferred.promise;
};

const storeDataToMongoDB = arg =>
  Q(prepareDataToStore(arg)).then(obj =>
    storeModels(
      _.pick(_.assign(arg, obj), ["client", "config", "midContain", "delKeys"])
    )
  );

const deleteDataFromRedisDB = ({ client, delKeys, config }) => {
  let deferred = Q.defer();
  console.log(col.bgRed("DELETE:::"), "pageViews--", ...delKeys);
  client
    .srem("pageViews:List:keys", ...delKeys)
    .then(replyOuter =>
      client
        .del(...delKeys.map(key => `pageViews:${key}`))
        .then(replyInner => {
          // TODO: TEST [uncomment]
          // if(replyOuter === 0 || replyInner === 0) throw new Error('Couldn\'t Delete Data From Redis')
          deferred.resolve();
        })
        .catch(new Error())
    )
    .catch(err =>
      deferred.reject(
        errorModel(config.logBucket, "deleteDataFromRedisDB", err)
      )
    );
  return deferred.promise;
};
module.exports = ({ client, config }) =>
  new UILog({ config, client }).master({
    Prepare: fetchDataFromRedis,
    Save: storeDataToMongoDB,
    Delete: deleteDataFromRedisDB
  });
