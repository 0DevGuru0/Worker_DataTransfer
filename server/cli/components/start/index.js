const clc               = require('chalk'),
    auto_all          = require('./transfer/auto/all'),
    auto_bucket       = require('./transfer/auto/bucket'),
    manualTransfer    = require('./transfer/manual')
    ask               = require('inquirer');

class StartComponent {
    constructor(){     
    }
    autoBucket(){
        let question = [
            {
                type: 'list',
                name: 'intervalTime',
                default: '24hour',
                message: 'From when to when it checks for transferring?',
                choices: ['24hour', '12hour', '9hour', '6hour', '3hour']
            },
            {
            type: 'checkbox',
            message: 'Select Buckets for Transfer',
            name: 'redisBuckets',
            pageSize:"100",
            choices: [
                new ask.Separator(' = Visitors = '),
                    {name:'all_visitor_buckets'},
                    {name:'onlineVisitorsList'},
                    {name:'pageViews'}, 
                    {name:'visitorsState'}, 
                new ask.Separator(' = Users = '),
                    {name:'all_user_buckets'},
                    {name:'onlineUsersList'},
                    {name:'totalUsersVerified'},
                    {name:'totalUsersList'}
            ],
            validate: answer=>answer.length<1 ?'You must choose at least one topping.':true
        }]
        ask.prompt(question).then(({intervalTime,redisBuckets})=>
            auto_bucket().start(redisBuckets,intervalTime)
        )
    }
    autoAll(){
        let question = [{
            type: 'list',
            name: 'intervalTime',
            default: '24hour',
            message: 'From when to when it checks for transferring?',
            choices: ['24hour', '12hour', '9hour', '6hour', '3hour']
        }]
        ask.prompt(question).then(({intervalTime})=> auto_all.start(intervalTime) )
    }
    manual(inter){
        let question = [
            {
            type: 'checkbox',
            message: 'Select Buckets for Transfer',
            name: 'redisBuckets',
            pageSize:"100",
            choices: [
                new ask.Separator(' = Visitors = '),
                    {name:'all_visitor_buckets'},
                    {name:'onlineVisitorsList'},
                    {name:'pageViews'}, 
                    {name:'visitorsState'}, 
                new ask.Separator(' = Users = '),
                    {name:'all_user_buckets'},
                    {name:'onlineUsersList'},
                    {name:'totalUsersVerified'},
                    {name:'totalUsersList'}
            ],
            validate: answer=>answer.length<1 ?'You must choose at least one topping.':true
        }]
        return ask.prompt(question).then(({redisBuckets})=>manualTransfer().start(redisBuckets,inter) )    
    }
    master(inter){
        let qa1Text = clc.bold.green('?') + clc.bold(' Which method would you prefer to transfer data? [ auto / manual ] ')
        let qa2Text = clc.bold.green('?') + clc.bold(' Which buckets would you prefer to transfer auto? [ all / custom ] ')
        const qa1 =()=>inter.question(qa1Text,answer=>{
            if( answer === "manual" || answer === "MANUAL" ) return this.manual(inter)
            if( answer === "auto" || answer === "auto" ) {
                return inter.question(qa2Text,answer=>{
                    if( answer === 'all' || answer === 'ALL' ) return this.autoAll()
                    if( answer === 'custom' || answer === 'custom' ) return this.autoBucket()
                    if( answer ) return console.log(`${answer} does not exist in choice list.`)
                })
            }
            if(!answer && transfer) return qa1()
        })

        return qa1()
    }
}

module.exports = StartComponent
