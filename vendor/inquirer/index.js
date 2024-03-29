"use-strict";

let inquirer = {
  Prompt: require("./ui/prompt"),
  Separator: require("./objects/separator")
};

inquirer.createPromptModule = opt => {
  let promptModule = questions => {
    let ui = new inquirer.Prompt(promptModule.prompts, opt);
    let promise = ui.run(questions);
    promise.ui = ui;
    return promise;
  };
  promptModule.prompts = {
    checkbox: require("./prompts/checkbox"),
    list: require("./prompts/list"),
    input: require("./prompts/input")
  };
  return promptModule;
};
inquirer.promptParent = null;
/**
 * Public CLI helper interface
 * @param  {Array|Object|Rx.Observable} questions - Questions settings array
 * @param  {Function} cb - Callback being passed the user answers
 * @return {inquirer.ui.Prompt}
 */
inquirer.prompt = (Q, cb) => {
  inquirer.promptParent.e.removeAllListeners();
  return inquirer
    .createPromptModule(inquirer.promptParent)(Q)
    .then(ans => {
      inquirer.promptParent.eventListeners();
      return ans;
    })
    .then(cb)
    .finally(_ => inquirer.promptParent.rl.prompt());
};
module.exports = inquirer;
