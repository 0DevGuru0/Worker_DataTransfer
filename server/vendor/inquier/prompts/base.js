'use strict';
/**
 * Base prompt implementation
 * Should be extended by prompt types.
 */
let _ = require('lodash')
let col = require('chalk');
let runAsync = require('run-async');
let {mergeMap,share,take,filter,takeUntil,tap} = require('rxjs/operators')
let Choices = require('../objects/choices');
const cliCursor   = require('cli-cursor');

let ScreenManager = require('../utils/screen-manager');
class Prompt {
    // parent is the class of main readline Handler in cli/ui/interface.js file exist
    constructor(que,parent,ans){ 
        _.assign(this,{
            answer:ans,
            status: 'pending'
        });

        this.opt = _.defaults(_.clone(que),{
            validate:()=>true,
            filter: val=>val,
            when:()=>true,
            suffix:'',
            prefix:col.green('?')
        });

        if(!this.opt.name) this.throwParamError('name');
        if(!this.opt.message) this.opt.message = this.opt.name + ':';
        if(Array.isArray(this.opt.choices)) this.opt.choices = new Choices(this.opt.choices,ans)

        this.rl = parent.rl;
        this.parentInterface = parent
        this.screen = new ScreenManager(this.rl);
    }

    run(){
        return new Promise(res=>this._run(val=>res(val)))
    }
    _run(cb){
        cb()
    }

    throwParamError(name){
        throw new Error('You must provide a',name,'parameter')
    }

    close(){
        this.screen.releaseCursor()
    }

    onForceClose(){
        cliCursor.show();
        this.screen.done();
        this.rl.prompt('');
        this.close();
        this.parentInterface.eventListeners()
        // *NOTICE: 
        //   by specifying second argument make event to be headless response
        //   if no process exist to be stop
        this.parentInterface.e.emit('stop','hideResponse')
    }
    handleSubmitEvents(submit){
        let self = this;
        let asyncValidate   = runAsync(this.opt.validate);
        let asyncFilter     = runAsync(this.opt.filter);

        let validation = submit.pipe(
            mergeMap(value=>
                asyncFilter(value,self.answer).then(
                    filteredValue=>
                        asyncValidate(filteredValue,self.answer)
                            .then(isValid=>({isValid,value:filteredValue}))
                            .catch(err=>({isValid:err}))
                ).catch(err=>({isValid:err}))
            ),
            share()
        );

        let success = validation.pipe(
            filter(state=>state.isValid === true),
            take(1)
        );
        let error = validation.pipe(
            filter(state=>state.isValid !== true),
            takeUntil(success)
        );
        
        return {success,error}
    };

    getQuestion(){
        let message = this.opt.prefix 
            + ' ' 
            + col.bold(this.opt.message) 
            + this.opt.suffix
            + col.reset(' ');
        message += (this.opt.default !== null && this.state !== 'answered')
            ? this.opt.type 
                ? col.italic.dim('[hidden]') 
                : col.dim('('+this.opt.default+')')
            : '';
        return message;
    }
}
module.exports = Prompt;
