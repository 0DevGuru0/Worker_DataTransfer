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
const ScreenManage = require('../utils/screenManage')
const BaseUI = require('./base')
const StartComponent = require('../components/start')
const StatusHandler = require('../components/status')
let exitAllow = 0

class _EventsEmitter extends events{}

class CliInterface extends BaseUI {
    constructor(props){
        super(props)
        this.e        = new _EventsEmitter();
        this.startCL  = new StartComponent();
        this.statusCl = new StatusHandler(); 
    }
    eventListeners(){
        this.e.on('start',  (str)=>this.startCL.start(str,this.rl));
        this.e.on('status', ()=>this.statusCl.master(this.rl));
        this.e.on('log',    ()=>this.log()); 
        this.e.on('test',   ()=>this.test()); 
        this.e.on('health', ()=>this.healthCheck());
        this.e.on('setting',()=>this.setting());
        this.e.on('exit',   ()=>this.exit());
        this.e.on('stop',   ()=>this.stop());
        this.e.on('man',    ()=>this.man());
        this.e.on('help',   ()=>this.man());
        this.e.on('clear',  ()=>this.clear());
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
        // readline.emitKeypressEvents(process.stdin);
        // process.stdin.setRawMode(true);
        // process.stdin.on('keypress', (str, key) =>{ if (!(key.ctrl && key.name === 'c')) exitAllow = 0 });
        // this.rl.on("SIGINT",()=>process.emit("SIGINT"));
        // process.on("SIGINT",()=>{
        //     if(exitAllow<1){
        //         console.log(clc.red.bold('\r\n(To exit, press ^C again or ^D or type .exit)'))
        //         this.rl.prompt()
        //         exitAllow++;
        //     }else{
        //         if(transfer){
        //             transfer=null;
        //             this.rl.write(null, { ctrl: false, name: 'return' });
        //             this.rl.prompt()
        //         }else{
        //             console.log('\r\n')
        //             process.exit()
        //         }
        //     }
        // })
        this.rl.prompt()
        this.rl.on("line",str=>{
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