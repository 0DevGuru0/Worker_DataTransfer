const readline = require('readline');
const events = require('events');
const _ = require('lodash');
const clc = require('chalk');
const figlet = require('figlet');
const {Spinner} = require('clui');
const auto_all = require('./auto/all')
const auto_bucket = require('./auto/bucket')
const ask = require('inquirer');
class _EventsEmitter extends events{}
class CliComponents {
    constructor(){
        this.width = process.stdout.columns
    }
    centered(str,width=this.width){
        if(width>this.width) width=this.width + 15
        let leftPadding = Math.floor(( width - str.length)/2)
        let line="";
        for(let i=0;i<leftPadding;i++){ line+=" " }
        line+=str
        console.log(line)
    }
    horizontalLine(width=this.width){
        if(width>this.width) width=this.width 
        let line="";
        for(let i=0;i<width;i++){ line+=clc.bold("-") }
        console.log(line)
    }
    verticalSpace(){
        console.log('\n')
    }
}
// start transfer auto --bucket
class StartHandler {
    autoBucket(inter){
        let question = [
            {
                type: 'list',
                name: 'intervalTime',
                default: 24,
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
                    {name:'all_visitors_bucket'},
                    {name:'onlineVisitorsList'},
                    {name:'pageViews'}, 
                    {name:'visitorsState'}, 
                new ask.Separator(' = Users = '),
                    {name:'all_users_bucket'},
                    {name:'onlineUsersList'},
                    {name:'totalUsersVerified'},
                    {name:'totalUsersList'}
            ],
            validate: answer=>answer.length<1 ?'You must choose at least one topping.':true
        }]
        ask.prompt(question).then(({intervalTime,redisBuckets})=>{ 
            console.log('sajjad:::::',redisBuckets,intervalTime)
            auto_bucket().start(redisBuckets,intervalTime)
            inter.prompt()
        })
    }
}
class CliInterface extends CliComponents {
    constructor(props){
        super(props)
        this.e = new _EventsEmitter();
        this.startCL = new StartHandler()
    }
    eventListeners(){
        this.e.on('man',    ()=>this.man());
        this.e.on('help',   ()=>this.man());
        this.e.on('status', ()=>this.man());
        this.e.on('start',  (str)=>this.start(str));
        this.e.on('log',    ()=>this.log());
        this.e.on('test',   ()=>this.test());
        this.e.on('health', ()=>this.healthCheck());
        this.e.on('setting',()=>this.setting());
        this.e.on('exit',   ()=>this.exit());
        this.e.on('stop',   ()=>this.stop());
        this.e.on('clear',   ()=>this.clear());
        this.possibleCommands = this.e.eventNames()
    }
    init(){
        let commands = this.possibleCommands
         this._interface = readline.createInterface({
            input:process.stdin,
            output:process.stdout,
            prompt:">>",
            completer:line=>{
                let hits = commands.filter(c=> c.startsWith(line))
                return [hits.length ? hits : commands, line];
            }  
        })
        this._interface.prompt()
        this._interface.on("line",str=>{
            let misType = []
            str = typeof(str) == 'string' && str.trim().length > 0 ?str.trim().toLowerCase() : false;
            let result = commands.some(el=>{
                let regex = new RegExp('\\b'+el+'\\b',"g")
                if(!str){ return false }
                if(str.match(regex)){
                    str.split(' ')[0] !== el
                        ?misType.push('misType',el , str)
                        :this.e.emit(el,str)
                    return true
                }
                if(el.indexOf(str)>-1 || str.startsWith(el)){
                    misType.push('misType',el , str)
                    return true
                }
            })
            if(misType[0]==='misType'){
                this._interface.question(`Did you mean? ${misType[1]} Type::[Y]Yes/[N]No >>`,answer=>{
                    if(answer === "Y"
                        || answer === "y" 
                        || answer === "yes" 
                        || answer === "Yes" 
                        || answer === "YES") this.e.emit(misType[1],misType[2])
                    this._interface.prompt()
                })
            }
            if(!result) console.log('Sorry, try again'); 
            this._interface.prompt()
        })
        this._interface.on("close",()=>{ 
            console.log("\n")
            process.exit("0") 
        })
    }
    man(){
        let commands = {
            "man"           :   "Show help Page",
            "help"          :   "Alias for 'man' command",
            "status"        :   "Get statistics on the underlying operating system",
            "start"         :   "Start Manually Transferring functions",
            "log"           :   "Report underlying transferring",
            "test"          :   "Start testing engine for system",
            "health"        :   "check Databases reliability",
            "setting"       :   "General settings of operating system",
            "exit"          :   "Kill the CLI (and the rest of the application)",
            "stop"          :   "Stop Interval from automation transfer"
        }
        
        let lengths=[]
        let lines = []
        _.forEach(this.possibleCommands,elem=>{
            let line    = "☀️  "+clc.bold.yellow(elem)+" "
            let padding = 40 - line.length;
            for(let space=0; space<=padding; space++){ line +="-" }
            commands.hasOwnProperty(elem)
                ?   line += ' '+commands[elem]
                :   line += clc.red('Undefined Yet')
            lengths.push(padding.length)
            lines.push(line)
        })
        //TODO: not measure properly
        let biggestLength = lengths.sort((a,b)=>b-a)[0]
        this.horizontalLine(74)
        this.centered("🧭  CLI Manual 🧭",70)
        this.horizontalLine(74)
        _.forEach(lines,el=>console.log(el))
        this.horizontalLine(74)
        this.verticalSpace()
    }
    onForceClose() {
        this.exit();
        process.kill(process.pid, 'SIGINT');
    }
    clear(){
        console.clear()
    }
    exit(){
        console.log(clc.bgCyan.bold.black('Have Fun...'),'❤️ ❤️ ❤️')
        this._interface.removeListener('SIGINT', this.onForceClose);
        process.removeListener('exit', this.onForceClose);
        this._interface.pause();
        this._interface.close();
       process.exit(0)
    }
    start(str){
        let container = _.map(str.trim().split(' '),elem=>elem.toLowerCase().trim())
        if( container[1] !== 'transfer' || container.length <= 3 ){
            this.horizontalLine(74)
            this.centered(clc.cyan.bold("Start"),83)
            this.horizontalLine(74)
        let desc = 
`    ${clc.bold.green('Usage')}:
        start [transfer|backup] [auto|visitors|users] --[all|bucket]
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
            if(container[3].startsWith("--bucket")){
                return this.startCL.autoBucket(this._interface)
             }
             if(container[3] === "--all"){
                return auto_all.start()
             }
        }

        if(container[2] === "visitors" || container[2] === "users"){
            if(container[3].startsWith("--bucket")){
               return console.log('6')
            }
            if(container[3] === "--all"){
               return console.log('7')
            }
        }
        return console.log('show Manual')
    }
    stop(){
        let all = auto_all.initialize() 
        let bucket = auto_bucket().initialize()
        if(all||bucket){
            let question= clc.green("? ")+
                clc.bold.white('Do yo really want to stop operation?')+
                clc.gray(" [y/n] ");
            let answer = answer=>{
                if(answer === "Y" || answer === "y" 
                || answer === "yes" || answer === "Yes" || answer === "YES"){
                    let stopping = new Spinner(
                        'Stopping the Transfer Operation...', 
                        ['⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷']
                    );
                    stopping.start()
                    
                    if(all){
                        
                        auto_all.stop().then(()=>{
                            stopping.stop()
                            process.stdout.write('\n');
                            console.log(clc.black.bold.bgGreen('AutoMatic Transfer turned off.'))
                            this._interface.prompt()
                        })
                    }
                    if(bucket){
                        auto_bucket().stop().then(()=>{
                            stopping.stop()
                            process.stdout.write('\n');
                            console.log(clc.black.bold.bgGreen('AutoMatic Transfer turned off.'))
                            this._interface.prompt()
                        })
                    }
                }
            }
            this._interface.question(question,answer)
        }else{ return console.log('no Interval has been set Yet') }
    }

}
module.exports = ()=>{
    
    figlet('Data Transfer', function(err, data) {
        if (err) {
            console.log('Something went wrong...');
            console.dir(err);
            return;
        }
        console.log(data)
        const cli = new CliInterface();    
        cli.eventListeners()
        cli.init()
    });
}