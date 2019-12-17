const readline        = require('readline');
    events            = require('events'),
    _                 = require('lodash'),
    clc               = require('chalk'),
    {Spinner}         = require('clui'),
    auto_all          = require('../components/start/transfer/auto/all'),
    auto_bucket       = require('../components/start/transfer/auto/bucket'),
    manualTransfer    = require('../components/start/transfer/manual')
    ask               = require('../../vendor/inquier'),
    os                = require('os'),
    v8                = require('v8'),
    Q                 = require('q'),
    asyncRedis        = require('async-redis'),
    {Gauge,Progress}  = require('clui'),
    {MongoDB,RedisDB} = require('../../index'),
    cliWidth          = require('cli-width'),
    ttys              = require('ttys');
const MuteStream    = require('mute-stream');
const BaseUI = require('./base')
const StartComponent = require('../components/start')
const StatusHandler = require('../components/status')
const ManPage = require('./man')

class _EventsEmitter extends events{}

class CliInterface extends BaseUI {
    constructor(props){
        super(props)
        this.exitAllow = 0
        this.e        = new _EventsEmitter();
        this.startCL  = new StartComponent();
        this.statusCl = new StatusHandler(); 
        this.manCL    = new ManPage();
    }
    eventListeners(){
        this.e.on('start',  str=>this.startCL.start(str,this.rl))
        this.e.on('status', ()=>this.statusCl.master(this.rl));
        this.e.on('log',    ()=>this.log()); 
        this.e.on('test',   ()=>this.test()); 
        this.e.on('health', ()=>this.healthCheck());
        this.e.on('setting',()=>this.setting());
        this.e.on('exit',   ()=>this.exit());
        this.e.on('stop',   ()=>this.stop());
        this.e.on('man',    ()=>this.manCL.run(this.possibleCommands));
        this.e.on('help',   ()=>this.man());
        this.e.on('clear',  ()=>console.clear());
        this.possibleCommands = this.e.eventNames()
    }
    init(){
        let commands = this.possibleCommands
        let ms = new MuteStream();
        ms.pipe(process.stdout);
        let output = ms;  
         this.rl = readline.createInterface({
            input:process.stdin,
            output,
            prompt:">>",
            completer:line=>{
                let hits = commands.filter(c=> c.startsWith(line))
                return [hits.length ? hits : commands, line];
            }  
        })

        this.rl.on('SIGINT',()=>{
            if(this.exitAllow<1){
                console.log(clc.red.bold('\r\n(To exit, press ^C again or ^D)')) 
                this.rl.prompt()
            }else{ this.onForceClose() }
            this.exitAllow++
        });

        this.rl.prompt()
        this.rl.on("line",str=>{
            if(this.exitAllow===1) this.exitAllow = 0;
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
                this.rl.question(`Did you mean? ${misType[1]} Type::[Y]Yes/[N]No >>`,answer=>{
                    if(answer === "Y"
                        || answer === "y" 
                        || answer === "yes" 
                        || answer === "Yes" 
                        || answer === "YES") this.e.emit(misType[1],misType[2])
                    this.rl.prompt()
                })
            }
            if(!result) console.log('Sorry, try again'); 
            this.rl.prompt()
        })
    }
    onForceClose() {
        this.exit();
        process.kill(process.pid, 'SIGINT');
    }
    exit(){
        this.exitAllow = 0;
        console.log(clc.bgCyan.bold.white('\r\n  Have Fun...  '),'❤️ ❤️ ❤️')
        this.rl.removeListener('SIGINT', this.onForceClose);
        process.removeListener('exit', this.onForceClose);
        this.rl.pause();
        this.rl.close();
       process.exit(0)
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
                            this.rl.prompt()
                        })
                    }
                    if(all){
                        auto_all.stop().then(()=>{
                            stopping.stop()
                            process.stdout.write('\n');
                            console.log(clc.black.bold.bgGreen('AutoMatic Transfer turned off.'))
                            this.rl.prompt()
                        })
                    }
                    if(bucket){
                        auto_bucket().stop().then(()=>{
                            stopping.stop()
                            process.stdout.write('\n');
                            console.log(clc.black.bold.bgGreen('AutoMatic Transfer turned off.'))
                            this.rl.prompt()
                        })
                    }
                }
            }
            this.rl.question(question,answer)
        }else{ return console.log('no Operation or Interval has been set Yet') }
    }
}
module.exports = CliInterface;