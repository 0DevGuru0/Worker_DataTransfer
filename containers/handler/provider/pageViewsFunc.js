const moment = require("moment"),
  Q = require("q"),
  _ = require("lodash"),
  col = require("chalk"),
  pageViews = require("../../../database/model/visitors/pageViews"),
  Visitors = require("../../../database/model/visitors"),
  EdgeYear = +moment().format("YYYY"),
  { ui } = require("../../../helpers"),
  EdgeMonth = +moment().format("MM");

const errorModel = (logBucket, section, message) =>
  _.join(
    [
      col.green("[" + logBucket + "]"),
      col.white.bgRed("[ERROR]"),
      col.bold.red("[" + section + "]"),
      col.bold(message)
    ],
    " "
  );

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

  for (let i = 0; i < reply.length; i++) {
    await client
      .hgetall(reply[i])
      .then(result => {
        result = JSON.stringify(result);
        let date = reply[i].split(":")[1];
        container[date] = result;
      })
      .catch(err =>
        deferred.reject(errorModel(config.logBucket, "prepareDataToStore", err))
      );
  }
  // TODO: TEST --> [delete container]
  container = {
    "2019/10/20": '{"/admins":"1","/users":"1"}',
    "2019/11/15": '{"/users":"1","/admins":"1","/SignIn":"1","/SignUp":"1"}',
    "2019/10/22": '{"/admins":"1","/users":"1"}',
    "2019/11/13": '{"/admins":"5"}',
    "2019/10/24": '{"/users":"1","/admins":"1","/SignIn":"1"}',
    "2019/9/14":
      '{"/admins":"3","/users":"3","/SignIn":"3","/SignUp":"2","/":"1"}',
    "2019/11/23": '{"/SignIn":"1","/admins":"1","/users":"1"}',
    "2019/12/23": '{"/SignIn":"2","/admins":"1","/users":"1"}'
  };
  let delKeys = [];
  _.forIn(container, (value, key) => {
    let contain = key.split("/");
    let objYear = +contain[0];
    let objMonth = +contain[1];
    if (objYear <= EdgeYear && objMonth < EdgeMonth) {
      delKeys.push(key);
      if (midContain.length === 0) {
        midContain.push(TempObj(contain, container, key, config));
      } else {
        let elem = midContain[midContain.length - 1];
        if (elem.Year === objYear && elem.Month === objMonth) {
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
  let modelContainer = [];
  let specArr = [];
  for (let i = 0; i < arrLength; i++) {
    let smallContain = midContain[i];
    let visitor = await Visitors.findOne({
      Year: +smallContain.Year,
      Month: +smallContain.Month
    });
    let visitorModel = visitor
      ? visitor
      : await new Visitors({
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
        const model = await new pageViews({ Day, Detail, DateVisi });
        pageViewsModel.push(model);
      }
    }
    visitorModel[config.collectionName].push(...pageViewsModel);
    modelContainer.push(visitorModel, ...pageViewsModel);
  }
  if (modelContainer.length === 0)
    deferred.reject(
      errorModel(
        config.logBucket,
        "storeDataToMongoDB",
        "Nothing has been exist to store to Mongodb..."
      )
    );
  Promise.all(modelContainer.map(el => el.save()))
    .then(_ => deferred.resolve({ client, delKeys, config }))
    .catch(err =>
      deferred.reject(errorModel(config.logBucket, "storeDataToMongoDB", err))
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
        .del(...delKeys.map(key => "pageViews:" + key))
        .then(replyInner => {
          // TODO: TEST [uncomment]
          // if(replyOuter === 0 || replyInner === 0) throw new Error('Couldn\'t Delete Data From Redis')
          deferred.resolve();
        })
        .catch(new Error)
    )
    .catch(err =>
      deferred.reject(
        errorModel(config.logBucket, "deleteDataFromRedisDB", err)
      )
    );
  return deferred.promise;
};

module.exports = (client, config) => {
  let deferred = Q.defer();
  Q({ client, config })
    .then(fetchDataFromRedis)
    .tap(() =>
      console.log(
        col.green(`[${config.logBucket}]`),
        "Saving Data To Database..."
      )
    )
    .then(storeDataToMongoDB)
    .tap(() =>
      console.log(
        col.green(`[${config.logBucket}]`),
        "Saved Data To Database..."
      )
    )
    .then(deleteDataFromRedisDB)
    .tap(() =>
      console.log(
        _.join(
          [
            col.green(`[${config.logBucket}]`),
            " Data Delete From Redis...\n",
            ui.horizontalLine
          ],
          ""
        )
      )
    )
    .then(deferred.resolve)
    .catch(deferred.reject);

  return deferred.promise;
};
