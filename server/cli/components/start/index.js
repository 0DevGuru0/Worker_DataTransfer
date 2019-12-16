const clc               = require('chalk'),
    auto_all          = require('./transfer/auto/all'),
    auto_bucket       = require('./transfer/auto/bucket'),
    manualTransfer    = require('./transfer/manual')
    ask               = require('../../../vendor/inquier');

const BaseUI = require('../../ui/base');
let transfer= null
class StartComponent extends BaseUI {

    start(str,rl){
        let container = _.map(str.trim().split(' '),elem=>elem.toLowerCase().trim())
        if( container[1] === '--help' ||container.length===1 ){
            this.horizontalLine(74)
            this.centered(clc.cyan.bold("Start"),83)
            this.horizontalLine(74)
        let desc = 
`    ${clc.bold.green('Usage')}:
        start [transfer|backup] [auto|manual] --[all|bucket]
    ${clc.bold.green('Description')}: 
        1/Transfer  : 
            transmit Redis last months Data to MongoDB 
            & Delete transmitted data from Redis
        2/BackUp    : 
            Store Redis data to Mongodb 
            & don\'t delete data from Redis`
            console.log(desc)
            return this.horizontalLine(74)
        }
        if(container[2] === "auto"){
            if(container[3].startsWith("--bucket")){ return this.autoBucket() }
             if(container[3] === "--all"){ return this.autoAll() }
        }
        if(container[2] === "manual"){
            return this.manual(rl)
        }
        if(container[1] === 'transfer' && container.length===2){
            transfer = 'master'
            return this.master(rl)
        }
        container.shift()
        return console.log(
            clc.bold.black.bgYellow('[ DataTransfer ]'),
            `'${container.join(" ")}' is not a correct command. See 'start --help'.`)
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
    master(rl){
        let question = [
            {
                type: 'list',
                name: 'transferMethod',
                message: 'Which method would you prefer to transfer data?',
                choices: ['auto','manual']
            },
            {
                type: 'list',
                name: 'transferBucket',
                message: 'Which buckets would you prefer to transfer auto?',
                choices: ['all','custom']
            }
        ]
        let callback = answers => {console.log(JSON.stringify(answers, null, '  '))}

        return ask.prompt(rl,question,callback)
        // let qa1Text = clc.bold.green('?') + clc.bold(' Which method would you prefer to transfer data? [ auto / manual ] ')
        // let qa2Text = clc.bold.green('?') + clc.bold(' Which buckets would you prefer to transfer auto? [ all / custom ] ')
        // const qa1 =()=>inter.question(qa1Text,answer=>{
        //     if( answer === "manual" || answer === "MANUAL" ) return this.manual(inter)
        //     if( answer === "auto" || answer === "auto" ) {
        //         return inter.question(qa2Text,answer=>{
        //             if( answer === 'all' || answer === 'ALL' ) return this.autoAll()
        //             if( answer === 'custom' || answer === 'custom' ) return this.autoBucket()
        //             if( answer ) return console.log(`${answer} does not exist in choice list.`)
        //         })
        //     }
        //     if(!answer && transfer) return qa1()
        // })

        // return qa1()
    }
}

module.exports = StartComponent
