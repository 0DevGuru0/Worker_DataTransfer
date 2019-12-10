const readline        = require('readline');
    events            = require('events'),
    _                 = require('lodash'),
    clc               = require('chalk'),
    figlet            = require('figlet'),
    {Spinner}         = require('clui'),
    auto_all          = require('./auto/all'),
    auto_bucket       = require('./auto/bucket'),
    manualTransfer    = require('./manual')
    ask               = require('inquirer'),
    os                = require('os'),
    v8                = require('v8'),
    Q                 = require('q'),
    asyncRedis        = require('async-redis'),
    {Gauge,Progress}  = require('clui'),
    {MongoDB,RedisDB} = require('../index'),
    cliWidth          = require('cli-width'),
    ttys              = require('ttys');


let exitAllow = 0
let transfer= null


class _EventsEmitter extends events{}
class CliComponents {
    constructor(){
        this.width = cliWidth({ defaultWidth: 80, output: ttys.output })
        process.stdout.on('resize', () => {
            this.width = cliWidth({ defaultWidth: 80, output: ttys.output })
        });
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
// start transfer
class StartHandler {
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
// status
class StatusHandler extends CliComponents {
    constructor(props){
        super(props)
        this.list = {
            'System Platform':os.platform(),
            'Host Name':os.hostname(),
            'CPU architecture':os.arch(),
            'Load Average':os.loadavg().join(' '),
            'CPU Count':os.cpus().length,
            'Used Memory':this.memory(),
            'Current Malloced Memory':Math.ceil(v8.getHeapStatistics().malloced_memory / 1000000) + ' MB',
            'Peak Malloced Memory': Math.ceil(v8.getHeapStatistics().peak_malloced_memory / 1000000) + ' MB',
            'Used Malloced Memory':this.mallocedMemory(),
            'Used Heap Used (%)':this.heapSize(),
            'Available Heap Allocated (%)':this.availableHeap(),
            'Uptime':Math.round(os.uptime()/60)+' min'
        }  
    }
    mallocedMemory(){
        let {malloced_memory,peak_malloced_memory} = v8.getHeapStatistics()
        let used = peak_malloced_memory - malloced_memory;
        let human = Math.ceil(used / 1000000) + ' MB';
        return Gauge(malloced_memory, peak_malloced_memory, 20, peak_malloced_memory * 0.8, human)
    }
    availableHeap(){
        let {heap_size_limit,total_heap_size} = v8.getHeapStatistics()
        let percent = Math.round((total_heap_size / heap_size_limit)*100)
        return new Progress(20).update(percent,100)
    }
    heapSize(){
        let {used_heap_size,total_heap_size} = v8.getHeapStatistics()
        let used = total_heap_size - used_heap_size;
        let human = Math.ceil(used / 1000000) + ' MB';
        return Gauge(used_heap_size, total_heap_size, 20, total_heap_size * 0.8, human)
    }
    memory(){ 
        let total = os.totalmem(),
        free = os.freemem(),
        used = total - free,
        human = Math.ceil(used / 1000000) + ' MB';
        return Gauge(used, total, 20, total * 0.8, human)
    }
    statsUi(list,name){
        let lengths=[]
        let lines = []
        _.forIn(list,(value,key)=>{
            let line    = "☀️  "+clc.bold.yellow(key)+" "
            let padding = (this.width/4)*3 - line.length;
            for(let space=0; space<=padding; space++){ line +="-" }
            list.hasOwnProperty(key)
                ?   line += ' '+list[key]
                :   line += clc.red('Undefined Yet')
            lengths.push(padding.length)
            lines.push(line)
        })
        this.horizontalLine(this.width)
        this.centered(`🧭  ${name} 🧭`,this.width)
        this.horizontalLine(this.width)
        _.forEach(lines,el=>console.log(el))
        this.horizontalLine(this.width)
        this.verticalSpace()
    }
    systemStatus(inter){  
        this.statsUi(this.list,'Status')
        inter.prompt()
    }
    transferHandler(bucket){
        RedisDB().then(async redis=>{
            const client = asyncRedis.decorate(redis)
            bucket = bucket === 'all' ? ['auto','manual'] : [bucket]
            let redisBucket = await client.hmget('transferStatics',...bucket)
            _.forEach(redisBucket,val=>{
                val = JSON.parse(val)
                console.log(val)
            })
            await client.quit()
        })
    }
    transferStatus(inter){
        let question = [{
            type: 'list',
            name: 'methodSpec',
            default: 'all',
            message: 'Which method logs would you like to see??',
            choices: ['auto', 'manual', 'all']
        },{
            type: 'input',
            name: 'logsCount',
            default: 10 ,
            message: 'How many transferred logs log?',
        }]
        ask.prompt(question).then(({methodSpec,logsCount})=>{
            console.log({methodSpec,logsCount})
            this.transferHandler(methodSpec)
        })
    }
    async databaseData(){
       var deferred = Q.defer();   
       RedisDB().then(async redis=>{
        const client = asyncRedis.decorate(redis)
        let redisInfo = (await client.info()).toString()
        let regex2 = /'n(\w+|)/g
        let regex3 = /('"# \w+|#\s\w+|"')/g
        redisInfo = redisInfo
            .replace(regex3,'')
            .replace(regex2,'')
        let arr = redisInfo.split("\r\n")
        let Obj = {}
        _.forEach(arr,value=>{
            if(value.length>0){
                let smArr = value.split(":")
                isNaN(smArr[1])
                ? Obj[smArr[0]] = smArr[1]
                : Obj[smArr[0]] = +smArr[1]
            }
        })
        redisInfo = Obj
        MongoDB(redis).then(async ({redis,mongoose,stats})=>{
            let mongoDBInfo = stats
            await mongoose.disconnect()
            await redis.quit()
            console.log(
                chalk.black.bold.bgMagentaBright('[ Redis ]'),
                'connection closed successfully'
            ) 
            deferred.resolve({redisInfo,mongoDBInfo})
        })
       })
       return deferred.promise;
    }
    databaseStatus(inter){
       return this.databaseData().then(({redisInfo,mongoDBInfo})=>{
            this.statsUi(redisInfo,"REDIS")
            this.statsUi(mongoDBInfo,"MONGODB")
            inter.prompt()
        })
    }
    allStatus(inter){
        this.systemStatus(inter)
        this.transferStatus(inter)
        this.databaseStatus(inter)
    }
    master(inter){
        let question = [{
            type: 'list',
            name: 'statusSection',
            default: 'system',
            message: 'Which status would you like to see?',
            choices: ['system', 'database', 'transfer', 'all']
        }]
        ask.prompt(question).then(({statusSection})=>{
            switch (statusSection) {
                case 'system'   :return this.systemStatus(inter)
                case 'database' :return this.databaseStatus(inter)
                case 'transfer' :return this.transferStatus(inter)
                case 'all'      :return this.allStatus(inter)
                default: return this.allStatus(inter)
            }
        })
    }
};
class CliInterface extends CliComponents {
    constructor(props){
        super(props)
        this.e = new _EventsEmitter();
        this.startCL = new StartHandler();
        this.statusCl = new StatusHandler(); 
    }
    eventListeners(){
        this.e.on('start',  (str)=>this.start(str));
        this.e.on('status', ()=>this.status()); //
        this.e.on('log',    ()=>this.log()); // 
        this.e.on('test',   ()=>this.test()); // 
        this.e.on('health', ()=>this.healthCheck()); //
        this.e.on('setting',()=>this.setting()); //
        this.e.on('exit',   ()=>this.exit());
        this.e.on('stop',   ()=>this.stop());
        this.e.on('man',    ()=>this.man());
        this.e.on('help',   ()=>this.man());
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
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (str, key) =>{ if (!(key.ctrl && key.name === 'c')) exitAllow = 0 });
        this._interface.on("SIGINT",()=>process.emit("SIGINT"));
        process.on("SIGINT",()=>{
            if(exitAllow<1){
                console.log(clc.red.bold('\r\n(To exit, press ^C again or ^D or type .exit)'))
                this._interface.prompt()
                exitAllow++;
            }else{
                if(transfer){
                    transfer=null;
                    this._interface.write(null, { ctrl: false, name: 'return' });
                    this._interface.prompt()
                }else{
                    console.log('\r\n')
                    process.exit()
                }
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
        if( container[1] === '--help' ||container.length===1 ){
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
            if(container[3].startsWith("--bucket")){ return this.startCL.autoBucket() }
             if(container[3] === "--all"){ return this.startCL.autoAll() }
        }
        if(container[2] === "manual"){
            return this.startCL.manual(this._interface)
        }
        if(container[1] === 'transfer' && container.length===2){
            transfer = 'master'
            return this.startCL.master(this._interface)
        }
        container.shift()
        return console.log(
            clc.bold.black.bgYellow('[ DataTransfer ]'),
            `'${container.join(" ")}' is not a correct command. See 'start --help'.`)
    }
    stop(){
        let all = auto_all.initialize() 
        let bucket = auto_bucket().initialize()
        let Manual = manualTransfer().initialize()
        if(all||bucket||Manual){
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
                    if(Manual){
                        manualTransfer().stop().then(()=>{
                            stopping.stop()
                            process.stdout.write('\n');
                            console.log(clc.black.bold.bgGreen('Transfer Operation turned off.'))
                            this._interface.prompt()
                        })
                    }
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
        }else{ return console.log('no Operation or Interval has been set Yet') }
    }
    status(){
        return this.statusCl.master(this._interface)
    }
}
module.exports = ()=>{  
    figlet('Data Transfer', function(err, data) {
        console.log(data)
        const cli = new CliInterface();    
        cli.eventListeners()
        cli.init()
    });
}