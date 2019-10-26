const Q     = require('q');
const chalk = require('chalk');
const Users = require("../model/users");
const asyncRedis      = require('async-redis');
const storeFunction = require('./utils/storeFunc');
Users.on("index", err => {
  err 
    ?console.error(chalk.black.bold.bgYellow('[ Users_MongoDB ]'),"Users index error: %s", err) 
    :console.info(chalk.black.bold.bgYellow('[ Users_MongoDB ]'),"Users indexing complete");
});

const container = {
  onlineUsersList: client=> {
    var deferred = Q.defer();
    let config = {
      client, deferred,
      redisBucket:'online:users:TList',
      logBucket:'onlineUsersList',
      collectionName:'onlineCount'
    }
    storeFunction(config)
    return deferred.promise;
  },
  totalUsersVerified: client=> {
    var deferred = Q.defer();
    let config = {
      client, deferred,
      redisBucket:'total:Verified:UserList',
      logBucket:'totalUsersVerified',
      collectionName:'totalVerifiedUsers'
    } 
    storeFunction(config)
    return deferred.promise;
  },
  totalUsersList: client=> { 
    var deferred = Q.defer();
    let config = {
      client, deferred,
      redisBucket:'total:users:TList',
      logBucket:'totalUsersList',
      collectionName:'totalUsers'
    }
    storeFunction(config)
    return deferred.promise;
  }
};

module.exports = redis => {
  var deferred = Q.defer();
  const client = asyncRedis.decorate(redis);
  console.log(chalk.bold('-------------------------------------------------------------'))
  container.onlineUsersList(client)
    .then(container.totalUsersList)
    .then(container.totalUsersVerified)
    .then(()=>{
      console.log(chalk.bold.bgGreen.black('Congratulation!!! Users Data Transferring to MongoDB is successfully done..'))
      deferred.resolve(client)
    })
    .catch(reason=>console.log( chalk.green("[DataTransfer]"), chalk.white.bgRed("[ERROR]") ,reason))
  return deferred.promise;
};



// switch (message) {
  //     case 'online:users:TList':
  //         break;
      // case 'total:Verified:UserList':
      //     container.totalUsersVerified(message,redis)
      //     break;
      // case 'total:users:TList':
      //     container.totalUsersList(message,redis)
      //     break;
      // default:console.log(message)
      //     break;
  // }