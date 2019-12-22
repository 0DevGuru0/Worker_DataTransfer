'use strict';
/*
 * `list` type prompt
 */
const _             = require('lodash'),
    col             = require('chalk'),
    cliCursor       = require('cli-cursor'),
    fig             = require('figures'),
    {race}      = require('rxjs'),
    {map,takeUntil,tap} = require('rxjs/operators'),
    Base            = require('./base'),
    observe         = require('../utils/events'),
    Paginator       = require('../utils/paginator');

class CheckBoxPrompt extends Base { 
    constructor(que,rl,ans){
        super(que,rl,ans);
        if(!this.opt.choices) this.throwParamError('choices');

        if(_.isArray(this.opt.default)){
            this.opt.choices.forEach(choice=>{
                if(this.opt.default.indexOf(choice.value)>=0) choice.checked = true;
            },this)
        };

        this.pointer = 0;
        this.opt.default = null
        this.paginator = new Paginator(this.screen);
    }
    _run(cb){
        this.done = cb;
        let events = observe(this.rl);

        let validation = this.handleSubmitEvents(
            events.line.pipe( 
                map(this.getCurrentValue.bind(this)),
                takeUntil(
                    events.exitKey.pipe( 
                        takeUntil(events.line),
                        tap(this.onForceClose.bind(this)) 
                    )
                )
            )
        );
        validation.success.forEach(this.onEnd.bind(this))
        validation.error.forEach(this.onError.bind(this))
        
        events.normalizedUpKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onUpKey.bind(this));
        
        events.normalizedDownKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onDownKey.bind(this));

        events.numberKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onNumberKey.bind(this));

        events.spaceKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onSpaceKey.bind(this));
            
        events.aKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onAllKey.bind(this));
        events.iKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onInverseKey.bind(this));

        cliCursor.hide();
        this.render();
        this.firstRender = false;
        return this;
    }
    
    render(error){
        let message = this.getQuestion();
        let bottomContent = '';
        if(!this.spaceKeyPressed){
            message += '\n'+'[Press ' 
                + col.cyan.bold('<space>')
                + ' to select, '
                + col.cyan.bold('<a>')
                + ' to toggle all, '
                + col.cyan.bold('<i>')
                + ' to invert selection]';
        }
        if(this.status === 'answered'){
            message += col.cyan(this.selection.join(', '))
        }else{
            let choicesStr = renderChoices(this.opt.choices,this.pointer)
            let indexPosition = this.opt.choices.indexOf(this.opt.choices.getChoice(this.pointer))
            message += '\n' + this.paginator.paginate(choicesStr,indexPosition,this.opt.pageSize)
        }

        if(error) bottomContent = col.red('>> ') + error;

        this.screen.render(message,bottomContent)
    }
    onEnd(state){
       this.status = 'answered';
       this.spaceKeyPressed = true;
       this.render();
       this.screen.done();
       this.done(state.value);
    }
    onError(state){
        this.render(state.isValid);
    }
    getCurrentValue(){
      let choices    = this.opt.choices.filter(choice=>Boolean(choice.checked)&&!choice.disabled);
      this.selection = _.map(choices,'short'); // display after selection
      return _.map(choices,'value');
    }
    onUpKey(){
        let len = this.opt.choices.realLength;
        this.pointer = this.pointer > 0 ? this.pointer -1 : len -1 ;
        this.render();
    }
    onDownKey(){
        let len =  this.opt.choices.realLength;
        this.pointer = this.pointer < len - 1 ? this.pointer + 1 : 0;
        this.render()
    }
    onNumberKey(input){
        if(input <= this.opt.choices.realLength){
            this.pointer = input -1 ;
            this.toggleChoice(this.pointer);
        }
        this.render()
    }
    onSpaceKey(){
        this.spaceKeyPressed = true;
        this.toggleChoice(this.pointer)
        this.render()
    }
    onAllKey(){
        let shouldBeChecked = Boolean(
            this.opt.choices.find(choice=>choice.type !== 'separator' && !choice.checked)
        )
        this.opt.choices.choices.forEach(choice=>{ if(choice.type !== 'separator') choice.checked = shouldBeChecked })
        this.render()
    }
    onInverseKey(){
        this.opt.choices.choices.forEach(choice=>{ if(choice.type !== 'separator') choice.checked = !choice.checked })
        this.render()
    }
    toggleChoice(index){
        let item = this.opt.choices.getChoice(index);
        if(item !== undefined) item.checked = !item.checked;
    }
}

/**
 * Function for rendering checkbox choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
function renderChoices(choices,pointer){
    let output = '';
    let separatorOffset = 0;
    choices.choices.forEach((choice,i)=>{
        if(choice.type === 'separator'){
            separatorOffset++;
            output +=' ' + choice + '\n'
            return;
        }
        if(choice.disabled){
            separatorOffset++;
            output += '- ' + choice.name;
            output += '( '+( _.isString(choice.disabled)?choice.disabled:'Disabled' )+' )';
        }else{
            let line = getCheckbox(choice.checked,choice);
            output += i-separatorOffset === pointer 
                ? col.cyan(fig.pointer+line)
                :' ' + line ; 
        }
        output += '\n'
    })
    return output.replace(/\n$/,'');
}

/**
 * Get the checkbox
 * @param  {Boolean} checked - add a X or not to the checkbox
 * @return {String} Composited checkbox string
 */

function getCheckbox(checked,choice){
    return checked 
        ? col.green(fig.radioOn) + ' ' + col.bgGreen.black(choice.name) 
        : fig.radioOff + ' ' + choice.name ; 
}

module.exports = CheckBoxPrompt;