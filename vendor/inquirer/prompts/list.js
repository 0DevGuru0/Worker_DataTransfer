"use-strict";

/**
 * `list` type prompt
 */

const _ = require("lodash");
const chalk = require("chalk");
const figures = require("figures");
const cliCursor = require("cli-cursor");
const runAsync = require("run-async");
const { mergeMap, map, take, takeUntil, tap } = require("rxjs/operators");

const Base = require("./base");
const observe = require("../utils/events");
const Paginator = require("../utils/paginator");

class ListPrompt extends Base {
  constructor(questions, parent, answers) {
    super(questions, parent, answers);
    this.rl = parent.rl;
    if (!this.opt.choices) {
      this.throwParamError("choices");
    }
    this.firstRender = true;
    this.selected = 0;

    let def = this.opt.default;

    // If def is a Number, then use as index. Otherwise, check for value.
    if (_.isNumber(def) && def >= 0 && def < this.opt.choices.realLength) {
      this.selected = def;
    } else if (!_.isNumber(def) && def != null) {
      let index = _.findIndex(
        this.opt.choices.realChoices,
        ({ value }) => value === def
      );
      this.selected = Math.max(index, 0);
    }

    // Make sure no default is set (so it won't be printed)
    this.opt.default = null;

    this.paginator = new Paginator(this.screen);
  }

  /**
   * Start the Inquiry session
   * @param  {Function} cb      Callback when prompt is done
   * @return {this}
   */

  _run(cb) {
    this.done = cb;
    let self = this;
    let events = observe(this.rl);
    events.normalizedUpKey
      .pipe(takeUntil(events.line))
      .forEach(this.onUpKey.bind(this));

    events.normalizedDownKey
      .pipe(takeUntil(events.line))
      .forEach(this.onDownKey.bind(this));

    events.numberKey
      .pipe(takeUntil(events.line))
      .forEach(this.onNumberKey.bind(this));

    events.line
      .pipe(
        take(1),
        takeUntil(
          events.exitKey.pipe(
            takeUntil(events.line),
            tap(this.onForceClose.bind(this))
          )
        ),
        map(this.getCurrentValue.bind(this)),
        mergeMap(value => runAsync(self.opt.filter)(value).catch(err => err))
      )
      .forEach(this.onSubmit.bind(this));
    // Init the prompt
    cliCursor.hide();
    this.render();

    return this;
  }

  /**
   * Render the prompt to screen
   * @return {ListPrompt} self
   */
  render() {
    // Render question
    let message = this.getQuestion();

    if (this.firstRender) {
      message += chalk.dim("[Use arrow keys]");
    }
    // Render choices or answer depending on the state
    if (this.status === "answered") {
      message += chalk.cyan(this.opt.choices.getChoice(this.selected).short);
    } else {
      // eslint-disable-next-line no-use-before-define
      let choicesStr = listRender(this.opt.choices, this.selected);
      let indexPosition = this.opt.choices.indexOf(
        this.opt.choices.getChoice(this.selected)
      );
      message += `\n${this.paginator.paginate(
        choicesStr,
        indexPosition,
        this.opt.pageSize
      )}`;
    }

    this.firstRender = false;
    this.screen.render(message);
  }

  /**
   * When user press `enter` key
   */

  onSubmit(value) {
    this.status = "answered";
    // Render prompt
    this.render();
    this.screen.done();
    cliCursor.show();
    this.done(value);
  }

  getCurrentValue() {
    return this.opt.choices.getChoice(this.selected).value;
  }

  /**
   * When user press a key
   */
  onUpKey() {
    let len = this.opt.choices.realLength;
    this.selected = this.selected > 0 ? this.selected - 1 : len - 1;
    this.render();
  }

  onDownKey() {
    let len = this.opt.choices.realLength;
    this.selected = this.selected < len - 1 ? this.selected + 1 : 0;
    this.render();
  }

  onNumberKey(input) {
    if (input <= this.opt.choices.realLength) {
      this.selected = input - 1;
    }

    this.render();
  }
}

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
function listRender(choices, pointer) {
  let output = "";
  let separatorOffset = 0;

  choices.choices.forEach((choice, i) => {
    if (choice.type === "separator") {
      separatorOffset += 1;
      output += `  ${choice}\n`;
      return;
    }

    if (choice.disabled) {
      separatorOffset += 1;
      output += `  - ${choice.name}`;
      output += ` (${
        _.isString(choice.disabled) ? choice.disabled : "Disabled"
      })`;
      output += "\n";
      return;
    }

    let isSelected = i - separatorOffset === pointer;
    let line = (isSelected ? `${figures.pointer} ` : "  ") + choice.name;
    if (isSelected) {
      line = chalk.cyan(line);
    }

    output += `${line} \n`;
  });

  return output.replace(/\n$/, "");
}

module.exports = ListPrompt;
