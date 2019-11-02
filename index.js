console.clear();
const chalk = require('chalk');
const {DBTransfer,MongoDB,RedisDB} = require('./server')
const CliInterface = require('./server/cli')
// start Server
// RedisDB()
//     .then(MongoDB)
//     .then(DBTransfer)
//     .catch(reason=>console.log(
//         chalk.green("[Server]"), 
//         chalk.white.bgRed("[ERROR]"),
//         reason
//     ))

CliInterface()