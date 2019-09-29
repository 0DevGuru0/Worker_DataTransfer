const Users = require('../model/users');
const moment = require('moment')

const container = {
    onlineUsersList:(message)=>{
        console.log('1.',message)
    },
    totalUsersVerified:(message)=>{
        console.log('2.',message)
    },
    totalUsersList:(message)=>{
        console.log('3.',message)
    }
}

module.exports = (channel,message)=>{
    switch (message) {
        case 'online:users:TList': 
            container.onlineUsersList(message);
            break;
        case 'total:Verified:UserList': 
            container.totalUsersVerified(message)
            break;
        case 'total:users:TList': 
            container.totalUsersList(message)           
            break;
        default:console.log(message)
            break;

    }

}