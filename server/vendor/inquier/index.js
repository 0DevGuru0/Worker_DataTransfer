'use strict'
let inquirer = {
    Prompt : require('./ui/prompt'),
    Separator : require('./objects/separator')
};

inquirer.createPromptModule = (opt)=>{
    var promptModule =questions=>{
        var ui = new inquirer.Prompt(promptModule.prompts, opt);
        var promise = ui.run(questions);
        promise.ui = ui;
        return promise;
    };
    promptModule.prompts = {
        checkbox : require('./prompts/checkbox'),
        list : require('./prompts/list')
    }
    return promptModule;
}

/**
 * Public CLI helper interface
 * @param  {Array|Object|Rx.Observable} questions - Questions settings array
 * @param  {Function} cb - Callback being passed the user answers
 * @return {inquirer.ui.Prompt}
 */
inquirer.prompt = (p,Q,cb)=>{
    p.e.removeAllListeners()
    return inquirer.createPromptModule(p)(Q).then(cb).finally(_=>p.rl.prompt())
}
module.exports = inquirer;