const Q     = require('q');
const chalk = require('chalk');
const Users = require("../model/users");
const storeFunction = require('./utils/storeFunc')
Users.on("index", err => {
  err 
    ?console.error(chalk.black.bold.bgYellow('[ Users_MongoDB ]'),"Users index error: %s", err) 
    :console.info(chalk.black.bold.bgYellow('[ Users_MongoDB ]'),"Users indexing complete");
});

const container = {
  onlineUsersList: redis=> {
    var deferred = Q.defer();
    storeFunction(redis,deferred,'online:users:TList','onlineUsersList','onlineCount')
    return deferred.promise;
  },
  totalUsersVerified: redis=> { 
    var deferred = Q.defer();
    storeFunction(redis,deferred,'total:Verified:UserList','totalUsersVerified','totalVerifiedUsers')
    return deferred.promise;
  },
  totalUsersList: redis=> { 
    var deferred = Q.defer();
    storeFunction(redis,deferred,'total:users:TList','totalUsersList','totalUsers')
    return deferred.promise;
  }
};

module.exports = redis => {
  var deferred = Q.defer();
  console.log(chalk.bold('-------------------------------------------------------------'))
  container.onlineUsersList(redis)
    .then(container.totalUsersList)
    .then(container.totalUsersVerified)
    .then(()=>{
      console.log(chalk.bold.bgGreen.black('Congratulation!!! Users Data Transferring to MongoDB is successfully done..'))
      deferred.resolve(redis)
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