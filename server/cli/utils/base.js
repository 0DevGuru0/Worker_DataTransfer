'use strict'
const readLine      = require('readline')
const _             = require('lodash')
const MuteStream    = require('mute-stream');
const observer = require('./events');
const {startWith,skip} = require('rxjs/operators')
const col = require('chalk')
/**
 * Base interface class other can inherits from
 */
let exitAllow = 0
class Base {
    constructor(opt){
        // if(!this.rl) this.rl = readLine.createInterface(setOptions(opt))
        this.rl.resume();
        var events = observer(this.rl);
        this.rl.on('SIGINT',()=>{
            if(exitAllow<1) console.log(col.red.bold('\r\n(To exit, press ^C again or ^D)'))
            exitAllow++
        });
        events.exitKey.pipe(
            skip(1)
        ).forEach(this.onForceClose.bind(this));
    }
    close(){
        this.rl.removeListener('SIGINT',this.onForceClose)
        process.removeListener('exit',this.onForceClose);

        // unmute the mute-stream Package
        this.rl.output.unmute();
        
        // close prompt from each source
        if (this.activePrompt && typeof this.activePrompt.close === 'function') {
            this.activePrompt.close();
        }

        //close the readLine
        this.rl.output.end()
        this.rl.pause();
        this.rl.close()
    }
    onForceClose(){
        this.close()
        process.kill(process.pid,'SIGINT')
    }
}

function setOptions(opt){
    opt = opt || {}
    let input = opt.input || process.stdin;
    let ms = new MuteStream();
    ms.pipe(opt.output || process.stdout);
    let output = ms;    
    return _.assignIn({ terminal:true, input, output },_.omit(opt,['input','output']))
}

module.exports =Base;