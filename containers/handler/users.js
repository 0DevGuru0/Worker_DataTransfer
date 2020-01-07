const Q = require("q");
const chalk = require("chalk");
const {usersStore} = require("./provider");
const {ui} = require('../../helpers')

const container = {
  onlineUsersList: client => {
    var deferred = Q.defer();
    let config = {
      redisBucket: "online:users:TList",
      logBucket: "onlineUsersList",
      collectionName: "onlineCount"
    };
    usersStore({config,client})      
      .then(_ => deferred.resolve(client))
      .catch(deferred.reject);
    return deferred.promise;
  },
  totalUsersVerified: client => {
    var deferred = Q.defer();
    let config = {
      redisBucket: "total:Verified:UserList",
      logBucket: "totalUsersVerified",
      collectionName: "totalVerifiedUsers"
    };
    usersStore({config,client})      
      .then(_ => deferred.resolve(client))
      .catch(deferred.reject);
    return deferred.promise;
  },
  totalUsersList: client => {
    var deferred = Q.defer();
    let config = {
      redisBucket: "total:users:TList",
      logBucket: "totalUsersList",
      collectionName: "totalUsers"
    };
    usersStore({config,client})      
      .then(_ => deferred.resolve(client))
      .catch(deferred.reject);
    return deferred.promise;
  }
};

module.exports = {
  usersCont: container,
  usersWorker: client => {
    let deferred = Q.defer();
    console.log(ui.horizontalLine);
    let main = container.onlineUsersList(client);
    let main1 = main.then(container.totalUsersList);
    main1
      .then(container.totalUsersVerified)
      .then(() => {
        console.log(
          chalk.bold.bgGreen.white(
            "Congratulation!!! Users Data Transferring to MongoDB is successfully done.."
          )
        );
        deferred.resolve(client);
      })
      .catch(reason =>
        console.log(
          chalk.green("MAIN[DataTransfer]"),
          chalk.white.bgRed("[ERROR]"),
          reason
        )
      );
    return deferred.promise;
  }
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
