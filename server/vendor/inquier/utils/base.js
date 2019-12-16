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
class BaseUI {
    constructor(rl){
        this.rl = rl
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
        // unmute the mute-stream Package
        this.rl.output.unmute();
        // close prompt from each source
        if (this.activePrompt && typeof this.activePrompt.close === 'function') {
            this.activePrompt.close();
        }
    }
    onForceClose(){
        this.rl.removeListener('SIGINT',this.onForceClose)
        process.removeListener('exit',this.onForceClose);
        process.kill(process.pid,'SIGINT')
        this.rl.output.end()
        this.rl.pause();
        this.rl.close()
    }
}

module.exports =BaseUI;