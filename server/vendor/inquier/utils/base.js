'use strict'
/**
 * Base interface class other can inherits from
 */
class BaseUI {
    constructor(rl){
        this.rl = rl
        this.rl.resume();
    }
    close(){
        this.rl.removeListener('SIGINT', this.close);
        process.removeListener('exit', this.close);
        // unmute the mute-stream Package
        this.rl.output.unmute();
        // close prompt from each source
        if (this.activePrompt && typeof this.activePrompt.close === 'function') {
            this.activePrompt.close();
        }

    }

}

module.exports =BaseUI;