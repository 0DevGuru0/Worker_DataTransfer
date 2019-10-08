const Q     = require('q');
const Users = require("../model/users");
const chalk = require('chalk');
const storeFunction = require('./utils/storeFunc')
Users.on("index", err => {
  err 
    ?console.error(chalk.black.bold.bgCyan('[ MongoDB ]'),"Users index error: %s", err) 
    :console.info(chalk.black.bold.bgCyan('[ MongoDB ]'),"Users indexing complete");
});

const container = {
  onlineUsersList: redis=> {
    var deferred = Q.defer();
    storeFunction(redis,deferred,'online:users:TList','onlineUsersList','onlineCount')
    return deferred.promise;
  },
  totalUsersVerified: async (redis) => { 
    var deferred = Q.defer();
    setTimeout(()=>{ console.log('2.totalUsersVerified') },3000)
    return deferred.promise;
  },
  totalUsersList: redis=> { 
    var deferred = Q.defer();
    storeFunction(redis,deferred,'total:users:TList','totalUsersList','totalUsers')
    return deferred.promise;
  }
};

module.exports = redis => {
 container.onlineUsersList(redis)
    .then(container.totalUsersList)
    .then(container.totalUsersVerified)
    .catch(reason=>console.log( chalk.green("[DataTransfer]"), chalk.white.bgRed("[ERROR]") ,reason))
    .done(()=>{ process.exit(0) })
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