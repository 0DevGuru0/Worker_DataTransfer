'use strict'

const _                                = require('lodash'),
    {defer,EMPTY,from,of}              = require('rxjs'),
    { concatMap,filter,publish,reduce,refCount,finalize} = require('rxjs/operators'),
    runAsync                           = require('run-async'),
    utils                              = require('../utils/utils'),
    Base                               = require('../utils/base');

class PromptUI extends Base {
    constructor(prompts,opt){
        super(opt);
        this.prompts = prompts
    }
    run(questions){
        this.answers = {};
        if(_.isPlainObject(questions))  questions = [questions];
        questions = _.isArray(questions) ? from(questions) : questions;
        this.process = questions.pipe(
            concatMap(this.processQuestion.bind(this)),
            publish(), // Creates a hot Observable. It prevents duplicating prompts.
            refCount()
        )
        return this.process.pipe(
            reduce((acc,answer)=>{
                _.set(this.answers,answer.name,answer.answer);
                return this.answers
            },{})
        )
        .toPromise()
        .then(this.onCompletion.bind(this))
    }

    /* Once all prompt are over */
    onCompletion(){
        this.close();
        /* when prompt achieved use this.answer to other work */
        return this.answers;
    }
    processQuestion(question){
        question = _.clone(question);
        return defer(()=>of(question).pipe(
            concatMap(this.setDefaultType.bind(this)),
            concatMap(this.filterIfRunnable.bind(this)),
            concatMap(()=>
                utils.fetchAsyncQuestionProperty(question,'message',this.answers)
            ),
            concatMap(()=>
                utils.fetchAsyncQuestionProperty(question,'default',this.answers)
            ),
            concatMap(()=>
                utils.fetchAsyncQuestionProperty(question,'choices',this.answers)
            ),
            concatMap(this.fetchAnswer.bind(this))
        ))
    }        
    setDefaultType(question){
        if(!this.prompts[question.type]) question.type = 'input';
        return defer(()=>of(question));
    }
    filterIfRunnable(question){
        if(question.when === false) return EMPTY;
        if(!_.isFunction(question.when)) return of(question);
        let answers = this.answers;
        return defer(()=>from(runAsync(question.when)(answers).then(shouldRun=>{
            if(shouldRun) return question;
        }))).pipe(filter(val=>val !== null))
    }
    fetchAnswer(question){
        let Prompt = this.prompts[question.type];
        this.activePrompt = new Prompt(question,this.rl,this.answers);
        return defer(()=>from(
            this.activePrompt.run().then(answer=>({name:question.name,answer}))
        ))
    }
}


module.exports = PromptUI;