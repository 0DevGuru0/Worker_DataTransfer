const moment = require("moment"),
  _ = require("lodash"),
  chalk = require("chalk"),
  pageViews = require("../../../database/model/visitors/pageViews"),
  Visitors = require("../../../database/model/visitors"),
  EdgeYear = +moment().format("YYYY"),
  EdgeMonth = +moment().format("MM");

async function fetchDataFromRedis(client, deferred) {
  let reply = null;
  try {
    reply = await client.smembers("pageViews:List:keys");
  } catch (err) {
    console.log(
      chalk.bold.bgRed("Error Ocurred At:"),
      "[Visitors]",
      "[pageViewsFunction]"
    );
    deferred.reject(err);
  }
  return reply;
}
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
async function DataPrepare(client, deferred, config) {
  let reply = await fetchDataFromRedis(client, deferred);
  if (reply && reply.length === 0) {
    console.log(
      chalk.green(`[${config.logBucket}]`),
      "Nothing has exist in bucket..."
    );
    deferred.resolve(client);
  }
  let container = {};
  let midContain = [];
  for (let i = 0; i < reply.length; i++) {
    let result = JSON.stringify(await client.hgetall(reply[i]));
    let date = reply[i].split(":")[1];
    container[date] = result;
  }
  // TODO: TEST delete container
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
  if (midContain.length === 0) {
    console.log(
      chalk.green(`[${config.logBucket}]`),
      "Nothing has exist in bucket..."
    );
    deferred.resolve(client);
  }
  return { midContain, delKeys };
}
async function StorePrepare(midContain, deferred, config) {
  let arrLength = midContain.length;
  let modelContainer = [];
  let specArr = [];

  console.log(
    chalk.green(`[${config.logBucket}]`),
    "Saving Data To Database..."
  );
  for (let i = 0; i < arrLength; i++) {
    let smallContain = midContain[i];
    let visitor = await Visitors.findOne({
      Year: +smallContain.Year,
      Month: +smallContain.Month
    });
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
        const model = new pageViews({ Day, Detail, DateVisi });
        pageViewsModel.push(model);
      }
    }
    visitorModel[config.collectionName].push(...pageViewsModel);
    modelContainer.push(visitorModel, ...pageViewsModel);
  }
  if (modelContainer.length === 0) {
    console.log(
      chalk.bold.bgRed("Error Ocurred At:"),
      "[Visitors]",
      "[pageViewsFunction]"
    );
    deferred.reject("Nothing has been exist to store to Mongodb...");
  }
  return modelContainer;
}
async function deleteDataFromRedis(client, keys, deferred, config) {
  let reply1, reply2;
  try {
    //TODO: TEST
    console.log("DELETE:::", "pageViews--", ...keys);
    // reply1 = await client.srem('pageViews:List:keys',...keys)
    // reply2 = await client.del(...keys.map(key=>"pageViews:"+key))
  } catch (err) {
    console.log(
      chalk.green(`[${config.logBucket}]`),
      chalk.white.bgRed("[ERROR]"),
      err.message
    );
    return deferred.reject(err);
  }
  if (reply1 === 0 || reply2 === 0) {
    return { ErrRedis: "Couldn't Delete Data From Redis" };
  } else {
    console.log(
      chalk.green(`[${config.logBucket}]`),
      "Data Delete From Redis..."
    );
    console.log(
      chalk.bold(
        "-------------------------------------------------------------"
      )
    );
    return { ErrRedis: null };
  }
}
module.exports = async (client, deferred) => {
  let config = {
    collectionName: "pageViews",
    logBucket: "pageViews"
  };
  let { midContain, delKeys } = await DataPrepare(client, deferred, config);
  let modelContainer = await StorePrepare(midContain, deferred, config);
  Promise.all(modelContainer.map(el => el.save()))
    .then(async () => {
      console.log(
        chalk.green(`[${config.logBucket}]`),
        "Saved Data To Database..."
      );
      let { ErrRedis } = await deleteDataFromRedis(
        client,
        delKeys,
        deferred,
        config
      );
      if (ErrRedis) {
        console.log(chalk.red(`[${config.logBucket}][Redis]`), ErrRedis);
        console.log(
          chalk.bold(
            "-------------------------------------------------------------"
          )
        );
        return config.deferred.resolve(config.client);
      }
      deferred.resolve(client);
    })
    .catch(err => {
      console.log(
        chalk.bold.bgRed("Error Ocurred At:"),
        "[Visitors]",
        "[pageViewsFunction]"
      );
      deferred.reject(new Error(err));
    });
};
